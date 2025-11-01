import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { withClubStaffAuth, AuthenticatedRequest } from '@/middleware/auth-enhanced';
import { ApiError, validateRequiredFields } from '@/lib/api-error';
import { memberCache, cacheKeys } from '@/lib/cache';
/**
 * POST /api/admin/passes/cancel
 * Cancel an active pass
 * 
 * Required: Club staff or admin role
 * Rate limited: Standard (100 req/15min)
 * 
 * Body: {
 *   passId: string,
 *   reason: string
 * }
 */
export async function POST(request: NextRequest) {
  return withClubStaffAuth(request, async (_req: AuthenticatedRequest) => {
    const { user } = _req;
    // Parse and validate request body
    const body = await _req.json();
    const { passId, reason } = body;
    // Validate required fields
    validateRequiredFields(body, ['passId', 'reason']);
    const db = getAdminFirestore();
    let memberId: string | undefined;
    try {
      // Run transaction to ensure atomicity
      const result = await db.runTransaction(async (transaction) => {
        // 1. Get the pass
        const passRef = db.collection('member_passes').doc(passId);
        const passSnap = await transaction.get(passRef);
        if (!passSnap.exists) {
          throw ApiError.notFound('Pass not found');
        }
        const passData = passSnap.data()!;
        // Check if already cancelled/expired
        if (passData.status === 'cancelled' || passData.status === 'expired') {
          throw ApiError.conflict(`Pass already ${passData.status}`);
        }
        // Check club permission for staff (non-admin)
        if (user!.role !== 'SUPER_ADMIN' && user!.role !== 'FEDERATION_ADMIN') {
          const userClubId = user!.clubId;
          const passClubId = passData.clubId;
          if (!userClubId || userClubId !== passClubId) {
            throw ApiError.forbidden('Cannot cancel pass for different club');
          }
        }
        const now = new Date();
        // 2. Update pass status
        transaction.update(passRef, {
          status: 'cancelled',
          cancelledAt: now.toISOString(),
          cancelledBy: user!.uid,
          cancellationReason: reason,
          updatedAt: now.toISOString()
        });
        // 3. Clear member's activePassId if this was the active pass
        const memberRef = db.collection('members').doc(passData.memberId);
        const memberSnap = await transaction.get(memberRef);
        if (memberSnap.exists) {
          const memberData = memberSnap.data()!;
          if (memberData?.activePassId === passId) {
            transaction.update(memberRef, {
              activePassId: null,
              updatedAt: now.toISOString()
            });
          }
        }
        // 4. Create audit log
        const auditRef = db.collection('audit_logs').doc();
        transaction.set(auditRef, {
          id: auditRef.id,
          action: 'CANCEL_PASS',
          performedBy: user!.uid,
          performedByRole: user!.role,
          targetType: 'member_passes',
          targetId: passId,
          metadata: {
            memberId: passData.memberId,
            memberName: passData.memberName,
            reason
          },
          timestamp: now.toISOString()
        });
        // Return values needed outside transaction
        return {
          memberId: passData.memberId
        };
      });
      // Extract returned values
      memberId = result.memberId;
      // Clear cache for member
      if (memberId) {
        memberCache.delete(cacheKeys.member(memberId));
      }
      return NextResponse.json({
        success: true,
        message: 'Pass cancelled successfully',
        passId
      });
    } catch (error: unknown) {
      // Re-throw ApiError instances to be handled by middleware
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Failed to cancel pass', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

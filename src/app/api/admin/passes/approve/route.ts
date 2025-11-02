import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { withClubStaffAuth, AuthenticatedRequest } from '@/middleware/auth-enhanced';
import { ApiError, validateRequiredFields } from '@/lib/api-error';
import { memberCache, cacheKeys } from '@/lib/cache';
/**
 * POST /api/admin/passes/approve
 * Approve a pass request
 * 
 * Required: Club staff or admin role
 * Rate limited: Standard (100 req/15min)
 * 
 * Body: {
 *   requestId: string
 * }
 */
export async function POST(request: NextRequest) {
  return withClubStaffAuth(request, async (_req: AuthenticatedRequest) => {
    const { user } = _req;
    // Parse and validate request body
    const body = await _req.json();
    const { requestId } = body;
    // Validate required fields
    validateRequiredFields(body, ['requestId']);
    const db = getAdminFirestore();
    let createdPassId: string | undefined;
    let memberId: string | undefined;
    try {
      // Run transaction to ensure atomicity
      const result = await db.runTransaction(async (transaction) => {
        // 1. Get the pass request
        const requestRef = db.collection('pass_requests').doc(requestId);
        const requestSnap = await transaction.get(requestRef);
        if (!requestSnap.exists) {
          throw ApiError.notFound('Pass request not found');
        }
        const requestData = requestSnap.data()!;
        // Check if already processed
        if (requestData.status !== 'pending') {
          throw ApiError.conflict(`Request already ${requestData.status}`);
        }
        // Check club permission for staff (non-admin)
        if (user!.role !== 'SUPER_ADMIN' && user!.role !== 'FEDERATION_ADMIN') {
          const userClubId = user!.clubId;
          const requestClubId = requestData.clubId;
          if (!userClubId || userClubId !== requestClubId) {
            throw ApiError.forbidden('Cannot approve request for different club');
          }
        }
        // 2. Get template details
        const templateRef = db.collection('pass_templates').doc(requestData.templateId);
        const templateSnap = await transaction.get(templateRef);
        if (!templateSnap.exists) {
          throw ApiError.notFound('Pass template not found');
        }
        const templateData = templateSnap.data()!;
        // 3. Calculate pass dates
        const now = new Date();
        const startDate = requestData.requestedStartDate || now.toISOString();
        let endDate: string;
        // Calculate end date based on template type
        if (templateData.type === 'monthly') {
          const end = new Date(startDate);
          end.setMonth(end.getMonth() + 1);
          endDate = end.toISOString();
        } else if (templateData.type === 'quarterly') {
          const end = new Date(startDate);
          end.setMonth(end.getMonth() + 3);
          endDate = end.toISOString();
        } else if (templateData.type === 'yearly') {
          const end = new Date(startDate);
          end.setFullYear(end.getFullYear() + 1);
          endDate = end.toISOString();
        } else if (templateData.duration) {
          const end = new Date(startDate);
          end.setDate(end.getDate() + templateData.duration);
          endDate = end.toISOString();
        } else {
          // Default to 30 days
          const end = new Date(startDate);
          end.setDate(end.getDate() + 30);
          endDate = end.toISOString();
        }
        // 4. Create new pass
        const passRef = db.collection('member_passes').doc();
        const passData = {
          id: passRef.id,
          templateId: requestData.templateId,
          templateName: requestData.templateName,
          memberId: requestData.memberId,
          memberName: requestData.memberName,
          clubId: requestData.clubId,
          // Pass info
          type: templateData.type,
          startDate,
          endDate,
          remainingSessions: templateData.type === 'session-based' ? 
            (templateData.sessionCount || 10) : undefined,
          // Payment info
          price: templateData.price || 0,
          paymentStatus: 'pending', // Will be updated when payment is confirmed
          paymentMethod: requestData.paymentMethod,
          // Status
          status: 'active',
          // Usage
          usageCount: 0,
          // Metadata
          createdAt: now.toISOString(),
          approvedBy: user!.uid,
          approvedAt: now.toISOString()
        };
        transaction.set(passRef, passData);
        // 5. Update member's activePassId
        const memberRef = db.collection('members').doc(requestData.memberId);
        transaction.update(memberRef, {
          activePassId: passRef.id,
          updatedAt: now.toISOString()
        });
        // 6. If renewal, expire old pass
        if (requestData.type === 'renewal' && requestData.currentPassId) {
          const oldPassRef = db.collection('member_passes').doc(requestData.currentPassId);
          transaction.update(oldPassRef, {
            status: 'expired',
            expiredAt: now.toISOString()
          });
        }
        // 7. Update request status
        transaction.update(requestRef, {
          status: 'approved',
          processedAt: now.toISOString(),
          processedBy: user!.uid,
          createdPassId: passRef.id
        });
        // 8. Create audit log
        const auditRef = db.collection('audit_logs').doc();
        transaction.set(auditRef, {
          id: auditRef.id,
          action: 'APPROVE_PASS_REQUEST',
          performedBy: user!.uid,
          performedByRole: user!.role,
          targetType: 'pass_requests',
          targetId: requestId,
          metadata: {
            requestData,
            passId: passRef.id,
            memberId: requestData.memberId
          },
          timestamp: now.toISOString()
        });
        // Return values needed outside transaction
        return {
          passId: passRef.id,
          memberId: requestData.memberId
        };
      });
      // Extract returned values
      createdPassId = result.passId;
      memberId = result.memberId;
      // Clear cache for member
      if (memberId) {
        memberCache.delete(cacheKeys.member(memberId));
      }
      return NextResponse.json({
        success: true,
        message: 'Pass request approved successfully',
        requestId,
        passId: createdPassId
      });
    } catch (error: unknown) {
      // Re-throw ApiError instances to be handled by middleware
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Failed to approve pass request', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

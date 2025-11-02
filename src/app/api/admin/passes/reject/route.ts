import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { withClubStaffAuth, AuthenticatedRequest } from '@/middleware/auth-enhanced';
import { ApiError, validateRequiredFields, validateFieldTypes } from '@/lib/api-error';
/**
 * POST /api/admin/passes/reject
 * Reject a pass request
 * 
 * Required: Club staff or admin role
 * Rate limited: Standard (100 req/15min)
 * 
 * Body: {
 *   requestId: string,
 *   reason: string
 * }
 */
export async function POST(request: NextRequest) {
  return withClubStaffAuth(request, async (_req: AuthenticatedRequest) => {
    const { user } = _req;
    // Parse and validate request body
    const body = await _req.json();
    const { requestId, reason } = body;
    // Validate required fields
    validateRequiredFields(body, ['requestId', 'reason']);
    validateFieldTypes(body, {
      requestId: 'string',
      reason: 'string'
    });
    const db = getAdminFirestore();
    try {
      // Get the pass request
      const requestRef = db.collection('pass_requests').doc(requestId);
      const requestSnap = await requestRef.get();
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
          throw ApiError.forbidden('Cannot reject request for different club');
        }
      }
      const now = new Date();
      // Update request status
      await requestRef.update({
        status: 'rejected',
        processedAt: now.toISOString(),
        processedBy: user!.uid,
        rejectionReason: reason
      });
      // Create audit log
      await db.collection('audit_logs').add({
        action: 'REJECT_PASS_REQUEST',
        performedBy: user!.uid,
        performedByRole: user!.role,
        targetType: 'pass_requests',
        targetId: requestId,
        metadata: {
          memberId: requestData.memberId,
          memberName: requestData.memberName,
          reason
        },
        timestamp: now.toISOString()
      });
      return NextResponse.json({
        success: true,
        message: 'Pass request rejected',
        requestId
      });
    } catch (error: unknown) {
      // Re-throw ApiError instances to be handled by middleware
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Failed to reject pass request', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

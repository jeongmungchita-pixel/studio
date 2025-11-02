import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { withClubStaffAuth, AuthenticatedRequest } from '@/middleware/auth-enhanced';
import { ApiError, validateRequiredFields } from '@/lib/api-error';
import { userCache, cacheKeys } from '@/lib/cache';
/**
 * POST /api/admin/approvals/adult
 * Approve adult registration request
 * 
 * Required: Club staff or admin role
 * Rate limited: Standard (100 req/15min)
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
    let memberId: string | undefined;
    let userId: string | undefined;
    try {
      // Run transaction to ensure atomicity
      const result = await db.runTransaction(async (transaction) => {
        // 1. Get the registration request
        const requestRef = db.collection('adultRegistrationRequests').doc(requestId);
        const requestSnap = await transaction.get(requestRef);
        if (!requestSnap.exists) {
          throw ApiError.notFound('Registration request not found');
        }
        const requestData = requestSnap.data()!;
        // Check if already approved
        if (requestData.status === 'approved') {
          throw ApiError.conflict('Request already approved');
        }
        // Check club permission for staff (non-admin)
        if (user!.role !== 'SUPER_ADMIN' && user!.role !== 'FEDERATION_ADMIN') {
          const userClubId = user!.clubId;
          const requestClubId = requestData.clubId;
          if (!userClubId || userClubId !== requestClubId) {
            throw ApiError.forbidden('Cannot approve request for different club');
          }
        }
        // 2. Create member document
        const memberRef = db.collection('members').doc();
        const memberData = {
          id: memberRef.id,
          name: requestData.name,
          dateOfBirth: requestData.birthDate,
          gender: requestData.gender,
          phoneNumber: requestData.phoneNumber,
          email: requestData.email || null,
          clubId: requestData.clubId,
          clubName: requestData.clubName || null,
          memberCategory: 'adult',
          memberType: 'individual',
          status: 'active',
          userId: requestData.requestedBy || null,
          createdAt: new Date().toISOString(),
          approvedBy: user!.uid,
          approvedAt: new Date().toISOString(),
        };
        transaction.set(memberRef, memberData);
        // 3. Update user document if requestedBy exists
        if (requestData.requestedBy) {
          const userRef = db.collection('users').doc(requestData.requestedBy);
          const userSnap = await transaction.get(userRef);
          if (userSnap.exists) {
            const userData = userSnap.data()!;
            // Only update if user is pending
            if (userData.status === 'pending') {
              transaction.update(userRef, {
                status: 'active',
                linkedMemberId: memberRef.id,
                clubId: requestData.clubId,
                clubName: requestData.clubName || null,
                updatedAt: new Date().toISOString(),
              });
              // Invalidate user cache
              userCache.delete(cacheKeys._user(requestData.requestedBy));
            }
            // Also update member with userId if not already set
            if (!memberData?.userId) {
              transaction.update(memberRef, {
                userId: requestData.requestedBy,
              });
            }
          }
        }
        // 4. Update request status
        transaction.update(requestRef, {
          status: 'approved',
          approvedBy: user!.uid,
          approvedAt: new Date().toISOString(),
          createdMemberId: memberRef.id,
        });
        // 5. Create audit log
        const auditRef = db.collection('audit_logs').doc();
        transaction.set(auditRef, {
          id: auditRef.id,
          action: 'APPROVE_ADULT_REGISTRATION',
          performedBy: user!.uid,
          performedByRole: user!.role,
          targetType: 'adultRegistrationRequests',
          targetId: requestId,
          metadata: {
            requestData,
            memberId: memberRef.id,
            userId: requestData.requestedBy,
          },
          timestamp: new Date().toISOString(),
        });
        // Return values needed outside transaction
        return {
          memberId: memberRef.id,
          userId: requestData.requestedBy
        };
      });
      // Extract returned values
      memberId = result.memberId;
      userId = result.userId;
      // Clear related caches
      if (userId) {
        userCache.delete(cacheKeys._user(userId));
      }
      return NextResponse.json({
        success: true,
        message: 'Adult registration approved successfully',
        requestId,
        memberId,
      });
    } catch (error: unknown) {
      // Re-throw ApiError instances to be handled by middleware
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Failed to approve registration', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

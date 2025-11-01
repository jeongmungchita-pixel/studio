import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { withAuth, isClubStaff, isAdmin, AuthenticatedRequest } from '@/middleware/auth';
/**
 * POST /api/admin/approvals/member
 * Approve general member registration request
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (_req: AuthenticatedRequest) => {
    const { user } = _req;
    // Check if user has permission (admin or club staff)
    if (!isAdmin(user!.role) && !isClubStaff(user!.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    // Parse request body
    const body = await _req.json();
    const { requestId } = body;
    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }
    const db = getAdminFirestore();
    try {
      // Run transaction to ensure atomicity
      await db.runTransaction(async (transaction) => {
        // 1. Get the registration request
        const requestRef = db.collection('memberRegistrationRequests').doc(requestId);
        const requestSnap = await transaction.get(requestRef);
        if (!requestSnap.exists) {
          throw new Error('Registration request not found');
        }
        const requestData = requestSnap.data()!;
        // Check if already approved
        if (requestData.status === 'approved') {
          throw new Error('Request already approved');
        }
        // Check club permission for staff
        if (!isAdmin(user!.role)) {
          const userClubId = user!.clubId;
          const requestClubId = requestData.clubId;
          if (!userClubId || userClubId !== requestClubId) {
            throw new Error('Cannot approve request for different club');
          }
        }
        // 2. Create member document
        const memberRef = db.collection('members').doc();
        const memberData = {
          id: memberRef.id,
          name: requestData.name,
          dateOfBirth: requestData.dateOfBirth || null,
          gender: requestData.gender || null,
          phoneNumber: requestData.phoneNumber || null,
          email: requestData.email || null,
          clubId: requestData.clubId,
          clubName: requestData.clubName || null,
          memberCategory: 'adult', // default
          memberType: requestData.memberType || 'individual',
          familyRole: requestData.familyRole || null,
          status: 'active',
          userId: requestData.userId || requestData.requestedBy || null,
          createdAt: new Date().toISOString(),
          approvedBy: user!.uid,
          approvedAt: new Date().toISOString(),
        };
        transaction.set(memberRef, memberData);
        // 3. Update user document if userId exists
        const targetUserId = requestData.userId || requestData.requestedBy;
        if (targetUserId) {
          const userRef = db.collection('users').doc(targetUserId);
          const userSnap = await transaction.get(userRef);
          if (userSnap.exists) {
            const userData = userSnap.data()!;
            // Only update if user is pending
            if (userData.status === 'pending') {
              transaction.update(userRef, {
                status: 'active',
                linkedMemberId: memberRef.id,
                requestedClubId: requestData.clubId,
                requestedClubName: requestData.clubName || null,
                updatedAt: new Date().toISOString(),
              });
            }
            // Ensure member has userId
            if (!memberData?.userId) {
              transaction.update(memberRef, {
                userId: targetUserId,
              });
            }
          }
        } else if (requestData.email) {
          // Try to find user by email
          const userQuery = await db.collection('users')
            .where('email', '==', requestData.email)
            .limit(1)
            .get();
          if (!userQuery.empty) {
            const userDoc = userQuery.docs[0];
            const userData = userDoc?.data();
            // Update user if pending
            if (userData.status === 'pending') {
              transaction.update(userDoc.ref, {
                status: 'active',
                linkedMemberId: memberRef.id,
                requestedClubId: requestData.clubId,
                requestedClubName: requestData.clubName || null,
                updatedAt: new Date().toISOString(),
              });
            }
            // Update member with userId
            transaction.update(memberRef, {
              userId: userDoc.id,
            });
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
          action: 'APPROVE_MEMBER_REGISTRATION',
          performedBy: user!.uid,
          performedByRole: user!.role,
          targetType: 'memberRegistrationRequests',
          targetId: requestId,
          metadata: {
            requestData,
            memberId: memberRef.id,
            userId: targetUserId,
          },
          timestamp: new Date().toISOString(),
        });
      });
      return NextResponse.json({
        success: true,
        message: 'Member registration approved successfully',
        requestId,
      });
    } catch (error: unknown) {
      return NextResponse.json(
        { 
          error: 'Failed to approve registration',
          details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) 
        },
        { status: 500 }
      );
    }
  });
}

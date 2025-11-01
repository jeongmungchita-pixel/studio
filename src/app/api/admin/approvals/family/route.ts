import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { withAuth, isClubStaff, isAdmin, AuthenticatedRequest } from '@/middleware/auth';
/**
 * POST /api/admin/approvals/family
 * Approve family registration request
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
        const requestRef = db.collection('familyRegistrationRequests').doc(requestId);
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
        const parentMemberIds: string[] = [];
        const childMemberIds: string[] = [];
        // 2. Create parent members
        for (const parent of requestData.parents || []) {
          const parentRef = db.collection('members').doc();
          parentMemberIds.push(parentRef.id);
          const parentData = {
            id: parentRef.id,
            name: parent.name,
            dateOfBirth: parent.birthDate,
            gender: parent.gender,
            phoneNumber: parent.phoneNumber,
            email: parent.email || null,
            clubId: requestData.clubId,
            clubName: requestData.clubName || null,
            memberCategory: 'adult',
            memberType: 'family',
            familyRole: 'parent',
            status: 'active',
            createdAt: new Date().toISOString(),
            approvedBy: user!.uid,
            approvedAt: new Date().toISOString(),
          };
          transaction.set(parentRef, parentData);
        }
        // 3. Create child members
        for (const child of requestData.children || []) {
          const childRef = db.collection('members').doc();
          childMemberIds.push(childRef.id);
          const childData = {
            id: childRef.id,
            name: child.name,
            dateOfBirth: child.birthDate,
            gender: child.gender,
            grade: child.grade || null,
            clubId: requestData.clubId,
            clubName: requestData.clubName || null,
            memberCategory: 'child',
            memberType: 'family',
            familyRole: 'child',
            guardianIds: parentMemberIds,
            guardianUserIds: requestData.requestedBy ? [requestData.requestedBy] : [],
            guardianName: parentMemberIds.length > 0 
              ? requestData.parents[0].name 
              : requestData.externalGuardian?.name || null,
            guardianPhone: parentMemberIds.length > 0 
              ? requestData.parents[0].phoneNumber 
              : requestData.externalGuardian?.phoneNumber || null,
            guardianRelation: requestData.externalGuardian?.relation || null,
            status: 'active',
            createdAt: new Date().toISOString(),
            approvedBy: user!.uid,
            approvedAt: new Date().toISOString(),
          };
          transaction.set(childRef, childData);
        }
        // 4. Update user document if requestedBy exists
        if (requestData.requestedBy && parentMemberIds.length > 0) {
          const userRef = db.collection('users').doc(requestData.requestedBy);
          const userSnap = await transaction.get(userRef);
          if (userSnap.exists) {
            const userData = userSnap.data()!;
            // Always update club info and linkedMemberId
            const userUpdate: any = {
              linkedMemberId: parentMemberIds[0], // Link to first parent
              clubId: requestData.clubId,        // Always set club info
              clubName: requestData.clubName || null,
              updatedAt: new Date().toISOString(),
            };
            // Only change status if pending
            if (userData.status === 'pending') {
              userUpdate.status = 'active';
            }
            transaction.update(userRef, userUpdate);
            // Also update first parent member with userId
            if (parentMemberIds.length > 0) {
              const firstParentRef = db.collection('members').doc(parentMemberIds[0]);
              transaction.update(firstParentRef, {
                userId: requestData.requestedBy,
              });
            }
          }
        }
        // 5. Update request status
        transaction.update(requestRef, {
          status: 'approved',
          approvedBy: user!.uid,
          approvedAt: new Date().toISOString(),
          createdMemberIds: [...parentMemberIds, ...childMemberIds],
        });
        // 6. Create audit log
        const auditRef = db.collection('audit_logs').doc();
        transaction.set(auditRef, {
          id: auditRef.id,
          action: 'APPROVE_FAMILY_REGISTRATION',
          performedBy: user!.uid,
          performedByRole: user!.role,
          targetType: 'familyRegistrationRequests',
          targetId: requestId,
          metadata: {
            requestData,
            parentMemberIds,
            childMemberIds,
            userId: requestData.requestedBy,
          },
          timestamp: new Date().toISOString(),
        });
      });
      return NextResponse.json({
        success: true,
        message: 'Family registration approved successfully',
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

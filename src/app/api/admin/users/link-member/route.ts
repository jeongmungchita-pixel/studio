import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { withAuth, isClubStaff, isAdmin, AuthenticatedRequest } from '@/middleware/auth';
/**
 * POST /api/admin/users/link-member
 * Link a user to a member or update the link
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
    const body = await _req.json();
    const { userId, memberId, forceUpdate = false } = body;
    // Validate required fields
    if (!userId || !memberId) {
      return NextResponse.json(
        { error: 'User ID and Member ID are required' },
        { status: 400 }
      );
    }
    const db = getAdminFirestore();
    try {
      await db.runTransaction(async (transaction) => {
        // Get both documents
        const userRef = db.collection('users').doc(userId);
        const memberRef = db.collection('members').doc(memberId);
        const userSnap = await transaction.get(userRef);
        const memberSnap = await transaction.get(memberRef);
        if (!userSnap.exists) {
          throw new Error('User not found');
        }
        if (!memberSnap.exists) {
          throw new Error('Member not found');
        }
        const userData = userSnap.data()!;
        const memberData = memberSnap.data()!;
        // Check club permission for staff
        if (!isAdmin(user!.role)) {
          const userClubId = user!.clubId;
          const memberClubId = memberData?.clubId;
          if (!userClubId || userClubId !== memberClubId) {
            throw new Error('Cannot link member from different club');
          }
        }
        // Check if already linked
        if (userData.linkedMemberId && !forceUpdate) {
          throw new Error(`User already linked to member ${userData.linkedMemberId}. Use forceUpdate to override.`);
        }
        if (memberData?.userId && memberData?.userId !== userId && !forceUpdate) {
          throw new Error(`Member already linked to user ${memberData?.userId}. Use forceUpdate to override.`);
        }
        // Remove previous links if forcing update
        if (forceUpdate) {
          // Clear old member's userId if it exists
          if (memberData?.userId && memberData?.userId !== userId) {
            const oldUserRef = db.collection('users').doc(memberData?.userId);
            const oldUserSnap = await transaction.get(oldUserRef);
            if (oldUserSnap.exists) {
              transaction.update(oldUserRef, {
                linkedMemberId: null,
                updatedAt: new Date().toISOString(),
              });
            }
          }
          // Clear old user's member if it exists
          if (userData.linkedMemberId && userData.linkedMemberId !== memberId) {
            const oldMemberRef = db.collection('members').doc(userData.linkedMemberId);
            const oldMemberSnap = await transaction.get(oldMemberRef);
            if (oldMemberSnap.exists) {
              transaction.update(oldMemberRef, {
                userId: null,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
        // Update user with linkedMemberId
        transaction.update(userRef, {
          linkedMemberId: memberId,
          clubId: memberData?.clubId,
          clubName: memberData?.clubName || null,
          updatedAt: new Date().toISOString(),
        });
        // Update member with userId
        transaction.update(memberRef, {
          userId: userId,
          updatedAt: new Date().toISOString(),
        });
        // Create audit log
        const auditRef = db.collection('audit_logs').doc();
        transaction.set(auditRef, {
          id: auditRef.id,
          action: 'LINK_USER_MEMBER',
          performedBy: user!.uid,
          performedByRole: user!.role,
          targetType: 'users',
          targetId: userId,
          metadata: {
            userId,
            memberId,
            forceUpdate,
            previousLinkedMemberId: userData.linkedMemberId,
            previousUserId: memberData?.userId,
          },
          timestamp: new Date().toISOString(),
        });
      });
      return NextResponse.json({
        success: true,
        message: 'User and member successfully linked',
        userId,
        memberId,
      });
    } catch (error: unknown) {
      return NextResponse.json(
        { 
          error: 'Failed to link user and member',
          details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) 
        },
        { status: 500 }
      );
    }
  });
}

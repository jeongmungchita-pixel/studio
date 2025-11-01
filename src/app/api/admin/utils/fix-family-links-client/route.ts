import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
/**
 * POST /api/admin/utils/fix-family-links-client
 * Client-side version without auth middleware for immediate testing
 * WARNING: This should be removed or secured in production
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parentUserId, dryRun = true } = body;
    if (!parentUserId) {
      return NextResponse.json(
        { error: 'Parent User ID is required' },
        { status: 400 }
      );
    }
    const db = getAdminFirestore();
    const fixes: any[] = [];
    // 1. Find parent member(s) linked to this user
    const parentMembersSnap = await db.collection('members')
      .where('userId', '==', parentUserId)
      .get();
    if (parentMembersSnap.empty) {
      return NextResponse.json({
        error: 'No parent member found for this user',
        message: `No member document found with userId: ${parentUserId}`,
      }, { status: 404 });
    }
    const parentMember = parentMembersSnap.docs[0];
    const parentData = parentMember.data();
    const parentMemberId = parentMember.id;
    const clubId = parentData.clubId;
    // 2. Find all children in the same club with matching guardianIds
    const childrenSnap = await db.collection('members')
      .where('clubId', '==', clubId)
      .where('memberCategory', '==', 'child')
      .get();
    const batch = db.batch();
    for (const childDoc of childrenSnap.docs) {
      const childData = childDoc?.data();
      // Check if this child belongs to this parent
      if (childData.guardianIds?.includes(parentMemberId) || 
          childData.guardianPhone === parentData.phoneNumber) {
        // Fix guardianUserIds if missing or incorrect
        if (!childData.guardianUserIds?.includes(parentUserId)) {
          const update = {
            guardianUserIds: [parentUserId, ...(childData.guardianUserIds || [])].filter(Boolean),
            updatedAt: new Date().toISOString(),
            updatedBy: 'fix-family-links-utility',
          };
          fixes.push({
            childId: childDoc.id,
            childName: childData.name,
            action: 'add_guardian_user_id',
            parentUserId,
            parentMemberId,
            update,
          });
          if (!dryRun) {
            batch.update(childDoc.ref, update);
          }
        }
      }
    }
    // 3. Fix parent user's club info if missing
    const parentUserRef = db.collection('users').doc(parentUserId);
    const parentUserSnap = await parentUserRef.get();
    if (parentUserSnap.exists) {
      const userData = parentUserSnap.data()!;
      if (!userData.clubId || !userData.clubName) {
        const clubSnap = await db.collection('clubs').doc(clubId).get();
        const clubData = clubSnap.data();
        const userUpdate = {
          clubId: clubId,
          clubName: clubData?.name || null,
          updatedAt: new Date().toISOString(),
          updatedBy: 'fix-family-links-utility',
        };
        fixes.push({
          userId: parentUserId,
          action: 'add_club_info',
          update: userUpdate,
        });
        if (!dryRun) {
          batch.update(parentUserRef, userUpdate);
        }
      }
    }
    // 4. Commit changes if not dry run
    if (!dryRun && fixes.length > 0) {
      await batch.commit();
      // Add audit log
      await db.collection('audit_logs').add({
        action: 'FIX_FAMILY_LINKS',
        performedBy: 'system-utility',
        targetUserId: parentUserId,
        fixes,
        timestamp: new Date().toISOString(),
      });
    }
    return NextResponse.json({
      success: true,
      message: dryRun 
        ? `Dry run complete. ${fixes.length} fixes found.`
        : `Fixed ${fixes.length} family links.`,
      fixes,
      dryRun,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { 
        error: 'Failed to fix family links',
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) 
      },
      { status: 500 }
    );
  }
}

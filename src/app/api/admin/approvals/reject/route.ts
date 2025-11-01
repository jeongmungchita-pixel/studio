import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { withAuth, isClubStaff, isAdmin, AuthenticatedRequest } from '@/middleware/auth';
/**
 * POST /api/admin/approvals/reject
 * Reject any type of registration request
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
    const { requestId, type } = body;
    if (!requestId || !type) {
      return NextResponse.json(
        { error: 'Request ID and type are required' },
        { status: 400 }
      );
    }
    // Validate type
    if (!['adult', 'family', 'member'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid request type' },
        { status: 400 }
      );
    }
    const db = getAdminFirestore();
    try {
      // Determine collection name
      const collectionName = 
        type === 'adult' ? 'adultRegistrationRequests' : 
        type === 'family' ? 'familyRegistrationRequests' :
        'memberRegistrationRequests';
      // Get the request document
      const requestRef = db.collection(collectionName).doc(requestId);
      const requestSnap = await requestRef.get();
      if (!requestSnap.exists) {
        return NextResponse.json(
          { error: 'Registration request not found' },
          { status: 404 }
        );
      }
      const requestData = requestSnap.data()!;
      // Check if already processed
      if (requestData.status !== 'pending') {
        return NextResponse.json(
          { error: `Request already ${requestData.status}` },
          { status: 400 }
        );
      }
      // Check club permission for staff
      if (!isAdmin(user!.role)) {
        const userClubId = user!.clubId;
        const requestClubId = requestData.clubId;
        if (!userClubId || userClubId !== requestClubId) {
          return NextResponse.json(
            { error: 'Cannot reject request for different club' },
            { status: 403 }
          );
        }
      }
      // Update request status to rejected
      await requestRef.update({
        status: 'rejected',
        rejectedBy: user!.uid,
        rejectedAt: new Date().toISOString(),
        rejectedReason: body.reason || null,
      });
      // Create audit log
      await db.collection('audit_logs').add({
        action: 'REJECT_REGISTRATION',
        performedBy: user!.uid,
        performedByRole: user!.role,
        targetType: collectionName,
        targetId: requestId,
        metadata: {
          type,
          requestData,
          reason: body.reason || null,
        },
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({
        success: true,
        message: '가입 신청이 거절되었습니다.',
        requestId,
        type,
      });
    } catch (error: unknown) {
      return NextResponse.json(
        { 
          error: 'Failed to reject registration',
          details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) 
        },
        { status: 500 }
      );
    }
  });
}

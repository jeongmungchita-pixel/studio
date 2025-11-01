import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { withAuth, isAdmin, AuthenticatedRequest } from '@/middleware/auth';
/**
 * POST /api/admin/users/update-status
 * Update user status (pending/active/inactive)
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (_req: AuthenticatedRequest) => {
    const { user } = _req;
    // Only admins can change user status directly
    if (!isAdmin(user!.role)) {
      return NextResponse.json(
        { error: 'Only administrators can update user status' },
        { status: 403 }
      );
    }
    const body = await _req.json();
    const { userId, status, reason } = body;
    // Validate required fields
    if (!userId || !status) {
      return NextResponse.json(
        { error: 'User ID and status are required' },
        { status: 400 }
      );
    }
    // Validate status value
    if (!['pending', 'active', 'inactive'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be pending, active, or inactive' },
        { status: 400 }
      );
    }
    const db = getAdminFirestore();
    try {
      // Get the user document
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      const userData = userSnap.data()!;
      const previousStatus = userData.status;
      // Update user status
      await userRef.update({
        status,
        statusUpdatedAt: new Date().toISOString(),
        statusUpdatedBy: user!.uid,
        statusReason: reason || null,
        updatedAt: new Date().toISOString(),
      });
      // Create audit log
      await db.collection('audit_logs').add({
        action: 'UPDATE_USER_STATUS',
        performedBy: user!.uid,
        performedByRole: user!.role,
        targetType: 'users',
        targetId: userId,
        metadata: {
          previousStatus,
          newStatus: status,
          reason: reason || null,
        },
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({
        success: true,
        message: `User status updated to ${status}`,
        userId,
        status,
      });
    } catch (error: unknown) {
      return NextResponse.json(
        { 
          error: 'Failed to update user status',
          details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) 
        },
        { status: 500 }
      );
    }
  });
}

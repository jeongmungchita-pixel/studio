import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, getUserRole } from '@/lib/firebase-admin';
export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email: string;
    role: string;
    status: string;
    clubId?: string;
    clubName?: string;
  };
}
/**
 * Middleware to verify Firebase Auth token
 */
export async function withAuth(
  request: NextRequest,
  handler: (_req: AuthenticatedRequest) => Promise<NextResponse>
) {
  // Extract token from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 }
    );
  }
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  // Verify token
  const decodedToken = await verifyIdToken(token);
  if (!decodedToken) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
  // Get user role from Firestore
  const userInfo = await getUserRole(decodedToken.uid);
  if (!userInfo) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }
  // Check if user is active
  if (userInfo.status !== 'active' && userInfo.status !== 'pending') {
    return NextResponse.json(
      { error: 'User account is inactive' },
      { status: 403 }
    );
  }
  // Attach user info to request
  const authenticatedRequest = request as AuthenticatedRequest;
  authenticatedRequest.user = {
    uid: decodedToken.uid,
    email: decodedToken.email || '',
    role: userInfo.role,
    status: userInfo.status,
    clubId: userInfo.clubId,
    clubName: userInfo.clubName,
  };
  // Call the actual handler
  return handler(authenticatedRequest);
}
/**
 * Check if user has one of the required roles
 */
export function hasRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}
/**
 * Check if user is club staff
 */
export function isClubStaff(userRole: string): boolean {
  const staffRoles = [
    'CLUB_OWNER',
    'CLUB_MANAGER',
    'HEAD_COACH',
    'ASSISTANT_COACH',
    'COACH'
  ];
  return staffRoles.includes(userRole);
}
/**
 * Check if user is admin
 */
export function isAdmin(userRole: string): boolean {
  return userRole === 'SUPER_ADMIN' || userRole === 'FEDERATION_ADMIN';
}

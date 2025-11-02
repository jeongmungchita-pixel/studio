/**
 * Enhanced authentication middleware with caching and monitoring
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, getUserRole } from '@/lib/firebase-admin';
import { userCache, cacheKeys } from '@/lib/cache';
import { ApiError, handleApiError } from '@/lib/api-error';
import { logApiRequest, LogLevel, withMonitoring } from '@/lib/monitoring';
import { withRateLimit, strictRateLimit, standardRateLimit } from '@/middleware/rate-limit';
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
 * Enhanced auth middleware with caching and monitoring
 */
export async function withAuthEnhanced(
  request: NextRequest,
  handler: (_req: AuthenticatedRequest) => Promise<NextResponse>,
  options: {
    requireAdmin?: boolean;
    requireClubStaff?: boolean;
    requireClubId?: string;
    cacheUser?: boolean;
    useStrictRateLimit?: boolean;
  } = {}
) {
  const {
    requireAdmin = false,
    requireClubStaff = false,
    requireClubId,
    cacheUser = true,
    useStrictRateLimit = false
  } = options;
  // Apply rate limiting
  const rateLimitMiddleware = useStrictRateLimit ? strictRateLimit : standardRateLimit;
  return rateLimitMiddleware(request, async (_req) => {
    const startTime = Date.now();
    try {
        // Extract token from Authorization header
        const authHeader = _req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw ApiError.unauthorized('Missing or invalid Authorization header');
        }
        const token = authHeader.split(' ')[1];
        const decodedToken = await verifyIdToken(token);
        if (!decodedToken) {
          throw ApiError.invalidToken('Invalid or expired token');
        }
        // Try to get user info from cache first
        const cacheKey = cacheKeys._user(decodedToken.uid);
        let userInfo = cacheUser ? userCache.get(cacheKey) : null;
        // If not in cache, fetch from Firestore
        if (!userInfo) {
          userInfo = await getUserRole(decodedToken.uid);
          if (!userInfo) {
            throw ApiError.notFound('User not found');
          }
          // Cache the user info
          if (cacheUser) {
            userCache.set(cacheKey, userInfo, 5 * 60 * 1000); // 5 minutes
          }
        }
        // Check if user is active
        if (userInfo.status !== 'active' && userInfo.status !== 'pending') {
          throw ApiError.forbidden('User account is inactive');
        }
        // Check admin requirement
        if (requireAdmin) {
          if (!isAdmin(userInfo.role)) {
            throw ApiError.insufficientPermissions('Admin access required');
          }
        }
        // Check club staff requirement
        if (requireClubStaff) {
          if (!isClubStaff(userInfo.role) && !isAdmin(userInfo.role)) {
            throw ApiError.insufficientPermissions('Club staff access required');
          }
        }
        // Check specific club requirement
        if (requireClubId && userInfo.clubId !== requireClubId) {
          throw ApiError.forbidden('Access denied to this club');
        }
        // Attach user info to request
        const authenticatedRequest = _req as AuthenticatedRequest;
        authenticatedRequest.user = {
          uid: decodedToken.uid,
          email: decodedToken.email || '',
          role: userInfo.role,
          status: userInfo.status,
          clubId: userInfo.clubId,
          clubName: userInfo.clubName,
        };
        // Log successful authentication
        await logApiRequest(_req, {
          level: LogLevel.INFO,
          userId: decodedToken.uid,
          userEmail: decodedToken.email || undefined,
          userRole: userInfo.role,
          metadata: {
            authenticated: true,
            cached: cacheUser && userCache.has(cacheKey)
          }
        });
        // Call the actual handler
        const response = await handler(authenticatedRequest);
        // Add performance header
        const duration = Date.now() - startTime;
        response.headers.set('X-Response-Time', `${duration}ms`);
        return response;
      } catch (error: unknown) {
        // Log authentication failure
        await logApiRequest(_req, {
          level: LogLevel.WARN,
          error,
          metadata: {
            authenticated: false,
            duration: Date.now() - startTime
          }
        });
        const errorResp = handleApiError(error);
        // Convert Response to NextResponse if needed
        if (errorResp instanceof Response && !(errorResp instanceof NextResponse)) {
          const body = await errorResp.json();
          return NextResponse.json(body, { 
            status: errorResp.status,
            headers: errorResp.headers 
          });
        }
        return errorResp as NextResponse;
      }
  });
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
/**
 * Helper middleware for admin-only endpoints
 */
export function withAdminAuth(
  request: NextRequest,
  handler: (_req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuthEnhanced(request, handler, {
    requireAdmin: true,
    useStrictRateLimit: true
  });
}
/**
 * Helper middleware for club staff endpoints
 */
export function withClubStaffAuth(
  request: NextRequest,
  handler: (_req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuthEnhanced(request, handler, {
    requireClubStaff: true
  });
}

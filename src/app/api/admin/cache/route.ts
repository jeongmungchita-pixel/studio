import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthenticatedRequest } from '@/middleware/auth-enhanced';
import { userCache, clubCache, memberCache, apiResponseCache } from '@/lib/cache';
import { ApiError, validateFieldTypes } from '@/lib/api-error';
/**
 * GET /api/admin/cache
 * Get cache statistics
 * 
 * Required: Admin role only
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (_req: AuthenticatedRequest) => {
    const stats = {
      userCache: {
        ...userCache.getStats(),
        type: 'User Cache',
        description: 'Caches user authentication and role data'
      },
      clubCache: {
        ...clubCache.getStats(),
        type: 'Club Cache', 
        description: 'Caches club information'
      },
      memberCache: {
        ...memberCache.getStats(),
        type: 'Member Cache',
        description: 'Caches member profiles and data'
      },
      apiResponseCache: {
        ...apiResponseCache.getStats(),
        type: 'API Response Cache',
        description: 'Caches API responses for performance'
      }
    };
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      caches: stats
    });
  });
}
/**
 * DELETE /api/admin/cache
 * Clear cache(s)
 * 
 * Required: Admin role only
 * Body: { cacheType?: 'user' | 'club' | 'member' | 'api' | 'all', key?: string }
 */
export async function DELETE(request: NextRequest) {
  return withAdminAuth(request, async (_req: AuthenticatedRequest) => {
    const body = await _req.json();
    const { cacheType = 'all', key } = body;
    // Validate input
    validateFieldTypes(body, {
      cacheType: 'string',
      key: 'string'
    });
    const validCacheTypes = ['user', 'club', 'member', 'api', 'all'];
    if (!validCacheTypes.includes(cacheType)) {
      throw ApiError.badRequest(`Invalid cache type. Must be one of: ${validCacheTypes.join(', ')}`);
    }
    let cleared = [];
    // Clear specific key if provided
    if (key) {
      switch (cacheType) {
        case 'user':
          userCache.delete(key) && cleared.push(`_user:${key}`);
          break;
        case 'club':
          clubCache.delete(key) && cleared.push(`club:${key}`);
          break;
        case 'member':
          memberCache.delete(key) && cleared.push(`member:${key}`);
          break;
        case 'api':
          apiResponseCache.delete(key) && cleared.push(`api:${key}`);
          break;
        case 'all':
          userCache.delete(key) && cleared.push(`_user:${key}`);
          clubCache.delete(key) && cleared.push(`club:${key}`);
          memberCache.delete(key) && cleared.push(`member:${key}`);
          apiResponseCache.delete(key) && cleared.push(`api:${key}`);
          break;
      }
    } else {
      // Clear entire cache(s)
      switch (cacheType) {
        case 'user':
          userCache.clear();
          cleared.push('user cache');
          break;
        case 'club':
          clubCache.clear();
          cleared.push('club cache');
          break;
        case 'member':
          memberCache.clear();
          cleared.push('member cache');
          break;
        case 'api':
          apiResponseCache.clear();
          cleared.push('api response cache');
          break;
        case 'all':
          userCache.clear();
          clubCache.clear();
          memberCache.clear();
          apiResponseCache.clear();
          cleared.push('all caches');
          break;
      }
    }
    return NextResponse.json({
      success: true,
      message: `Successfully cleared: ${cleared.join(', ')}`,
      clearedAt: new Date().toISOString()
    });
  });
}
/**
 * POST /api/admin/cache/cleanup
 * Trigger manual cache cleanup (remove expired entries)
 * 
 * Required: Admin role only
 */
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (_req: AuthenticatedRequest) => {
    const before = {
      userCache: userCache.size,
      clubCache: clubCache.size,
      memberCache: memberCache.size,
      apiResponseCache: apiResponseCache.size
    };
    // Run cleanup
    userCache.cleanup();
    clubCache.cleanup();
    memberCache.cleanup();
    apiResponseCache.cleanup();
    const after = {
      userCache: userCache.size,
      clubCache: clubCache.size,
      memberCache: memberCache.size,
      apiResponseCache: apiResponseCache.size
    };
    const removed = {
      userCache: before.userCache - after.userCache,
      clubCache: before.clubCache - after.clubCache,
      memberCache: before.memberCache - after.memberCache,
      apiResponseCache: before.apiResponseCache - after.apiResponseCache
    };
    return NextResponse.json({
      success: true,
      message: 'Cache cleanup completed',
      before,
      after,
      removed,
      cleanupAt: new Date().toISOString()
    });
  });
}

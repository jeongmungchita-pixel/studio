import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthenticatedRequest } from '@/middleware/auth-enhanced';
import { getMonitoringData } from '@/lib/monitoring';
import { getRateLimitStats } from '@/middleware/rate-limit';
import { userCache, clubCache, memberCache, apiResponseCache } from '@/lib/cache';
/**
 * GET /api/admin/monitoring
 * Get system monitoring data
 * 
 * Required: Admin role only
 * Rate limited: Strict (10 req/5min)
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (_req: AuthenticatedRequest) => {
    try {
      // Get monitoring data
      const monitoring = getMonitoringData();
      // Get rate limit statistics
      const rateLimitStats = getRateLimitStats();
      // Get cache statistics
      const cacheStats = {
        userCache: userCache.getStats(),
        clubCache: clubCache.getStats(),
        memberCache: memberCache.getStats(),
        apiResponseCache: apiResponseCache.getStats()
      };
      // Calculate system health score (0-100)
      const healthScore = calculateHealthScore(monitoring.summary);
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        healthScore,
        monitoring,
        rateLimiting: rateLimitStats,
        caching: cacheStats,
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV
        }
      });
    } catch (error: unknown) {
      return NextResponse.json(
        { error: 'Failed to retrieve monitoring data' },
        { status: 500 }
      );
    }
  });
}
/**
 * Calculate health score based on metrics
 */
function calculateHealthScore(summary: any): number {
  let score = 100;
  // Deduct points for high error rate
  const errorRate = summary.totalRequests > 0 
    ? (summary.totalErrors / summary.totalRequests) * 100 
    : 0;
  if (errorRate > 20) score -= 40;
  else if (errorRate > 10) score -= 20;
  else if (errorRate > 5) score -= 10;
  // Deduct points for slow response time
  if (summary.avgResponseTime > 10000) score -= 30;
  else if (summary.avgResponseTime > 5000) score -= 15;
  else if (summary.avgResponseTime > 2000) score -= 5;
  // Deduct points for failing endpoints
  const failingEndpoints = summary.topEndpoints.filter(
    (e: any) => e.successRate < 50 && e.count > 10
  );
  score -= failingEndpoints.length * 5;
  return Math.max(0, Math.min(100, score));
}

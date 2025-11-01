import { NextRequest, NextResponse } from 'next/server';
import { getHealthCheck } from '@/lib/monitoring';
import { lenientRateLimit } from '@/middleware/rate-limit';
/**
 * GET /api/health
 * Health check endpoint
 * 
 * Public endpoint - no authentication required
 * Rate limited: Lenient (500 req/15min)
 */
export async function GET(request: NextRequest) {
  return lenientRateLimit(request, async () => {
    try {
      const health = await getHealthCheck();
      // Set appropriate status code based on health
      let statusCode = 200;
      if (health.status === 'unhealthy') {
        statusCode = 503;
      } else if (health.status === 'degraded') {
        statusCode = 200; // Still return 200 but with degraded status
      }
      return NextResponse.json(health, { status: statusCode });
    } catch (error: unknown) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          metrics: {
            totalRequests: 0,
            errorRate: 100,
            avgResponseTime: 0
          },
          services: {
            firebase: false,
            firestore: false
          },
          error: 'Health check failed'
        },
        { status: 503 }
      );
    }
  });
}

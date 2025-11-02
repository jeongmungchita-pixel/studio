import { NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * API Log Entry
 */
interface ApiLogEntry {
  timestamp: number;
  level: LogLevel;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ip?: string;
  userAgent?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Performance metrics
 */
interface PerformanceMetrics {
  endpoint: string;
  method: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  errorCount: number;
  successRate: number;
  lastUpdated: number;
}

/**
 * In-memory metrics store
 */
class MetricsStore {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private logs: ApiLogEntry[] = [];
  private maxLogs: number = 1000;

  /**
   * Record API call metrics
   */
  recordMetric(
    endpoint: string,
    method: string,
    duration: number,
    isError: boolean
  ): void {
    const key = `${method}:${endpoint}`;
    const existing = this.metrics.get(key);

    if (!existing) {
      this.metrics.set(key, {
        endpoint,
        method,
        count: 1,
        totalDuration: duration,
        avgDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        errorCount: isError ? 1 : 0,
        successRate: isError ? 0 : 100,
        lastUpdated: Date.now()
      });
    } else {
      existing.count++;
      existing.totalDuration += duration;
      existing.avgDuration = existing.totalDuration / existing.count;
      existing.minDuration = Math.min(existing.minDuration, duration);
      existing.maxDuration = Math.max(existing.maxDuration, duration);
      if (isError) existing.errorCount++;
      existing.successRate = ((existing.count - existing.errorCount) / existing.count) * 100;
      existing.lastUpdated = Date.now();
    }
  }

  /**
   * Add log entry
   */
  addLog(entry: ApiLogEntry): void {
    this.logs.unshift(entry);
    
    // Keep only recent logs in memory
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values())
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get recent logs
   */
  getLogs(limit: number = 100): ApiLogEntry[] {
    return this.logs.slice(0, limit);
  }

  /**
   * Get metrics summary
   */
  getSummary(): {
    totalRequests: number;
    totalErrors: number;
    avgResponseTime: number;
    successRate: number;
    topEndpoints: PerformanceMetrics[];
    slowestEndpoints: PerformanceMetrics[];
  } {
    const metrics = this.getMetrics();
    const totalRequests = metrics.reduce((sum, m) => sum + m.count, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0);
    const totalDuration = metrics.reduce((sum, m) => sum + m.totalDuration, 0);

    return {
      totalRequests,
      totalErrors,
      avgResponseTime: totalRequests > 0 ? totalDuration / totalRequests : 0,
      successRate: totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests) * 100 : 0,
      topEndpoints: metrics.slice(0, 10),
      slowestEndpoints: [...metrics].sort((a, b) => b.avgDuration - a.avgDuration).slice(0, 10)
    };
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics.clear();
    this.logs = [];
  }
}

// Global metrics store
const metricsStore = new MetricsStore();

/**
 * Get client IP address from request
 */
function getClientIp(_req: NextRequest): string {
  const xForwardedFor = _req.headers.get('x-forwarded-for');
  const xRealIp = _req.headers.get('x-real-ip');
  const cfConnectingIp = _req.headers.get('cf-connecting-ip');

  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  if (xRealIp) {
    return xRealIp;
  }
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return 'unknown';
}

/**
 * Log API request
 */
export async function logApiRequest(
  _req: NextRequest,
  {
    level = LogLevel.INFO,
    userId,
    userEmail,
    userRole,
    error,
    metadata
  }: {
    level?: LogLevel;
    userId?: string;
    userEmail?: string;
    userRole?: string;
    error?: Error | unknown;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  const entry: ApiLogEntry = {
    timestamp: Date.now(),
    level,
    method: _req.method,
    path: _req.nextUrl.pathname,
    userId,
    userEmail,
    userRole,
    ip: getClientIp(_req),
    userAgent: _req.headers.get('user-agent') || undefined,
    error: error ? (error instanceof Error ? error.message : String(error)) : undefined,
    metadata
  };

  // Add to in-memory store
  metricsStore.addLog(entry);

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const logData = {
      ...entry,
      timestamp: new Date(entry.timestamp).toISOString()
    };

    switch (level) {
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        break;
      case LogLevel.WARN:
        break;
      case LogLevel.DEBUG:
        break;
      default:
    }
  }

  // Async write to Firestore for critical logs
  if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
    try {
      await initAdmin();
      const db = getFirestore();
      await db.collection('api_logs').add({
        ...entry,
        timestamp: new Date(entry.timestamp)
      });
    } catch (err: unknown) {
    }
  }
}

/**
 * Monitor API performance
 */
export function withMonitoring(
  handler: (_req: NextRequest) => Promise<Response>
) {
  return async (_req: NextRequest): Promise<Response> => {
    const startTime = Date.now();
    let response: Response;
    let error: unknown;

    try {
      // Execute handler
      response = await handler(_req);

      // Record metrics
      const duration = Date.now() - startTime;
      const isError = response.status >= 400;
      
      metricsStore.recordMetric(
        _req.nextUrl.pathname,
        _req.method,
        duration,
        isError
      );

      // Log request
      await logApiRequest(_req, {
        level: isError ? LogLevel.ERROR : LogLevel.INFO,
        metadata: {
          statusCode: response.status,
          duration
        }
      });

      // Add performance headers
      response.headers.set('X-Response-Time', `${duration}ms`);

      return response;
    } catch (err: unknown) {
      error = err;
      const duration = Date.now() - startTime;

      // Record error metrics
      metricsStore.recordMetric(
        _req.nextUrl.pathname,
        _req.method,
        duration,
        true
      );

      // Log error
      await logApiRequest(_req, {
        level: LogLevel.ERROR,
        error: err,
        metadata: {
          duration
        }
      });

      throw err;
    }
  };
}

/**
 * Get monitoring dashboard data
 */
export function getMonitoringData(): {
  summary: ReturnType<MetricsStore['getSummary']>;
  metrics: PerformanceMetrics[];
  recentLogs: ApiLogEntry[];
} {
  return {
    summary: metricsStore.getSummary(),
    metrics: metricsStore.getMetrics(),
    recentLogs: metricsStore.getLogs(50)
  };
}

/**
 * Health check endpoint data
 */
export async function getHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  metrics: {
    totalRequests: number;
    errorRate: number;
    avgResponseTime: number;
  };
  services: {
    firebase: boolean;
    firestore: boolean;
  };
}> {
  const summary = metricsStore.getSummary();
  const errorRate = summary.totalRequests > 0 
    ? (summary.totalErrors / summary.totalRequests) * 100 
    : 0;

  // Check Firebase services
  let firebaseHealthy = false;
  let firestoreHealthy = false;

  try {
    await initAdmin();
    // Simplified health check - just verify initialization
    const auth = getAuth();
    const db = getFirestore();
    
    // If we can get instances, consider Firebase healthy
    // (Actual permissions will be checked during real operations)
    if (auth && db) {
      firebaseHealthy = true;
      firestoreHealthy = true;
    }
  } catch (err: unknown) {
    console.log('Firebase health check error:', err);
  }

  // Determine overall health status
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (!firebaseHealthy || !firestoreHealthy) {
    status = 'unhealthy';
  } else if (errorRate > 10 || summary.avgResponseTime > 5000) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    metrics: {
      totalRequests: summary.totalRequests,
      errorRate,
      avgResponseTime: summary.avgResponseTime
    },
    services: {
      firebase: firebaseHealthy,
      firestore: firestoreHealthy
    }
  };
}

/**
 * Alert on critical conditions
 */
export async function checkAndAlert(): Promise<void> {
  const summary = metricsStore.getSummary();
  const errorRate = summary.totalRequests > 0 
    ? (summary.totalErrors / summary.totalRequests) * 100 
    : 0;

  // Alert conditions
  const alerts: string[] = [];

  if (errorRate > 20) {
    alerts.push(`High error rate: ${errorRate.toFixed(2)}%`);
  }

  if (summary.avgResponseTime > 10000) {
    alerts.push(`Slow response time: ${summary.avgResponseTime.toFixed(0)}ms`);
  }

  // Check for specific endpoint issues
  const metrics = metricsStore.getMetrics();
  for (const metric of metrics) {
    if (metric.successRate < 50 && metric.count > 10) {
      alerts.push(`Endpoint failing: ${metric.method} ${metric.endpoint} (${metric.successRate.toFixed(0)}% success)`);
    }
  }

  // Log alerts (in production, this would send to monitoring service)
  if (alerts.length > 0) {
    
    // Write to Firestore
    try {
      await initAdmin();
      const db = getFirestore();
      await db.collection('system_alerts').add({
        timestamp: new Date(),
        alerts,
        summary: {
          errorRate,
          avgResponseTime: summary.avgResponseTime,
          totalRequests: summary.totalRequests
        }
      });
    } catch (err: unknown) {
    }
  }
}

// Run periodic health checks (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    checkAndAlert().catch(console.error);
  }, 5 * 60 * 1000);
}

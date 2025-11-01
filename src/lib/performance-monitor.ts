/**
 * 성능 모니터링 시스템
 * Web Vitals 및 커스텀 메트릭 추적
 */

import { logger } from './logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface WebVitals {
  FCP?: number;  // First Contentful Paint
  LCP?: number;  // Largest Contentful Paint
  FID?: number;  // First Input Delay
  CLS?: number;  // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
  INP?: number;  // Interaction to Next Paint
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private webVitals: WebVitals = {};
  private thresholds = {
    FCP: 1800,    // Good < 1.8s
    LCP: 2500,    // Good < 2.5s
    FID: 100,     // Good < 100ms
    CLS: 0.1,     // Good < 0.1
    TTFB: 800,    // Good < 800ms
    INP: 200,     // Good < 200ms
  };

  private constructor() {
    this.initWebVitals();
    this.startPeriodicReporting();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Web Vitals 초기화
   */
  private initWebVitals(): void {
    if (typeof window === 'undefined') return;

    // First Contentful Paint
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.webVitals.FCP = entry.startTime;
          this.checkThreshold('FCP', entry.startTime);
        }
      }
    });

    try {
      paintObserver.observe({ type: 'paint', buffered: true });
    } catch (e) {
      // PerformanceObserver not supported
    }

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.webVitals.LCP = lastEntry.startTime;
      this.checkThreshold('LCP', lastEntry.startTime);
    });

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // LCP observer not supported
    }

    // Time to First Byte
    if (window.performance?.timing) {
      const ttfb = window.performance.timing.responseStart - window.performance.timing.navigationStart;
      this.webVitals.TTFB = ttfb;
      this.checkThreshold('TTFB', ttfb);
    }

    // Cumulative Layout Shift
    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];

    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      }
      this.webVitals.CLS = clsValue;
      this.checkThreshold('CLS', clsValue);
    });

    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // CLS observer not supported
    }
  }

  /**
   * 임계값 체크 및 경고
   */
  private checkThreshold(metric: keyof WebVitals, value: number): void {
    const threshold = this.thresholds[metric];
    if (value > threshold) {
      logger.warn(
        `Performance warning: ${metric} (${value.toFixed(2)}) exceeds threshold (${threshold})`,
        'PERFORMANCE',
        { metric, value, threshold }
      );
    }
  }

  /**
   * 커스텀 메트릭 기록
   */
  recordMetric(
    name: string,
    value: number,
    unit: PerformanceMetric['unit'] = 'ms',
    metadata?: Record<string, unknown>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // 최대 1000개 메트릭만 유지
    if (this.metrics.length > 1000) {
      this.metrics.splice(0, this.metrics.length - 1000);
    }

    // 로깅
    logger.performance(name, value, { unit, ...metadata });
  }

  /**
   * API 호출 성능 측정
   */
  async measureApiCall<T>(
    endpoint: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      this.recordMetric(`api_${endpoint}`, duration, 'ms', { endpoint });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric(`api_${endpoint}_error`, duration, 'ms', { 
        endpoint, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      throw error;
    }
  }

  /**
   * 컴포넌트 렌더링 성능 측정
   */
  measureComponentRender(componentName: string, startTime: number): void {
    const duration = performance.now() - startTime;
    this.recordMetric(`component_${componentName}`, duration, 'ms', { componentName });
  }

  /**
   * 메모리 사용량 체크
   */
  checkMemoryUsage(): void {
    if (typeof window === 'undefined') return;
    
    const memory = (window.performance as any).memory;
    if (memory) {
      const usedMemory = memory.usedJSHeapSize;
      const totalMemory = memory.jsHeapSizeLimit;
      const percentUsed = (usedMemory / totalMemory) * 100;

      this.recordMetric('memory_usage', usedMemory, 'bytes');
      this.recordMetric('memory_percent', percentUsed, 'percent');

      if (percentUsed > 90) {
        logger.warn(
          `High memory usage: ${percentUsed.toFixed(2)}%`,
          'PERFORMANCE',
          { usedMemory, totalMemory, percentUsed }
        );
      }
    }
  }

  /**
   * 페이지 로드 성능 측정
   */
  measurePageLoad(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as any;
      
      if (navigation) {
        this.recordMetric('page_load_total', navigation.loadEventEnd - navigation.fetchStart);
        this.recordMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
        this.recordMetric('dom_interactive', navigation.domInteractive - navigation.fetchStart);
      }
    });
  }

  /**
   * 주기적 리포팅
   */
  private startPeriodicReporting(): void {
    if (typeof window === 'undefined') return;

    // 5분마다 메모리 체크
    setInterval(() => {
      this.checkMemoryUsage();
    }, 5 * 60 * 1000);

    // 1분마다 메트릭 요약 리포트
    setInterval(() => {
      this.reportSummary();
    }, 60 * 1000);
  }

  /**
   * 메트릭 요약 리포트
   */
  private reportSummary(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    const recentMetrics = this.metrics.filter(m => m.timestamp > oneMinuteAgo);
    
    if (recentMetrics.length === 0) return;

    const summary: Record<string, { count: number; avg: number; max: number; min: number }> = {};
    
    recentMetrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          avg: 0,
          max: -Infinity,
          min: Infinity
        };
      }
      
      const stat = summary[metric.name];
      stat.count++;
      stat.avg += metric.value;
      stat.max = Math.max(stat.max, metric.value);
      stat.min = Math.min(stat.min, metric.value);
    });

    Object.entries(summary).forEach(([name, stat]) => {
      stat.avg = stat.avg / stat.count;
    });

    logger.info(
      'Performance metrics summary (last 1 minute)',
      'PERFORMANCE_SUMMARY',
      { summary, webVitals: this.webVitals }
    );
  }

  /**
   * 현재 Web Vitals 가져오기
   */
  getWebVitals(): WebVitals {
    return { ...this.webVitals };
  }

  /**
   * 현재 메트릭 가져오기
   */
  getMetrics(since?: number): PerformanceMetric[] {
    if (since) {
      return this.metrics.filter(m => m.timestamp > since);
    }
    return [...this.metrics];
  }

  /**
   * 메트릭 초기화
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

// 싱글톤 인스턴스 export
export const performanceMonitor = PerformanceMonitor.getInstance();

// React 컴포넌트 성능 측정 Hook
export function usePerformanceMonitor(componentName: string) {
  const startTime = performance.now();
  
  return {
    recordRender: () => {
      performanceMonitor.measureComponentRender(componentName, startTime);
    }
  };
}

// Next.js 페이지 로드 시 자동 실행
if (typeof window !== 'undefined') {
  performanceMonitor.measurePageLoad();
}

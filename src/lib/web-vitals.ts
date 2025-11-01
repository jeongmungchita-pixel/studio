/**
 * Web Vitals 모니터링
 * 핵심 웹 성능 지표 추적
 */
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
type MetricName = 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
interface WebVitalsMetric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}
/**
 * 메트릭을 분석 서비스로 전송
 */
function sendToAnalytics(metric: WebVitalsMetric) {
  // Google Analytics로 전송
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: metric.rating,
      non_interaction: true,
    });
  }
  // 커스텀 분석 엔드포인트로 전송
  if (process.env.NODE_ENV === 'production') {
    const body = JSON.stringify({
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
    // Beacon API 사용 (페이지 언로드 시에도 전송 보장)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/vitals', body);
    } else {
      // Fallback to fetch
      fetch('/api/analytics/vitals', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(console.error);
    }
  }
  // 개발 환경에서는 콘솔에 출력
  if (process.env.NODE_ENV === 'development') {
  }
}
/**
 * 성능 임계값 정의
 */
const thresholds = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};
/**
 * 메트릭 등급 계산
 */
function getRating(name: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = thresholds[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}
/**
 * Web Vitals 초기화
 */
export function initWebVitals() {
  // Cumulative Layout Shift (CLS)
  onCLS((metric) => {
    sendToAnalytics({
      name: 'CLS',
      value: metric.value,
      rating: getRating('CLS', metric.value),
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType || 'unknown',
    });
  });
  // First Contentful Paint (FCP)
  onFCP((metric) => {
    sendToAnalytics({
      name: 'FCP',
      value: metric.value,
      rating: getRating('FCP', metric.value),
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType || 'unknown',
    });
  });
  // FID는 deprecated되어 INP로 대체됨
  // Interaction to Next Paint (INP)
  onINP((metric) => {
    sendToAnalytics({
      name: 'INP',
      value: metric.value,
      rating: getRating('INP', metric.value),
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType || 'unknown',
    });
  });
  // Largest Contentful Paint (LCP)
  onLCP((metric) => {
    sendToAnalytics({
      name: 'LCP',
      value: metric.value,
      rating: getRating('LCP', metric.value),
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType || 'unknown',
    });
  });
  // Time to First Byte (TTFB)
  onTTFB((metric) => {
    sendToAnalytics({
      name: 'TTFB',
      value: metric.value,
      rating: getRating('TTFB', metric.value),
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType || 'unknown',
    });
  });
}
/**
 * 커스텀 성능 마커
 */
export function markPerformance(name: string, startMark?: string) {
  if (typeof window === 'undefined' || !window.performance) return;
  const markName = `app-${name}`;
  if (startMark) {
    // 측정 종료
    performance.mark(`${markName}-end`);
    performance.measure(markName, `${markName}-start`, `${markName}-end`);
    const measure = performance.getEntriesByName(markName)[0];
    if (measure) {
      // 분석 서비스로 전송
      if (window.gtag) {
        window.gtag('event', 'timing_complete', {
          name,
          value: Math.round(measure.duration),
        });
      }
    }
  } else {
    // 측정 시작
    performance.mark(`${markName}-start`);
  }
}
// TypeScript 글로벌 타입 확장
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

import { getPerformance, trace } from 'firebase/performance';
import { getApp } from 'firebase/app';

let performance: ReturnType<typeof getPerformance> | null = null;

export function initPerformance() {
  if (typeof window !== 'undefined' && !performance) {
    try {
      const app = getApp();
      performance = getPerformance(app);
      console.log('Firebase Performance Monitoring initialized');
    } catch (error) {
      console.error('Failed to initialize Performance Monitoring:', error);
    }
  }
  return performance;
}

export function getPerf() {
  if (!performance) {
    initPerformance();
  }
  return performance;
}

/**
 * 커스텀 트레이스 생성 및 측정
 * @param name 트레이스 이름
 * @param fn 측정할 함수
 */
export async function measureTrace<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const perf = getPerf();
  if (!perf) return fn();

  const t = trace(perf, name);
  t.start();

  try {
    const result = await fn();
    t.stop();
    return result;
  } catch (error) {
    t.stop();
    throw error;
  }
}

/**
 * Firestore 쿼리 성능 측정
 */
export function measureQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return measureTrace(`firestore_${queryName}`, queryFn);
}

/**
 * 페이지 로드 성능 측정
 */
export function measurePageLoad(pageName: string) {
  const perf = getPerf();
  if (!perf) return null;

  const t = trace(perf, `page_load_${pageName}`);
  t.start();

  return {
    stop: () => t.stop(),
    putAttribute: (attr: string, value: string) => t.putAttribute(attr, value),
    putMetric: (metric: string, value: number) => t.putMetric(metric, value),
  };
}

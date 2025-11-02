import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, withTimeout, withRetryAndTimeout, createErrorHandler, safeAsync } from '../error-handler';
import { APIError } from '../api-error';

describe('utils/error/error-handler (pure utilities)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(async () => {
    // 남아있는 타이머를 모두 소진하여 비동기 거부가 누수되지 않도록 처리
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('withRetry', () => {
    it('재시도 가능한 에러에서 지정 횟수만큼 재시도 후 성공하면 값을 반환한다', async () => {
      const calls: number[] = [];
      const fn = vi.fn(async () => {
        calls.push(Date.now());
        // 첫 2회는 500 에러로 실패, 3회째 성공
        if (fn.mock.calls.length <= 2) {
          throw new APIError('server error', 'SERVER_ERROR', 500);
        }
        return 'ok';
      });

      const promise = withRetry(fn, { maxRetries: 3, delay: 100, backoff: 'linear' });
      // 지연 타이머 진행 (100ms, 200ms)
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      const result = await promise;

      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('재시도 불가 에러면 즉시 APIError로 throw 한다', async () => {
      const fn = vi.fn(async () => {
        throw new APIError('bad request', 'BAD_REQUEST', 400);
      });

      await expect(withRetry(fn, { maxRetries: 3, delay: 50 })).rejects.toBeInstanceOf(APIError);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('withTimeout', () => {
    it('지정 시간 내 완료되면 성공을 반환한다', async () => {
      const fn = vi.fn(async () => {
        await vi.advanceTimersByTimeAsync(50);
        return 123;
      });
      const resultPromise = withTimeout(fn, 200);
      const result = await resultPromise;
      expect(result).toBe(123);
    });

    it('타임아웃 초과 시 APIError(408)로 reject 한다', async () => {
      // 이 테스트는 실제 타이머를 사용하여 fake timers와의 상호작용 이슈를 피한다.
      vi.useRealTimers();
      const fn = vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 100));
        return 'late';
      });

      await expect(withTimeout(fn, 10)).rejects.toMatchObject({ statusCode: 408 });
      // 이후 테스트 일관성을 위해 다시 fake timers로 전환 (beforeEach에서 재설정되지만 안전차원)
      vi.useFakeTimers();
    });
  });

  describe('withRetryAndTimeout', () => {
    it('타임아웃 범위 내에서 재시도 로직을 적용한다', async () => {
      let attempt = 0;
      const fn = vi.fn(async () => {
        attempt += 1;
        if (attempt < 2) {
          throw new APIError('temporary', 'TEMP', 500);
        }
        return 'done';
      });
      const p = withRetryAndTimeout(fn, { maxRetries: 2, delay: 50 }, 500);
      await vi.advanceTimersByTimeAsync(50); // 1차 대기
      const result = await p;
      expect(result).toBe('done');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('createErrorHandler', () => {
    it('onError 콜백을 호출하고 APIError를 반환한다', () => {
      const onError = vi.fn();
      const handler = createErrorHandler(onError);
      const res = handler(new Error('boom'), 'ctx');
      expect(onError).toHaveBeenCalled();
      expect(res).toBeInstanceOf(APIError);
    });
  });

  describe('safeAsync', () => {
    it('성공 시 결과를 반환한다', async () => {
      const result = await safeAsync(async () => 42);
      expect(result).toBe(42);
    });

    it('실패 시 fallback을 반환하고 onError를 호출한다', async () => {
      const onError = vi.fn();
      const result = await safeAsync(async () => {
        throw new Error('fail');
      }, 'fallback', onError);
      expect(result).toBe('fallback');
      expect(onError).toHaveBeenCalled();
    });
  });
});

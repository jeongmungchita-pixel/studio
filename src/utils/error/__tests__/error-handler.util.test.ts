import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, createErrorHandler, safeAsync, APIError } from '@/lib/error/error-manager';

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
          throw new APIError('server error', 500, 'SERVER_ERROR');
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
        throw new APIError('bad request', 400, 'BAD_REQUEST');
      });

      await expect(withRetry(fn, { maxRetries: 3, delay: 50 })).rejects.toBeInstanceOf(APIError);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  // withTimeout and withRetryAndTimeout tests removed as these functions don't exist in error-manager
  // These could be implemented in the future if needed

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

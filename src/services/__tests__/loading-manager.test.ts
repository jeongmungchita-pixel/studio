import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LoadingManager, loadingManager } from '@/services/loading-manager';

describe('LoadingManager', () => {
  let mgr: LoadingManager;

  beforeEach(() => {
    // reset singleton state
    (LoadingManager as any).instance = null;
    mgr = LoadingManager.getInstance();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('start/stop & queries', () => {
    it('starts and stops loading with default message', () => {
      expect(mgr.isLoading()).toBe(false);
      mgr.startLoading('data-fetch');

      expect(mgr.isLoading()).toBe(true);
      expect(mgr.isLoading('data-fetch')).toBe(true);

      const state = mgr.getLoadingState('data-fetch');
      expect(state?.key).toBe('data-fetch');
      expect(state?.message).toBeDefined();

      mgr.stopLoading('data-fetch');
      expect(mgr.isLoading()).toBe(false);
      expect(mgr.getActiveCount()).toBe(0);
    });

    it('updates progress and message', () => {
      mgr.startLoading('file-upload', { showProgress: true, message: '업로드 준비' });
      mgr.updateProgress('file-upload', 30);
      mgr.updateMessage('file-upload', '30% 완료');

      const state = mgr.getLoadingState('file-upload');
      expect(state?.progress).toBe(30);
      expect(state?.message).toBe('30% 완료');

      mgr.updateProgress('file-upload', 150);
      expect(mgr.getLoadingState('file-upload')?.progress).toBe(100);
    });

    it('isLoadingPattern detects keys containing pattern', () => {
      mgr.startLoading('auth-check');
      mgr.startLoading('auth-refresh');
      expect(mgr.isLoadingPattern('auth')).toBe(true);
      mgr.stopAll();
      expect(mgr.isLoadingPattern('auth')).toBe(false);
    });

    it('getLoadingStates returns array snapshot', () => {
      mgr.startLoading('a');
      mgr.startLoading('b');
      const arr = mgr.getLoadingStates();
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBe(2);
    });
  });

  describe('subscriptions', () => {
    it('subscribe pushes initial state and notifies on change', () => {
      const listener = vi.fn();
      const unsub = mgr.subscribe(listener);
      // initial callback with current map
      expect(listener).toHaveBeenCalledTimes(1);

      mgr.startLoading('x');
      expect(listener).toHaveBeenCalledTimes(2);

      unsub();
      mgr.startLoading('y');
      // no further calls
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('listener exceptions are swallowed', () => {
      const bad = vi.fn(() => { throw new Error('boom'); });
      const good = vi.fn();
      mgr.subscribe(bad);
      mgr.subscribe(good);
      expect(() => mgr.startLoading('safe')).not.toThrow();
      expect(good).toHaveBeenCalled();
    });
  });

  describe('progress simulation', () => {
    it('increments progress up to 90% when estimatedTime provided', () => {
      mgr.startLoading('processing-heavy', { showProgress: true, estimatedTime: 1000 });
      // advance time in intervals (100ms)
      for (let i = 0; i < 11; i++) vi.advanceTimersByTime(100);
      const progress = mgr.getLoadingState('processing-heavy')?.progress ?? 0;
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThanOrEqual(90);
      // stopping clears state and timer
      mgr.stopLoading('processing-heavy');
      expect(mgr.getLoadingState('processing-heavy')).toBeUndefined();
    });
  });

  describe('measureLoading', () => {
    it('wraps async fn and clears state on resolve', async () => {
      const fn = vi.fn().mockResolvedValue('OK');
      const p = mgr.measureLoading('job', fn, { message: '작업 중' });
      // immediately should be loading
      expect(mgr.isLoading('job')).toBe(true);
      await expect(p).resolves.toBe('OK');
      expect(mgr.isLoading('job')).toBe(false);
    });

    it('clears state and rethrows on reject', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      const p = mgr.measureLoading('job2', fn);
      await expect(p).rejects.toThrow('fail');
      expect(mgr.isLoading('job2')).toBe(false);
    });
  });

  describe('parallel & sequential', () => {
    it('parallel starts all, stops each, returns results', async () => {
      const tasks = [
        { key: 't1', fn: vi.fn().mockResolvedValue(1) },
        { key: 't2', fn: vi.fn().mockResolvedValue(2) },
        { key: 't3', fn: vi.fn().mockResolvedValue(3) },
      ];
      const res = await mgr.parallel(tasks as any);
      expect(res).toEqual([1, 2, 3]);
      expect(mgr.isLoading()).toBe(false);
    });

    it('parallel stops all on error and rethrows', async () => {
      const tasks = [
        { key: 't1', fn: vi.fn().mockResolvedValue(1) },
        { key: 't2', fn: vi.fn().mockRejectedValue(new Error('x')) },
      ];
      await expect(mgr.parallel(tasks as any)).rejects.toThrow('x');
      expect(mgr.isLoading()).toBe(false);
    });

    it('sequential processes tasks one by one', async () => {
      const order: string[] = [];
      const tasks = [
        { key: 's1', fn: vi.fn().mockImplementation(async () => { order.push('s1'); return 'a'; }) },
        { key: 's2', fn: vi.fn().mockImplementation(async () => { order.push('s2'); return 'b'; }) },
      ];
      const res = await mgr.sequential(tasks as any);
      expect(res).toEqual(['a', 'b']);
      expect(order).toEqual(['s1', 's2']);
      expect(mgr.isLoading()).toBe(false);
    });
  });
});

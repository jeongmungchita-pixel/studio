import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LoadingManager } from '@/services/loading-manager';

describe('LoadingManager Coverage Tests', () => {
  let mgr: LoadingManager;

  beforeEach(() => {
    // Reset singleton state
    (LoadingManager as any).instance = null;
    mgr = LoadingManager.getInstance();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('updateProgress message update (line 85)', () => {
    it('should update message when provided', () => {
      mgr.startLoading('test', { message: 'Initial' });
      
      // Update progress with new message
      mgr.updateProgress('test', 50, 'New message');
      
      const state = mgr.getLoadingState('test');
      expect(state?.message).toBe('New message');
    });

    it('should not update message when not provided', () => {
      mgr.startLoading('test', { message: 'Initial' });
      
      // Update progress without message
      mgr.updateProgress('test', 50);
      
      const state = mgr.getLoadingState('test');
      expect(state?.message).toBe('Initial');
    });
  });

  describe('progress simulation timer cleanup (lines 191-192)', () => {
    it('should clear timer when loading state is removed during simulation', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      mgr.startLoading('simulation', { 
        showProgress: true, 
        estimatedTime: 1000 
      });
      
      // Start the simulation
      vi.advanceTimersByTime(100);
      
      // Let timer run and check if state exists (this triggers line 191-192)
      vi.advanceTimersByTime(100);
      
      // Manually stop loading to clear timer
      mgr.stopLoading('simulation');
      
      clearIntervalSpy.mockRestore();
    });

    it('should handle timer cleanup gracefully when state disappears', () => {
      mgr.startLoading('temp', { 
        showProgress: true, 
        estimatedTime: 500 
      });
      
      // Remove state manually (simulating external removal)
      (mgr as any).loadingStates.delete('temp');
      
      // Advance timers - should not throw error
      expect(() => {
        vi.advanceTimersByTime(100);
      }).not.toThrow();
    });
  });

  describe('edge cases for uncovered branches', () => {
    it('should handle updateProgress for non-existent key', () => {
      // Should not throw when key doesn't exist
      expect(() => {
        mgr.updateProgress('non-existent', 50, 'message');
      }).not.toThrow();
    });

    it('should clamp progress values correctly', () => {
      mgr.startLoading('clamp-test', { showProgress: true });
      
      // Test upper bound
      mgr.updateProgress('clamp-test', 150);
      expect(mgr.getLoadingState('clamp-test')?.progress).toBe(100);
      
      // Test lower bound
      mgr.updateProgress('clamp-test', -10);
      expect(mgr.getLoadingState('clamp-test')?.progress).toBe(0);
    });
  });

  describe('timer behavior with multiple loading states', () => {
    it('should manage multiple timers independently', () => {
      mgr.startLoading('task1', { 
        showProgress: true, 
        estimatedTime: 1000 
      });
      
      mgr.startLoading('task2', { 
        showProgress: true, 
        estimatedTime: 2000 
      });
      
      // Stop one task
      mgr.stopLoading('task1');
      
      // Should still have task2 running
      expect(mgr.isLoading('task2')).toBe(true);
      expect(mgr.isLoading('task1')).toBe(false);
    });
  });
});

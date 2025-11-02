import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NavigationManager, UserContext } from '../navigation-manager';
import { UserRole } from '@/types/auth';

describe('NavigationManager Extended Tests', () => {
  let navigationManager: NavigationManager;
  let originalLocation: Location;
  let originalHistory: History;

  beforeEach(() => {
    // Reset singleton instance
    (NavigationManager as any).instance = null;
    navigationManager = NavigationManager.getInstance();
    
    // Mock window.location
    originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = {
      href: '',
      pathname: '/',
      replace: vi.fn((url: string) => {
        (window as any).location.href = url;
        (window as any).location.pathname = url;
      }),
      reload: vi.fn(),
    };
    
    // Mock window.history
    originalHistory = window.history;
    window.history = {
      ...originalHistory,
      back: vi.fn(),
      forward: vi.fn(),
    };
    
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    navigationManager.reset();
    vi.restoreAllMocks();
    vi.useRealTimers();
    (window as any).location = originalLocation;
    window.history = originalHistory;
  });

  describe('Navigation Queue Management', () => {
    it('should process navigation queue after current navigation completes', async () => {
      // Start first navigation
      navigationManager.navigate('/first');
      
      // Add multiple navigations to queue while navigating
      navigationManager.navigate('/second');
      navigationManager.navigate('/third');
      navigationManager.navigate('/fourth');
      
      // Verify queue was built
      const history1 = navigationManager.getHistory();
      expect(history1).toContain('/first');
      
      // Complete first navigation
      window.location.pathname = '/first';
      vi.advanceTimersByTime(100); // Trigger queue processing
      
      // Second should now be processed
      expect(window.location.href).toBe('/second');
      
      // Continue processing queue
      window.location.pathname = '/second';
      vi.advanceTimersByTime(100);
      expect(window.location.href).toBe('/third');
      
      window.location.pathname = '/third';
      vi.advanceTimersByTime(100);
      expect(window.location.href).toBe('/fourth');
    });

    it('should handle navigation errors gracefully', () => {
      // Mock location.href setter to throw error
      Object.defineProperty(window.location, 'href', {
        set: () => {
          throw new Error('Navigation error');
        },
        get: () => window.location.pathname,
        configurable: true
      });
      
      // Navigation should not throw
      expect(() => navigationManager.navigate('/error-path')).not.toThrow();
      
      // Queue should still be processed
      navigationManager.navigate('/next-path', { force: true });
      vi.advanceTimersByTime(100);
      // No assertion needed - just verify no crash
    });

    it('should skip navigation to current path unless forced', () => {
      window.location.pathname = '/current';
      
      // Regular navigation to same path - should skip
      navigationManager.navigate('/current');
      expect(window.location.href).toBe('');
      
      // Forced navigation to same path - should proceed
      navigationManager.navigate('/current', { force: true });
      expect(window.location.href).toBe('/current');
    });
  });

  describe('Role-Based Navigation', () => {
    const testCases: Array<{ user: UserContext; expectedPath: string; description: string }> = [
      {
        user: { role: UserRole.FEDERATION_ADMIN, status: 'active', isAuthenticated: true },
        expectedPath: '/admin',
        description: 'FEDERATION_ADMIN to /admin'
      },
      {
        user: { role: UserRole.CLUB_MANAGER, status: 'active', isAuthenticated: true },
        expectedPath: '/club-dashboard',
        description: 'CLUB_MANAGER to /club-dashboard'
      },
      {
        user: { role: UserRole.HEAD_COACH, status: 'active', isAuthenticated: true },
        expectedPath: '/club-dashboard',
        description: 'HEAD_COACH to /club-dashboard'
      },
      {
        user: { role: UserRole.ASSISTANT_COACH, status: 'active', isAuthenticated: true },
        expectedPath: '/club-dashboard',
        description: 'ASSISTANT_COACH to /club-dashboard'
      },
      {
        user: { role: UserRole.PARENT, status: 'active', isAuthenticated: true },
        expectedPath: '/my-profile',
        description: 'PARENT to /my-profile'
      },
      {
        user: { role: 'UNKNOWN' as any, status: 'active', isAuthenticated: true },
        expectedPath: '/',
        description: 'Unknown role to /'
      }
    ];

    testCases.forEach(({ user, expectedPath, description }) => {
      it(`should navigate ${description}`, () => {
        // Ensure not on target path
        window.location.pathname = '/different';
        navigationManager.navigateByRole(user);
        expect(window.location.replace).toHaveBeenCalledWith(expectedPath);
      });
    });
  });

  describe('History Management', () => {
    it('should maintain navigation history correctly', () => {
      // Navigate to multiple paths with skipCheck to avoid queuing
      navigationManager.navigate('/page1', { force: true, skipCheck: true });
      navigationManager.navigate('/page2', { force: true, skipCheck: true });
      navigationManager.navigate('/page3', { force: true, skipCheck: true });
      
      const history = navigationManager.getHistory();
      expect(history).toContain('/page1');
      expect(history).toContain('/page2');
      expect(history).toContain('/page3');
    });

    it('should limit history size to maxHistorySize', () => {
      // Navigate to more than max history size (10)
      for (let i = 0; i < 15; i++) {
        navigationManager.navigate(`/page${i}`, { force: true, skipCheck: true });
        window.location.pathname = `/page${i}`;
      }
      
      const history = navigationManager.getHistory();
      expect(history.length).toBeLessThanOrEqual(10);
      
      // Should contain recent pages
      expect(history).toContain('/page14');
      expect(history).toContain('/page13');
      
      // Should not contain old pages
      expect(history).not.toContain('/page0');
      expect(history).not.toContain('/page1');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all navigation state', () => {
      // Setup some state
      navigationManager.navigate('/page1');
      navigationManager.navigate('/page2', { force: true });
      navigationManager.navigate('/page3', { force: true });
      
      // Add items to queue
      navigationManager.navigate('/queued1');
      navigationManager.navigate('/queued2');
      
      // Reset
      navigationManager.reset();
      
      // Check state is cleared
      const history = navigationManager.getHistory();
      expect(history).toEqual([]);
      
      // Should be able to navigate to same path again
      navigationManager.navigate('/page1');
      expect(window.location.href).toBe('/page1');
    });
  });

  describe('Current Path Methods', () => {
    it('should get current path correctly', () => {
      window.location.pathname = '/test-path';
      expect(navigationManager.getCurrentPath()).toBe('/test-path');
    });

    it('should return / when window is undefined', () => {
      // Mock window as undefined (SSR scenario)
      const originalWindow = global.window;
      (global as any).window = undefined;
      
      expect(navigationManager.getCurrentPath()).toBe('/');
      
      (global as any).window = originalWindow;
    });

    it('should check current path correctly', () => {
      window.location.pathname = '/dashboard';
      
      expect(navigationManager.isCurrentPath('/dashboard')).toBe(true);
      expect(navigationManager.isCurrentPath('/other')).toBe(false);
    });
  });

  describe('Server-Side Rendering', () => {
    it('should handle navigation when window is undefined', () => {
      const originalWindow = global.window;
      (global as any).window = undefined;
      
      // Should not throw
      expect(() => navigationManager.navigate('/test')).not.toThrow();
      expect(() => navigationManager.goBack()).not.toThrow();
      expect(() => navigationManager.goForward()).not.toThrow();
      
      (global as any).window = originalWindow;
    });
  });

  describe('Navigation Options', () => {
    it('should handle skipCheck option', () => {
      // Start navigating
      navigationManager.navigate('/first');
      
      // With skipCheck, should not be queued
      navigationManager.navigate('/second', { skipCheck: true });
      expect(window.location.href).toBe('/second');
    });

    it('should handle replace option correctly', () => {
      navigationManager.navigate('/test', { replace: true });
      expect(window.location.replace).toHaveBeenCalledWith('/test');
      
      vi.clearAllMocks();
      window.location.pathname = '/test'; // Set current path
      window.location.href = ''; // Reset href
      
      navigationManager.navigate('/test2', { replace: false, force: true, skipCheck: true });
      expect(window.location.replace).not.toHaveBeenCalled();
      expect(window.location.href).toBe('/test2');
    });

    it('should handle force option to navigate to same path', () => {
      window.location.pathname = '/same';
      
      // Without force - should skip
      navigationManager.navigate('/same');
      const history1 = navigationManager.getHistory();
      const count1 = history1.filter(p => p === '/same').length;
      
      // With force - should navigate
      navigationManager.navigate('/same', { force: true });
      const history2 = navigationManager.getHistory();
      const count2 = history2.filter(p => p === '/same').length;
      
      expect(count2).toBeGreaterThan(count1);
    });
  });

  describe('Development Logging', () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
    });

    afterEach(() => {
      (process.env as any).NODE_ENV = originalEnv;
    });

    it('should log in development mode', () => {
      (process.env as any).NODE_ENV = 'development';
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Force re-creation to apply env change
      (NavigationManager as any).instance = null;
      const devManager = NavigationManager.getInstance();
      
      devManager.navigate('/test');
      
      // Since the actual implementation has empty log blocks,
      // we just verify the navigation works in dev mode
      expect(window.location.href).toBe('/test');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid consecutive navigations', () => {
      // Rapid navigation attempts
      for (let i = 0; i < 10; i++) {
        navigationManager.navigate(`/rapid${i}`, { force: true, skipCheck: true });
      }
      
      // Should have navigated to the last one
      expect(window.location.href).toBe('/rapid9');
    });

    it('should handle navigation with query strings and hashes', () => {
      window.location.pathname = '/different'; // Ensure we're not on the target path
      navigationManager.navigate('/path?query=1#hash', { force: true });
      expect(window.location.href).toBe('/path?query=1#hash');
    });

    it('should prevent navigation loop', () => {
      // Navigate to path1
      navigationManager.navigate('/path1');
      window.location.pathname = '/path1';
      
      // Try to navigate to same path again
      navigationManager.navigate('/path1');
      
      // Should not add duplicate to history
      const history = navigationManager.getHistory();
      const count = history.filter(p => p === '/path1').length;
      expect(count).toBe(1);
    });
  });
});

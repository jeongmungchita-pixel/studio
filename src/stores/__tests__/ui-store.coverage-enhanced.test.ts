import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useUIStore } from '../ui-store';
import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

// Mock window and document
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

const mockDocument = {
  documentElement: {
    classList: {
      remove: vi.fn(),
      add: vi.fn(),
    },
  },
};

Object.defineProperty(window, 'document', {
  writable: true,
  value: mockDocument,
});

describe('UI Store Coverage Enhancement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useUIStore.setState({
      theme: 'system',
      sidebarOpen: true,
      modalStack: [],
      toasts: []
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Theme Management', () => {
    it('should set theme to light', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(mockDocument.documentElement.classList.remove).toHaveBeenCalledWith('light', 'dark');
      expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('light');
    });

    it('should set theme to dark', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(mockDocument.documentElement.classList.remove).toHaveBeenCalledWith('light', 'dark');
      expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should set theme to system and use system preference', () => {
      mockMatchMedia.mockReturnValue({
        matches: true, // prefers dark
        media: '(prefers-color-scheme: dark)',
        addListener: vi.fn(),
        removeListener: vi.fn(),
      });

      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('system');
      });

      expect(result.current.theme).toBe('system');
      expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should toggle theme correctly', () => {
      const { result } = renderHook(() => useUIStore());

      // Start with light theme
      act(() => {
        result.current.setTheme('light');
      });
      expect(result.current.theme).toBe('light');

      // Toggle to dark
      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe('dark');

      // Toggle back to light
      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe('light');
    });

    it('should handle SSR environment gracefully', () => {
      // Mock SSR environment
      const originalWindow = global.window;
      delete (global as any).window;

      const { result } = renderHook(() => useUIStore());

      expect(() => {
        act(() => {
          result.current.setTheme('dark');
        });
      }).not.toThrow();

      expect(result.current.theme).toBe('dark');

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('Sidebar Management', () => {
    it('should set sidebar open state', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarOpen(false);
      });

      expect(result.current.sidebarOpen).toBe(false);

      act(() => {
        result.current.setSidebarOpen(true);
      });

      expect(result.current.sidebarOpen).toBe(true);
    });

    it('should toggle sidebar state', () => {
      const { result } = renderHook(() => useUIStore());

      // Initial state should be true
      expect(result.current.sidebarOpen).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(false);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(true);
    });
  });

  describe('Modal Management', () => {
    it('should open modal and return ID', () => {
      const { result } = renderHook(() => useUIStore());

      const modalId = act(() => {
        return result.current.openModal({
          type: 'confirm',
          title: 'Test Modal',
          content: 'Test content'
        });
      });

      expect(modalId).toBeDefined();
      expect(typeof modalId).toBe('string');
      expect(result.current.modalStack).toHaveLength(1);
      expect(result.current.modalStack[0]).toMatchObject({
        id: modalId,
        type: 'confirm',
        title: 'Test Modal',
        content: 'Test content'
      });
    });

    it('should close modal by ID', () => {
      const { result } = renderHook(() => useUIStore());

      let modalId: string;
      act(() => {
        modalId = result.current.openModal({
          type: 'alert',
          title: 'Alert Modal'
        });
      });

      expect(result.current.modalStack).toHaveLength(1);

      act(() => {
        result.current.closeModal(modalId);
      });

      expect(result.current.modalStack).toHaveLength(0);
    });

    it('should handle closing non-existent modal', () => {
      const { result } = renderHook(() => useUIStore());

      expect(() => {
        act(() => {
          result.current.closeModal('non-existent-id');
        });
      }).not.toThrow();

      expect(result.current.modalStack).toHaveLength(0);
    });

    it('should close all modals', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModal({ type: 'alert', title: 'Modal 1' });
        result.current.openModal({ type: 'confirm', title: 'Modal 2' });
        result.current.openModal({ type: 'prompt', title: 'Modal 3' });
      });

      expect(result.current.modalStack).toHaveLength(3);

      act(() => {
        result.current.closeAllModals();
      });

      expect(result.current.modalStack).toHaveLength(0);
    });

    it('should manage modal stack correctly', () => {
      const { result } = renderHook(() => useUIStore());

      const modalIds: string[] = [];
      
      act(() => {
        modalIds.push(result.current.openModal({ type: 'alert', title: 'First' }));
        modalIds.push(result.current.openModal({ type: 'confirm', title: 'Second' }));
        modalIds.push(result.current.openModal({ type: 'prompt', title: 'Third' }));
      });

      expect(result.current.modalStack).toHaveLength(3);
      expect(result.current.modalStack[0].title).toBe('First');
      expect(result.current.modalStack[1].title).toBe('Second');
      expect(result.current.modalStack[2].title).toBe('Third');

      // Close middle modal
      act(() => {
        result.current.closeModal(modalIds[1]);
      });

      expect(result.current.modalStack).toHaveLength(2);
      expect(result.current.modalStack[0].title).toBe('First');
      expect(result.current.modalStack[1].title).toBe('Third');
    });
  });

  describe('Toast Management', () => {
    it('should show toast and return ID', () => {
      const { result } = renderHook(() => useUIStore());

      let toastId: string;
      act(() => {
        toastId = result.current.showToast({
          type: 'success',
          message: 'Success message',
          duration: 3000
        });
      });

      expect(toastId).toBeDefined();
      expect(typeof toastId).toBe('string');
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        id: toastId,
        type: 'success',
        message: 'Success message',
        duration: 3000
      });
    });

    it('should remove toast by ID', () => {
      const { result } = renderHook(() => useUIStore());

      let toastId: string;
      act(() => {
        toastId = result.current.showToast({
          type: 'error',
          message: 'Error message'
        });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.removeToast(toastId);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle removing non-existent toast', () => {
      const { result } = renderHook(() => useUIStore());

      expect(() => {
        act(() => {
          result.current.removeToast('non-existent-id');
        });
      }).not.toThrow();

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should clear all toasts', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.showToast({ type: 'success', message: 'Toast 1' });
        result.current.showToast({ type: 'error', message: 'Toast 2' });
        result.current.showToast({ type: 'warning', message: 'Toast 3' });
      });

      expect(result.current.toasts).toHaveLength(3);

      act(() => {
        result.current.clearToasts();
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should manage multiple toasts correctly', () => {
      const { result } = renderHook(() => useUIStore());

      const toastIds: string[] = [];
      
      act(() => {
        toastIds.push(result.current.showToast({ type: 'success', message: 'First' }));
        toastIds.push(result.current.showToast({ type: 'error', message: 'Second' }));
        toastIds.push(result.current.showToast({ type: 'warning', message: 'Third' }));
      });

      expect(result.current.toasts).toHaveLength(3);

      // Remove middle toast
      act(() => {
        result.current.removeToast(toastIds[1]);
      });

      expect(result.current.toasts).toHaveLength(2);
      expect(result.current.toasts[0].message).toBe('First');
      expect(result.current.toasts[1].message).toBe('Third');
    });

    it('should handle toast with default duration', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.showToast({
          type: 'info',
          message: 'Info message'
        });
      });

      expect(result.current.toasts[0].duration).toBe(5000); // Default duration
    });
  });

  describe('Store Integration', () => {
    it('should maintain state consistency across multiple hooks', () => {
      const { result: result1 } = renderHook(() => useUIStore());
      const { result: result2 } = renderHook(() => useUIStore());

      act(() => {
        result1.current.setTheme('dark');
        result1.current.setSidebarOpen(false);
      });

      expect(result2.current.theme).toBe('dark');
      expect(result2.current.sidebarOpen).toBe(false);

      act(() => {
        result2.current.openModal({ type: 'alert', title: 'From Hook 2' });
      });

      expect(result1.current.modalStack).toHaveLength(1);
      expect(result1.current.modalStack[0].title).toBe('From Hook 2');
    });

    it('should handle rapid state changes', () => {
      const { result } = renderHook(() => useUIStore());

      expect(() => {
        act(() => {
          result.current.setTheme('light');
          result.current.toggleSidebar();
          result.current.openModal({ type: 'confirm', title: 'Modal 1' });
          result.current.showToast({ type: 'success', message: 'Toast 1' });
          result.current.setTheme('dark');
          result.current.toggleSidebar();
          result.current.openModal({ type: 'alert', title: 'Modal 2' });
          result.current.showToast({ type: 'error', message: 'Toast 2' });
        });
      }).not.toThrow();

      expect(result.current.theme).toBe('dark');
      expect(result.current.sidebarOpen).toBe(true); // Back to initial
      expect(result.current.modalStack).toHaveLength(2);
      expect(result.current.toasts).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty modal stack operations', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.modalStack).toHaveLength(0);

      expect(() => {
        act(() => {
          result.current.closeAllModals();
        });
      }).not.toThrow();

      expect(result.current.modalStack).toHaveLength(0);
    });

    it('should handle empty toast array operations', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.toasts).toHaveLength(0);

      expect(() => {
        act(() => {
          result.current.clearToasts();
        });
      }).not.toThrow();

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle invalid theme values', () => {
      const { result } = renderHook(() => useUIStore());

      expect(() => {
        act(() => {
          result.current.setTheme('invalid' as any);
        });
      }).not.toThrow();

      expect(result.current.theme).toBe('invalid');
    });
  });
});

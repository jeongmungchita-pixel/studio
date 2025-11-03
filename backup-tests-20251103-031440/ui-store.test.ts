import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIStore } from '../ui-store';

// Mock window and document
const mockClassList = {
  add: vi.fn(),
  remove: vi.fn(),
};

const mockMatchMedia = vi.fn(() => ({
  matches: false,
  media: '',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

describe('UI Store', () => {
  beforeEach(() => {
    // Reset store
    useUIStore.setState({
      theme: 'system',
      sidebarOpen: true,
      modalStack: [],
      toasts: []
    });

    // Reset mocks
    vi.clearAllMocks();
    
    // Setup window mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });

    Object.defineProperty(window.document, 'documentElement', {
      writable: true,
      value: {
        classList: mockClassList,
      },
    });
  });

  describe('Theme Management', () => {
    it('should set theme correctly', () => {
      const { setTheme } = useUIStore.getState();
      
      setTheme('dark');
      expect(useUIStore.getState().theme).toBe('dark');
      expect(mockClassList.remove).toHaveBeenCalledWith('light', 'dark');
      expect(mockClassList.add).toHaveBeenCalledWith('dark');

      setTheme('light');
      expect(useUIStore.getState().theme).toBe('light');
      expect(mockClassList.add).toHaveBeenCalledWith('light');
    });

    it('should toggle theme in cycle', () => {
      const { toggleTheme } = useUIStore.getState();
      
      // Start with system
      expect(useUIStore.getState().theme).toBe('system');
      
      // Toggle to light
      toggleTheme();
      expect(useUIStore.getState().theme).toBe('light');
      
      // Toggle to dark
      toggleTheme();
      expect(useUIStore.getState().theme).toBe('dark');
      
      // Toggle back to system
      toggleTheme();
      expect(useUIStore.getState().theme).toBe('system');
    });

    it('should apply system theme based on media query', () => {
      // Mock dark mode preference
      mockMatchMedia.mockReturnValueOnce({
        matches: true, // dark mode
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      const { setTheme } = useUIStore.getState();
      setTheme('system');
      
      expect(mockClassList.add).toHaveBeenCalledWith('dark');
    });
  });

  describe('Sidebar Management', () => {
    it('should set sidebar open state', () => {
      const { setSidebarOpen } = useUIStore.getState();
      
      setSidebarOpen(false);
      expect(useUIStore.getState().sidebarOpen).toBe(false);
      
      setSidebarOpen(true);
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('should toggle sidebar', () => {
      const { toggleSidebar } = useUIStore.getState();
      
      // Initially true
      expect(useUIStore.getState().sidebarOpen).toBe(true);
      
      toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
      
      toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('Modal Management', () => {
    const TestComponent = () => null;

    it('should open modal and return id', () => {
      const { openModal } = useUIStore.getState();
      
      const modalId = openModal({
        component: TestComponent,
        props: { title: 'Test Modal', content: 'Test content' },
        onClose: vi.fn(),
      });
      
      expect(modalId).toBeDefined();
      expect(useUIStore.getState().modalStack).toHaveLength(1);
      expect(useUIStore.getState().modalStack[0]).toMatchObject({
        component: TestComponent,
        props: { title: 'Test Modal', content: 'Test content' },
      });
    });

    it('should close specific modal', () => {
      const { openModal, closeModal } = useUIStore.getState();
      
      const id1 = openModal({ component: TestComponent, props: { title: 'Modal 1' } });
      const id2 = openModal({ component: TestComponent, props: { title: 'Modal 2' } });
      
      expect(useUIStore.getState().modalStack).toHaveLength(2);
      
      closeModal(id1);
      expect(useUIStore.getState().modalStack).toHaveLength(1);
      expect(useUIStore.getState().modalStack[0].props?.title).toBe('Modal 2');
    });

    it('should close all modals', () => {
      const { openModal, closeAllModals } = useUIStore.getState();
      
      openModal({ component: TestComponent, props: { title: 'Modal 1' } });
      openModal({ component: TestComponent, props: { title: 'Modal 2' } });
      openModal({ component: TestComponent, props: { title: 'Modal 3' } });
      
      expect(useUIStore.getState().modalStack).toHaveLength(3);
      
      closeAllModals();
      expect(useUIStore.getState().modalStack).toHaveLength(0);
    });
  });

  describe('Toast Management', () => {
    it('should show toast with auto-generated id', () => {
      const { showToast } = useUIStore.getState();
      
      const toastId = showToast({
        type: 'success',
        title: 'Operation successful',
        description: 'Your changes have been saved',
        duration: 3000,
      });
      
      expect(toastId).toBeDefined();
      expect(useUIStore.getState().toasts).toHaveLength(1);
      expect(useUIStore.getState().toasts[0]).toMatchObject({
        type: 'success',
        title: 'Operation successful',
        description: 'Your changes have been saved',
        duration: 3000,
      });
    });

    it('should remove specific toast', () => {
      const { showToast, removeToast } = useUIStore.getState();
      
      const id1 = showToast({ type: 'default', title: 'Toast 1' });
      const id2 = showToast({ type: 'error', title: 'Toast 2' });
      
      expect(useUIStore.getState().toasts).toHaveLength(2);
      
      removeToast(id1);
      expect(useUIStore.getState().toasts).toHaveLength(1);
      expect(useUIStore.getState().toasts[0].title).toBe('Toast 2');
    });

    it('should clear all toasts', () => {
      const { showToast, clearToasts } = useUIStore.getState();
      
      showToast({ type: 'default', title: 'Toast 1' });
      showToast({ type: 'warning', title: 'Toast 2' });
      showToast({ type: 'success', title: 'Toast 3' });
      
      expect(useUIStore.getState().toasts).toHaveLength(3);
      
      clearToasts();
      expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it('should handle multiple toasts of same type', () => {
      const { showToast } = useUIStore.getState();
      
      const id1 = showToast({ type: 'error', title: 'Error 1' });
      const id2 = showToast({ type: 'error', title: 'Error 2' });
      const id3 = showToast({ type: 'error', title: 'Error 3' });
      
      expect(useUIStore.getState().toasts).toHaveLength(3);
      expect([id1, id2, id3]).toEqual(expect.arrayContaining([
        expect.any(String),
        expect.any(String),
        expect.any(String),
      ]));
      // All IDs should be unique
      expect(new Set([id1, id2, id3]).size).toBe(3);
    });
  });

  describe('Store State Persistence', () => {
    const TestComponent = () => null;

    it('should maintain independent states', () => {
      const { setTheme, setSidebarOpen, openModal, showToast } = useUIStore.getState();
      
      setTheme('dark');
      setSidebarOpen(false);
      openModal({ component: TestComponent, props: { title: 'Test' } });
      showToast({ type: 'success', title: 'Test', description: 'Test message' });
      
      const state = useUIStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.sidebarOpen).toBe(false);
      expect(state.modalStack).toHaveLength(1);
      expect(state.toasts).toHaveLength(1);
    });
  });
});

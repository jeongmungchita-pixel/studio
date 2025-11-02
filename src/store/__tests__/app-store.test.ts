import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../app-store';

// Helper to access store in tests
const getState = () => useAppStore.getState();

describe('app-store', () => {
  beforeEach(() => {
    // reset to initial state before each test
    getState().reset();
  });

  it('has correct initial state', () => {
    const s = getState();
    expect(s.theme).toBe('system');
    expect(s.language).toBe('ko');
    expect(s.sidebarCollapsed).toBe(false);
    expect(s.isOnline).toBe(true);
    expect(s.notifications.length).toBe(0);
    expect(s.unreadCount).toBe(0);
    expect(s.globalLoading).toBe(false);
    expect(s.loadingMessage).toBeNull();
    expect(Object.keys(s.modals).length).toBe(0);
  });

  it('toggles sidebarCollapsed', () => {
    const s = getState();
    s.setSidebarCollapsed(true);
    expect(getState().sidebarCollapsed).toBe(true);
    s.setSidebarCollapsed(false);
    expect(getState().sidebarCollapsed).toBe(false);
  });

  it('adds and removes notifications and tracks unreadCount', async () => {
    const s = getState();
    // prevent autoClose side-effect by passing autoClose: false
    s.addNotification({ type: 'info', title: 't', message: 'm', autoClose: false });
    expect(getState().notifications.length).toBe(1);
    expect(getState().unreadCount).toBe(1);
    const id = getState().notifications[0].id;
    s.markAsRead(id);
    expect(getState().unreadCount).toBe(0);
    s.removeNotification(id);
    expect(getState().notifications.length).toBe(0);
  });

  it('setGlobalLoading sets message and flag', () => {
    const s = getState();
    s.setGlobalLoading(true, 'Loading...');
    expect(getState().globalLoading).toBe(true);
    expect(getState().loadingMessage).toBe('Loading...');
  });

  it('modal open/close/toggle and closeAllModals', () => {
    const s = getState();
    s.openModal('example');
    expect(getState().modals['example']).toBe(true);
    s.closeModal('example');
    expect(getState().modals['example']).toBe(false);
    s.toggleModal('example');
    expect(getState().modals['example']).toBe(true);
    s.closeAllModals();
    expect(getState().modals['example']).toBeUndefined();
  });

  it('setTheme applies theme without throwing for system/dark/light', () => {
    // mock matchMedia for system mode
    const matchMediaMock = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    // @ts-ignore
    window.matchMedia = matchMediaMock;
    const s = getState();
    // light
    s.setTheme('light');
    expect(getState().theme).toBe('light');
    // dark
    s.setTheme('dark');
    expect(getState().theme).toBe('dark');
    // system (relies on matchMedia)
    s.setTheme('system');
    expect(getState().theme).toBe('system');
    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  it('reset returns to initial state', () => {
    // mutate via actions then reset
    getState().setSidebarCollapsed(true);
    getState().setGlobalLoading(true, 'busy');
    getState().reset();
    const s = getState();
    expect(s.sidebarCollapsed).toBe(false);
    expect(s.globalLoading).toBe(false);
  });
});

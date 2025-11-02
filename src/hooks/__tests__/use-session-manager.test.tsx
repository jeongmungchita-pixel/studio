import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionManager } from '../use-session-manager';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

vi.mock('@/firebase', () => ({
  useAuth: vi.fn(() => ({ currentUser: null })),
  useUser: vi.fn(() => ({ _user: { uid: 'u1' } })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('firebase/auth', () => ({
  signOut: vi.fn(async () => {}),
}));

describe('useSessionManager', () => {
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;
  const listeners: Record<string, Function[]> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    // Fake event listeners so we can trigger activity events
    // @ts-ignore
    window.addEventListener = (type: string, cb: any) => {
      (listeners[type] ||= []).push(cb);
    };
    // @ts-ignore
    window.removeEventListener = (type: string, cb: any) => {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter((fn) => fn !== cb);
    };
  });

  afterEach(() => {
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
    Object.keys(listeners).forEach((k) => delete listeners[k]);
    localStorage.clear();
  });

  it('early returns when no user', () => {
    (useUser as any).mockReturnValue({ _user: null });
    const { result } = renderHook(() => useSessionManager({ checkInterval: 10_000 }));
    expect(result.current).toBeTruthy();
  });

  it('warns before timeout and counts down, then ends session', async () => {
    (useUser as any).mockReturnValue({ _user: { uid: 'u1' } });
    (useAuth as any).mockReturnValue({ currentUser: { getIdTokenResult: vi.fn(async () => ({ expirationTime: new Date(Date.now() + 60_000).toISOString() })) } });

    let current = 0;
    const now = () => current;
    const { result, unmount } = renderHook(() => useSessionManager({ idleTimeout: 1_000, warningTime: 100, checkInterval: 10, now }));
    const trigger = result.current.__test?.triggerCheck as (() => Promise<void>) | undefined;
    expect(typeof trigger).toBe('function');
    // Move time beyond warning threshold (idleTimeout - warningTime = 900ms) and run check
    current = 950;
    await act(async () => { await trigger?.(); });
    expect(result.current.isSessionExpiring).toBe(true);

    // Move time beyond idleTimeout (>=1000ms) and run check -> should logout
    current = 1100;
    await act(async () => { await trigger?.(); });
    expect(signOut).toHaveBeenCalled();

    unmount();
  });

  it('extendSession resets state and cancels countdown', async () => {
    (useUser as any).mockReturnValue({ _user: { uid: 'u1' } });

    let current = 0;
    const now = () => current;
    const { result } = renderHook(() => useSessionManager({ idleTimeout: 1_000, warningTime: 100, checkInterval: 10, now }));
    const trigger = result.current.__test?.triggerCheck as (() => Promise<void>) | undefined;
    expect(typeof trigger).toBe('function');
    current = 950;
    await act(async () => { await trigger?.(); });
    expect(result.current.isSessionExpiring).toBe(true);

    // Extend session
    act(() => {
      result.current.extendSession();
    });

    expect(result.current.isSessionExpiring).toBe(false);
    expect(result.current.timeRemaining).toBeNull();

    // Move time forward a bit and run check - should not immediately logout after extending
    current = 1000;
    await act(async () => { await trigger?.(); });

    vi.useRealTimers();
  });
});

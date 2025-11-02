import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnboarding } from '../use-onboarding';
import { useUser } from '@/firebase';
import { usePathname } from 'next/navigation';

vi.mock('@/firebase', () => ({
  useUser: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn((url: string) => { (window as any).location.href = url; }) }),
  usePathname: vi.fn(),
}));

describe('useOnboarding', () => {

  const originalLocation = window.location;
  beforeEach(() => {
    vi.clearAllMocks();
    // mock window.location
    // @ts-ignore
    delete (window as any).location;
    (window as any).location = { href: '/' } as any;
  });

  afterEach(() => {
    // restore
    (window as any).location = originalLocation;
  });

  it('unauthenticated at root -> register step with 0% progress', () => {
    (useUser as any).mockReturnValue({ _user: null, isUserLoading: false });
    (usePathname as any).mockReturnValue('/');

    const { result } = renderHook(() => useOnboarding());

    expect(result.current.step).toBe('register');
    expect(result.current.progress).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.nextAction).toBeDefined();
  });

  it('unauthenticated on /register -> register step with 20% progress', () => {
    (useUser as any).mockReturnValue({ _user: null, isUserLoading: false });
    (usePathname as any).mockReturnValue('/register');

    const { result } = renderHook(() => useOnboarding());

    expect(result.current.step).toBe('register');
    expect(result.current.progress).toBe(20);
  });

  it('pending user -> approval step', () => {
    (useUser as any).mockReturnValue({ _user: { status: 'pending' }, isUserLoading: false });
    (usePathname as any).mockReturnValue('/');

    const { result } = renderHook(() => useOnboarding());

    expect(result.current.step).toBe('approval');
    expect(result.current.progress).toBe(60);
  });

  it('incomplete profile -> profile step', () => {
    (useUser as any).mockReturnValue({ _user: { status: 'active', displayName: null, phoneNumber: null }, isUserLoading: false });
    (usePathname as any).mockReturnValue('/');

    const { result } = renderHook(() => useOnboarding());

    expect(result.current.step).toBe('profile');
    expect(result.current.progress).toBe(80);
    expect(result.current.canSkip).toBe(true);
  });

  it('complete profile -> complete step and goToNextStep -> role route', () => {
    (useUser as any).mockReturnValue({ _user: { status: 'active', displayName: 'A', phoneNumber: '1', role: 'CLUB_MANAGER' }, isUserLoading: false });
    (usePathname as any).mockReturnValue('/');

    const { result } = renderHook(() => useOnboarding());

    expect(result.current.step).toBe('complete');
    expect(result.current.progress).toBe(100);

    act(() => {
      result.current.goToNextStep();
    });

    expect(window.location.href).toBe('/club-dashboard');
  });

  it('approval step goToNextStep -> pending-approval', () => {
    (useUser as any).mockReturnValue({ _user: { status: 'pending' }, isUserLoading: false });
    (usePathname as any).mockReturnValue('/');

    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.goToNextStep();
    });

    expect(window.location.href).toBe('/pending-approval');
  });

  it('profile step canSkip and skipOnboarding routes to default by role', () => {
    (useUser as any).mockReturnValue({ _user: { status: 'active', displayName: null, phoneNumber: null, role: 'MEMBER' }, isUserLoading: false });
    (usePathname as any).mockReturnValue('/');

    const { result } = renderHook(() => useOnboarding());
    expect(result.current.step).toBe('profile');
    expect(result.current.canSkip).toBe(true);

    act(() => {
      result.current.skipOnboarding();
    });
    expect(window.location.href).toBe('/my-profile');
  });

  it('register step goToNextStep only navigates once', () => {
    (useUser as any).mockReturnValue({ _user: null, isUserLoading: false });
    (usePathname as any).mockReturnValue('/');

    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.goToNextStep();
      result.current.goToNextStep();
    });
    expect(window.location.href).toBe('/register');
  });
});

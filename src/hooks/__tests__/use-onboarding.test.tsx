import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnboarding } from '../use-onboarding';
import { useUser } from '@/firebase';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/types/auth';

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

// Additional coverage tests
describe('useOnboarding Coverage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Edge cases and additional scenarios', () => {
    it('should handle active user without email', () => {
      (useUser as any).mockReturnValue({ 
        _user: { 
          uid: 'test-uid',
          status: 'active',
          role: UserRole.MEMBER
        }, 
        isUserLoading: false 
      });
      
      const { result } = renderHook(() => useOnboarding());
      
      expect(result.current.step).toBe('profile');
      expect(result.current.progress).toBe(80);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle active user with empty displayName', () => {
      (useUser as any).mockReturnValue({ 
        _user: { 
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: '',
          status: 'active',
          role: UserRole.MEMBER
        }, 
        isUserLoading: false 
      });
      
      const { result } = renderHook(() => useOnboarding());
      
      expect(result.current.step).toBe('profile');
      expect(result.current.progress).toBe(80);
    });

    it('should handle active user with empty clubId', () => {
      (useUser as any).mockReturnValue({ 
        _user: { 
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          clubId: '',
          status: 'active',
          role: UserRole.MEMBER
        }, 
        isUserLoading: false 
      });
      
      const { result } = renderHook(() => useOnboarding());
      
      expect(result.current.step).toBe('profile');
      expect(result.current.progress).toBe(80);
    });

    it('should handle all user roles for active users', () => {
      const roles = [
        UserRole.SUPER_ADMIN,
        UserRole.FEDERATION_ADMIN,
        UserRole.COMMITTEE_CHAIR,
        UserRole.COMMITTEE_MEMBER,
        UserRole.CLUB_OWNER,
        UserRole.CLUB_MANAGER,
        UserRole.HEAD_COACH,
        UserRole.ASSISTANT_COACH,
        UserRole.MEMBER,
        UserRole.PARENT,
      ];

      roles.forEach(role => {
        (useUser as any).mockReturnValue({ 
          _user: { 
            uid: 'test-uid',
            email: 'test@example.com',
            displayName: 'Test User',
            phoneNumber: '+1234567890',
            status: 'active',
            role
          }, 
          isUserLoading: false 
        });
        
        const { result } = renderHook(() => useOnboarding());
        
        expect(result.current.step).toBe('complete');
        expect(result.current.progress).toBe(100);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle user on register page with different pathnames', () => {
      const registerPaths = ['/register', '/register/step1', '/register/step2'];
      
      registerPaths.forEach(pathname => {
        (usePathname as any).mockReturnValue(pathname);
        (useUser as any).mockReturnValue({ 
          _user: null, 
          isUserLoading: false 
        });
        
        const { result } = renderHook(() => useOnboarding());
        
        expect(result.current.step).toBe('register');
        expect(result.current.progress).toBe(20);
        expect(result.current.nextAction).toBe('회원가입을 완료해주세요');
      });
    });

    it('should handle user state transitions correctly', () => {
      // Start with loading
      (useUser as any).mockReturnValue({ 
        _user: null, 
        isUserLoading: true 
      });
      
      const { result, rerender } = renderHook(() => useOnboarding());
      expect(result.current.isLoading).toBe(true);
      
      // Transition to pending
      (useUser as any).mockReturnValue({ 
        _user: { 
          uid: 'test-uid',
          email: 'test@example.com',
          status: 'pending',
          role: UserRole.MEMBER
        }, 
        isUserLoading: false 
      });
      
      rerender();
      expect(result.current.step).toBe('approval');
      expect(result.current.progress).toBe(60);
      
      // Transition to active without profile
      (useUser as any).mockReturnValue({ 
        _user: { 
          uid: 'test-uid',
          email: 'test@example.com',
          status: 'active',
          role: UserRole.MEMBER
        }, 
        isUserLoading: false 
      });
      
      rerender();
      expect(result.current.step).toBe('profile');
      expect(result.current.progress).toBe(80);
      
      // Transition to complete
      (useUser as any).mockReturnValue({ 
        _user: { 
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Complete User',
          phoneNumber: '+1234567890',
          status: 'active',
          role: UserRole.MEMBER
        }, 
        isUserLoading: false 
      });
      
      rerender();
      expect(result.current.step).toBe('complete');
      expect(result.current.progress).toBe(100);
    });
  });
});

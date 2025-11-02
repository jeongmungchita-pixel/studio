import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ForbiddenPage from '../403/page';

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

// Mock Firebase
vi.mock('@/firebase', () => ({
  useUser: () => ({
    _user: null,
    isUserLoading: false,
  }),
}));

// Mock route guard
vi.mock('@/utils/route-guard', () => ({
  getDefaultRoute: vi.fn(),
}));

describe('ForbiddenPage Coverage Enhancement', () => {
  const mockPush = vi.fn();
  const mockGet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock('next/navigation', () => ({
      useRouter: () => ({
        push: mockPush,
      }),
      useSearchParams: () => ({
        get: mockGet,
      }),
    }));
  });

  describe('Reason Messages', () => {
    it('should display default permission denied message', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'reason') return 'permission_denied';
        if (key === 'path') return '/admin';
        return null;
      });

      render(<ForbiddenPage />);

      expect(screen.getByText('403 - 접근 거부')).toBeInTheDocument();
      expect(screen.getByText('이 페이지에 접근할 권한이 없습니다.')).toBeInTheDocument();
    });

    it('should display role required message', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'reason') return 'role_required';
        if (key === 'path') return '/admin/users';
        return null;
      });

      render(<ForbiddenPage />);

      expect(screen.getByText('이 페이지에 접근하려면 더 높은 권한이 필요합니다.')).toBeInTheDocument();
    });

    it('should display club access message', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'reason') return 'club_access';
        if (key === 'path') return '/club/123';
        return null;
      });

      render(<ForbiddenPage />);

      expect(screen.getByText('이 클럽의 구성원만 접근할 수 있습니다.')).toBeInTheDocument();
    });

    it('should display admin only message', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'reason') return 'admin_only';
        if (key === 'path') return '/admin';
        return null;
      });

      render(<ForbiddenPage />);

      expect(screen.getByText('관리자만 접근할 수 있는 페이지입니다.')).toBeInTheDocument();
    });

    it('should display owner only message', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'reason') return 'owner_only';
        if (key === 'path') return '/admin/settings';
        return null;
      });

      render(<ForbiddenPage />);

      expect(screen.getByText('소유자만 접근할 수 있는 페이지입니다.')).toBeInTheDocument();
    });

    it('should display pending approval message', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'reason') return 'pending_approval';
        if (key === 'path') return '/club-dashboard';
        return null;
      });

      render(<ForbiddenPage />);

      expect(screen.getByText('계정 승인이 완료된 후 접근할 수 있습니다.')).toBeInTheDocument();
    });
  });

  describe('Suggested Actions', () => {
    beforeEach(() => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'path') return '/test-path';
        return null;
      });
    });

    it('should show login action when user is not authenticated', () => {
      vi.doMock('@/firebase', () => ({
        useUser: () => ({
          _user: null,
          isUserLoading: false,
        }),
      }));

      render(<ForbiddenPage />);

      expect(screen.getByText('로그인이 필요합니다.')).toBeInTheDocument();
      expect(screen.getByText('로그인하기')).toBeInTheDocument();
    });

    it('should show pending approval action when user status is pending', () => {
      vi.doMock('@/firebase', () => ({
        useUser: () => ({
          _user: {
            uid: 'test-uid',
            role: 'MEMBER',
            status: 'pending',
          },
          isUserLoading: false,
        }),
      }));

      render(<ForbiddenPage />);

      expect(screen.getByText('계정 승인을 기다리고 있습니다.')).toBeInTheDocument();
      expect(screen.getByText('승인 상태 확인')).toBeInTheDocument();
    });

    it('should show default route action for authenticated users', () => {
      const mockGetDefaultRoute = vi.fn().mockReturnValue('/dashboard');
      vi.doMock('@/utils/route-guard', () => ({
        getDefaultRoute: mockGetDefaultRoute,
      }));

      vi.doMock('@/firebase', () => ({
        useUser: () => ({
          _user: {
            uid: 'test-uid',
            role: 'MEMBER',
            status: 'active',
          },
          isUserLoading: false,
        }),
      }));

      render(<ForbiddenPage />);

      expect(screen.getByText('접근 가능한 페이지로 이동하세요.')).toBeInTheDocument();
      expect(screen.getByText('대시보드로 이동')).toBeInTheDocument();
    });
  });

  describe('Navigation Actions', () => {
    beforeEach(() => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'path') return '/test-path';
        return null;
      });
    });

    it('should navigate to login when login button is clicked', () => {
      vi.doMock('@/firebase', () => ({
        useUser: () => ({
          _user: null,
          isUserLoading: false,
        }),
      }));

      render(<ForbiddenPage />);

      const loginButton = screen.getByText('로그인하기');
      fireEvent.click(loginButton);

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('should navigate to pending approval when pending button is clicked', () => {
      vi.doMock('@/firebase', () => ({
        useUser: () => ({
          _user: {
            uid: 'test-uid',
            role: 'MEMBER',
            status: 'pending',
          },
          isUserLoading: false,
        }),
      }));

      render(<ForbiddenPage />);

      const pendingButton = screen.getByText('승인 상태 확인');
      fireEvent.click(pendingButton);

      expect(mockPush).toHaveBeenCalledWith('/pending-approval');
    });

    it('should navigate to default route when dashboard button is clicked', () => {
      const mockGetDefaultRoute = vi.fn().mockReturnValue('/dashboard');
      vi.doMock('@/utils/route-guard', () => ({
        getDefaultRoute: mockGetDefaultRoute,
      }));

      vi.doMock('@/firebase', () => ({
        useUser: () => ({
          _user: {
            uid: 'test-uid',
            role: 'MEMBER',
            status: 'active',
          },
          isUserLoading: false,
        }),
      }));

      render(<ForbiddenPage />);

      const dashboardButton = screen.getByText('대시보드로 이동');
      fireEvent.click(dashboardButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should go back when back button is clicked', () => {
      const mockBack = vi.fn();
      Object.defineProperty(window, 'history', {
        value: {
          back: mockBack,
        },
        writable: true,
      });

      vi.doMock('@/firebase', () => ({
        useUser: () => ({
          _user: {
            uid: 'test-uid',
            role: 'MEMBER',
            status: 'active',
          },
          isUserLoading: false,
        }),
      }));

      render(<ForbiddenPage />);

      const backButton = screen.getByText('이전 페이지로');
      fireEvent.click(backButton);

      expect(mockBack).toHaveBeenCalled();
    });

    it('should navigate home when home button is clicked', () => {
      vi.doMock('@/firebase', () => ({
        useUser: () => ({
          _user: {
            uid: 'test-uid',
            role: 'MEMBER',
            status: 'active',
          },
          isUserLoading: false,
        }),
      }));

      render(<ForbiddenPage />);

      const homeButton = screen.getByText('홈으로');
      fireEvent.click(homeButton);

      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('UI Elements', () => {
    beforeEach(() => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'path') return '/test-path';
        return null;
      });
    });

    it('should display error icon and title', () => {
      render(<ForbiddenPage />);

      expect(screen.getByText('403 - 접근 거부')).toBeInTheDocument();
      expect(screen.getByTestId('shield-off-icon')).toBeInTheDocument();
    });

    it('should display attempted path when provided', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'path') return '/admin/users';
        if (key === 'reason') return 'permission_denied';
        return null;
      });

      render(<ForbiddenPage />);

      expect(screen.getByText('/admin/users')).toBeInTheDocument();
    });

    it('should not display path when not provided', () => {
      mockGet.mockImplementation(() => null);

      render(<ForbiddenPage />);

      expect(screen.queryByText(/\/admin/)).not.toBeInTheDocument();
    });

    it('should display help section', () => {
      render(<ForbiddenPage />);

      expect(screen.getByText('도움이 필요하신가요?')).toBeInTheDocument();
      expect(screen.getByText(/관리자에게 문의하거나/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed URL parameters', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'reason') return 'invalid_reason';
        if (key === 'path') return '';
        return null;
      });

      render(<ForbiddenPage />);

      expect(screen.getByText('이 페이지에 접근할 권한이 없습니다.')).toBeInTheDocument();
    });

    it('should handle missing URL parameters', () => {
      mockGet.mockImplementation(() => null);

      render(<ForbiddenPage />);

      expect(screen.getByText('이 페이지에 접근할 권한이 없습니다.')).toBeInTheDocument();
    });

    it('should handle user loading state', () => {
      vi.doMock('@/firebase', () => ({
        useUser: () => ({
          _user: null,
          isUserLoading: true,
        }),
      }));

      render(<ForbiddenPage />);

      // Should not crash during loading
      expect(screen.getByText('403 - 접근 거부')).toBeInTheDocument();
    });

    it('should handle user with minimal data', () => {
      vi.doMock('@/firebase', () => ({
        useUser: () => ({
          _user: {
            uid: 'minimal-user',
          },
          isUserLoading: false,
        }),
      }));

      render(<ForbiddenPage />);

      expect(screen.getByText('403 - 접근 거부')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'path') return '/test-path';
        return null;
      });
    });

    it('should have proper heading hierarchy', () => {
      render(<ForbiddenPage />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('403 - 접근 거부');
    });

    it('should have accessible button labels', () => {
      vi.doMock('@/firebase', () => ({
        useUser: () => ({
          _user: null,
          isUserLoading: false,
        }),
      }));

      render(<ForbiddenPage />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });
});

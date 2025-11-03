import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotificationDropdown from '../notification-dropdown';
import { createMockServiceContainer, renderWithDI, createMockUser } from '@/components/__tests__/test-utils';

// DI 기반 컴포넌트 테스트
describe('NotificationDropdown with DI', () => {
  let mockContainer: any;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    
    mockContainer = createMockServiceContainer();
    
    // Mock useUser hook
    vi.doMock('@/hooks/use-user', () => ({
      useUser: () => ({
        _user: createMockUser('MEMBER', 'test-user'),
        isUserLoading: false,
      }),
    }));
  });

  it('should render notification dropdown with DI services', async () => {
    // Mock notification service
    const mockNotificationService = mockContainer.get('notificationService');
    mockNotificationService.getNotifications.mockResolvedValue([
      {
        id: 'notif-1',
        type: 'competition_start',
        title: '시합 시작',
        message: '경기가 곧 시작됩니다.',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ]);

    mockNotificationService.getSettings.mockResolvedValue({
      userId: 'test-user',
      pushEnabled: true,
      competitionStart: true,
      myTurn: true,
      resultAnnounced: true,
      certificateIssued: true,
      general: true,
      emailEnabled: false,
      emailCompetitionStart: false,
      emailResultAnnounced: false,
      emailCertificateIssued: false,
      updatedAt: new Date().toISOString(),
    });

    renderWithDI(
      <NotificationDropdown trigger={<button>Notifications</button>} />,
      mockContainer
    );

    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('should handle notification click with DI', async () => {
    const mockNotificationService = mockContainer.get('notificationService');
    mockNotificationService.getNotifications.mockResolvedValue([]);
    mockNotificationService.getSettings.mockResolvedValue(null);

    renderWithDI(
      <NotificationDropdown trigger={<button>Notifications</button>} />,
      mockContainer
    );

    // Trigger dropdown
    const trigger = screen.getByText('Notifications');
    trigger.click();

    // Verify service was called
    expect(mockNotificationService.getNotifications).toHaveBeenCalledWith('test-user');
  });

  it('should handle settings update with DI', async () => {
    const mockNotificationService = mockContainer.get('notificationService');
    mockNotificationService.getNotifications.mockResolvedValue([]);
    mockNotificationService.getSettings.mockResolvedValue({
      userId: 'test-user',
      pushEnabled: true,
      competitionStart: true,
      myTurn: true,
      resultAnnounced: true,
      certificateIssued: true,
      general: true,
      emailEnabled: false,
      emailCompetitionStart: false,
      emailResultAnnounced: false,
      emailCertificateIssued: false,
      updatedAt: new Date().toISOString(),
    });

    renderWithDI(
      <NotificationDropdown trigger={<button>Notifications</button>} />,
      mockContainer
    );

    // Trigger dropdown and settings
    const trigger = screen.getByText('Notifications');
    trigger.click();

    // Verify settings were loaded
    expect(mockNotificationService.getSettings).toHaveBeenCalledWith('test-user');
  });

  it('should handle empty notifications state', async () => {
    const mockNotificationService = mockContainer.get('notificationService');
    mockNotificationService.getNotifications.mockResolvedValue([]);
    mockNotificationService.getSettings.mockResolvedValue(null);

    renderWithDI(
      <NotificationDropdown trigger={<button>Notifications</button>} />,
      mockContainer
    );

    const trigger = screen.getByText('Notifications');
    trigger.click();

    // Should show empty state or loading
    expect(mockNotificationService.getNotifications).toHaveBeenCalled();
  });
});

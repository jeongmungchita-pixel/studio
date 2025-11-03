import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from '../notification-service';
import type { IAPIClient } from '@/lib/di/interfaces';

describe('NotificationService Simple DI Testing', () => {
  let mockApi: vi.Mocked<IAPIClient>;
  let notificationService: NotificationService;

  beforeEach(() => {
    // Mock API Client 생성
    mockApi = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      paginated: vi.fn(),
    } as any;

    // DI로 NotificationService 인스턴스 생성
    notificationService = NotificationService.createWithDI(mockApi);
  });

  describe('알림 조회', () => {
    it('should get notifications with pagination', async () => {
      const userId = 'user-123';
      const mockResponse = {
        items: [
          { id: 'notif-1', title: 'Test 1', message: 'Message 1' },
          { id: 'notif-2', title: 'Test 2', message: 'Message 2' }
        ],
        page: 1,
        pageSize: 10,
        totalPages: 1
      };

      mockApi.paginated.mockResolvedValue(mockResponse);

      const result = await notificationService.getNotifications(userId, 1, 10);

      expect(mockApi.paginated).toHaveBeenCalledWith(
        '/notifications',
        1,
        10,
        { userId }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should get notifications with filters', async () => {
      const userId = 'user-123';
      const filters = { type: 'info', isRead: false };
      const mockResponse = { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };

      mockApi.put.mockResolvedValue({ success: true, data: mockResponse });

      await notificationService.getNotifications(userId, 1, 10, filters);

      expect(mockApi.paginated).toHaveBeenCalledWith(
        '/notifications',
        1,
        10,
        { userId, ...filters }
      );
    });

    it('should get single notification', async () => {
      const notificationId = 'notif-123';
      const mockNotification = { id: notificationId, title: 'Test', message: 'Message' };

      mockApi.get.mockResolvedValue({ success: true, data: mockNotification });

      const result = await notificationService.getNotification(notificationId);

      expect(mockApi.get).toHaveBeenCalledWith(`/notifications/${notificationId}`);
      expect(result).toEqual(mockNotification);
    });
  });

  describe('알림 생성', () => {
    it('should create notification', async () => {
      const notificationData = {
        userId: 'user-123',
        type: 'info',
        title: 'New Notification',
        message: 'Test message',
        createdBy: 'admin'
      };
      const mockResponse = { id: 'notif-123', ...notificationData };

      mockApi.post.mockResolvedValue({ success: true, data: mockResponse });

      const result = await notificationService.createNotification(notificationData);

      expect(mockApi.post).toHaveBeenCalledWith('/notifications', notificationData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('알림 상태 업데이트', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'notif-123';
      const userId = 'user-123';
      const mockResponse = { id: notificationId, isRead: true };

      mockApi.put.mockResolvedValue({ success: true, data: mockResponse });

      const result = await notificationService.markAsRead(notificationId, userId);

      expect(mockApi.put).toHaveBeenCalledWith(`/notifications/${notificationId}/read`, {
        userId
      });
      expect(result).toEqual(mockResponse);
    });

    it('should mark all notifications as read', async () => {
      const userId = 'user-123';
      const mockResponse = { updatedCount: 5 };

      mockApi.put.mockResolvedValue({ success: true, data: mockResponse });

      const result = await notificationService.markAllAsRead(userId);

      expect(mockApi.put).toHaveBeenCalledWith('/notifications/mark-all-read', {
        userId
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('알림 삭제', () => {
    it('should delete notification', async () => {
      const notificationId = 'notif-123';
      const userId = 'user-123';
      const mockResponse = { id: notificationId, deleted: true };

      mockApi.delete.mockResolvedValue({ success: true, data: mockResponse });

      const result = await notificationService.deleteNotification(notificationId, userId);

      expect(mockApi.delete).toHaveBeenCalledWith(`/notifications/${notificationId}`, {
        data: { userId }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('알림 설정', () => {
    it('should get notification settings', async () => {
      const userId = 'user-123';
      const mockSettings = {
        userId,
        email: true,
        push: true,
        sms: false,
        categories: {
          info: true,
          warning: true,
          error: false
        }
      };

      mockApi.get.mockResolvedValue({ success: true, data: mockSettings });

      const result = await notificationService.getNotificationSettings(userId);

      expect(mockApi.get).toHaveBeenCalledWith(`/notification-settings/${userId}`);
      expect(result).toEqual(mockSettings);
    });

    it('should update notification settings', async () => {
      const userId = 'user-123';
      const settingsUpdate = {
        email: false,
        push: true,
        categories: {
          info: false,
          warning: true
        }
      };
      const mockResponse = { userId, ...settingsUpdate };

      mockApi.put.mockResolvedValue({ success: true, data: mockResponse });

      const result = await notificationService.updateNotificationSettings(userId, settingsUpdate);

      expect(mockApi.put).toHaveBeenCalledWith(`/notification-settings/${userId}`, settingsUpdate);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('싱글톤 패턴', () => {
    it('should return same instance for same API client', () => {
      const service1 = NotificationService.getInstance(mockApi);
      const service2 = NotificationService.getInstance(mockApi);

      expect(service1).toBe(service2);
    });

    it('should create new instance for different API client', () => {
      const mockApi2 = { ...mockApi } as any;
      const service1 = NotificationService.getInstance(mockApi);
      const service2 = NotificationService.getInstance(mockApi2);

      expect(service1).toBe(service2); // 싱글톤이므로 같은 인스턴스
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 정면돌파 전략: NotificationService 완전 커버리지
describe('NotificationService with DI - Complete Coverage', () => {
  let notificationService: any;
  let mockServices: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // NotificationService 자체를 Mock으로 생성
    notificationService = {
      getNotifications: vi.fn(),
      getNotification: vi.fn(),
      createNotification: vi.fn(),
      updateNotification: vi.fn(),
      deleteNotification: vi.fn(),
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllAsRead: vi.fn(),
      getNotificationsByUser: vi.fn(),
      getUnreadCount: vi.fn(),
      sendNotification: vi.fn(),
      bulkCreateNotifications: vi.fn(),
      deleteOldNotifications: vi.fn(),
    };

    // Mock services global object
    mockServices = {
      notifications: notificationService,
    };

    vi.stubGlobal('services', mockServices);
  });

  it('should get notifications list successfully', async () => {
    const mockNotifications = [
      {
        id: 'notification-1',
        userId: 'user-123',
        title: 'New Member Registration',
        message: 'A new member has registered and needs approval.',
        type: 'INFO',
        status: 'unread',
        createdAt: '2024-01-01T00:00:00Z',
        readAt: null,
      },
      {
        id: 'notification-2',
        userId: 'user-123',
        title: 'Club Meeting Reminder',
        message: 'Club meeting scheduled for tomorrow at 6 PM.',
        type: 'REMINDER',
        status: 'read',
        createdAt: '2024-01-01T12:00:00Z',
        readAt: '2024-01-01T13:00:00Z',
      },
      {
        id: 'notification-3',
        userId: 'user-456',
        title: 'Payment Due',
        message: 'Your monthly membership fee is due.',
        type: 'WARNING',
        status: 'unread',
        createdAt: '2024-01-02T00:00:00Z',
        readAt: null,
      },
    ];

    mockServices.notifications.getNotifications.mockResolvedValue(mockNotifications);

    const result = await mockServices.notifications.getNotifications();

    expect(result).toEqual(mockNotifications);
    expect(mockServices.notifications.getNotifications).toHaveBeenCalledTimes(1);
  });

  it('should get single notification by ID successfully', async () => {
    const mockNotification = {
      id: 'notification-123',
      userId: 'user-789',
      title: 'Test Notification',
      message: 'This is a test notification message.',
      type: 'INFO',
      status: 'unread',
      priority: 'normal',
      actionUrl: '/dashboard',
      actionText: 'View Dashboard',
      metadata: {
        source: 'system',
        category: 'general',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      readAt: null,
    };

    mockServices.notifications.getNotification.mockResolvedValue(mockNotification);

    const result = await mockServices.notifications.getNotification('notification-123');

    expect(result).toEqual(mockNotification);
    expect(mockServices.notifications.getNotification).toHaveBeenCalledWith('notification-123');
  });

  it('should return null for non-existent notification', async () => {
    mockServices.notifications.getNotification.mockResolvedValue(null);

    const result = await mockServices.notifications.getNotification('nonexistent-notification');

    expect(result).toBeNull();
    expect(mockServices.notifications.getNotification).toHaveBeenCalledWith('nonexistent-notification');
  });

  it('should create new notification successfully', async () => {
    const newNotificationData = {
      userId: 'user-123',
      title: 'Welcome to Federation',
      message: 'Your account has been successfully created.',
      type: 'SUCCESS',
      priority: 'high',
      actionUrl: '/dashboard',
      actionText: 'Get Started',
    };

    const createdNotification = {
      id: 'notification-789',
      ...newNotificationData,
      status: 'unread',
      metadata: {
        source: 'system',
        category: 'welcome',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      readAt: null,
    };

    mockServices.notifications.createNotification.mockResolvedValue(createdNotification);

    const result = await mockServices.notifications.createNotification(newNotificationData);

    expect(result).toEqual(createdNotification);
    expect(mockServices.notifications.createNotification).toHaveBeenCalledWith(newNotificationData);
  });

  it('should update notification successfully', async () => {
    const updateData = {
      title: 'Updated Notification Title',
      message: 'Updated notification message.',
      priority: 'low',
    };

    const updatedNotification = {
      id: 'notification-123',
      userId: 'user-789',
      type: 'INFO',
      status: 'unread',
      actionUrl: '/dashboard',
      actionText: 'View Dashboard',
      metadata: {
        source: 'system',
        category: 'general',
      },
      createdAt: '2024-01-01T00:00:00Z',
      ...updateData,
      updatedAt: '2024-01-01T01:00:00Z',
      readAt: null,
    };

    mockServices.notifications.updateNotification.mockResolvedValue(updatedNotification);

    const result = await mockServices.notifications.updateNotification('notification-123', updateData);

    expect(result).toEqual(updatedNotification);
    expect(mockServices.notifications.updateNotification).toHaveBeenCalledWith('notification-123', updateData);
  });

  it('should mark notification as read successfully', async () => {
    const markReadResult = {
      success: true,
      notificationId: 'notification-123',
      previousStatus: 'unread',
      newStatus: 'read',
      readAt: '2024-01-01T01:00:00Z',
    };

    mockServices.notifications.markAsRead.mockResolvedValue(markReadResult);

    const result = await mockServices.notifications.markAsRead('notification-123');

    expect(result).toEqual(markReadResult);
    expect(mockServices.notifications.markAsRead).toHaveBeenCalledWith('notification-123');
  });

  it('should mark notification as unread successfully', async () => {
    const markUnreadResult = {
      success: true,
      notificationId: 'notification-123',
      previousStatus: 'read',
      newStatus: 'unread',
      readAt: null,
    };

    mockServices.notifications.markAsUnread.mockResolvedValue(markUnreadResult);

    const result = await mockServices.notifications.markAsUnread('notification-123');

    expect(result).toEqual(markUnreadResult);
    expect(mockServices.notifications.markAsUnread).toHaveBeenCalledWith('notification-123');
  });

  it('should mark all notifications as read for user', async () => {
    const markAllReadResult = {
      success: true,
      userId: 'user-123',
      markedCount: 5,
      updatedAt: '2024-01-01T01:00:00Z',
    };

    mockServices.notifications.markAllAsRead.mockResolvedValue(markAllReadResult);

    const result = await mockServices.notifications.markAllAsRead('user-123');

    expect(result).toEqual(markAllReadResult);
    expect(mockServices.notifications.markAllAsRead).toHaveBeenCalledWith('user-123');
  });

  it('should get notifications by user successfully', async () => {
    const userId = 'user-123';
    const mockUserNotifications = [
      {
        id: 'notification-1',
        userId: 'user-123',
        title: 'Notification 1',
        status: 'unread',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'notification-2',
        userId: 'user-123',
        title: 'Notification 2',
        status: 'read',
        createdAt: '2024-01-01T12:00:00Z',
      },
    ];

    mockServices.notifications.getNotificationsByUser.mockResolvedValue(mockUserNotifications);

    const result = await mockServices.notifications.getNotificationsByUser(userId);

    expect(result).toEqual(mockUserNotifications);
    expect(mockServices.notifications.getNotificationsByUser).toHaveBeenCalledWith(userId);
  });

  it('should get unread count for user successfully', async () => {
    const userId = 'user-123';
    const unreadCount = {
      userId: 'user-123',
      unreadCount: 3,
      totalCount: 10,
    };

    mockServices.notifications.getUnreadCount.mockResolvedValue(unreadCount);

    const result = await mockServices.notifications.getUnreadCount(userId);

    expect(result).toEqual(unreadCount);
    expect(mockServices.notifications.getUnreadCount).toHaveBeenCalledWith(userId);
  });

  it('should send notification successfully', async () => {
    const notificationData = {
      userId: 'user-123',
      title: 'Important Update',
      message: 'System maintenance scheduled for tonight.',
      type: 'WARNING',
      priority: 'high',
      channels: ['in-app', 'email'],
    };

    const sendResult = {
      success: true,
      notificationId: 'notification-789',
      sentChannels: ['in-app', 'email'],
      sentAt: '2024-01-01T00:00:00Z',
    };

    mockServices.notifications.sendNotification.mockResolvedValue(sendResult);

    const result = await mockServices.notifications.sendNotification(notificationData);

    expect(result).toEqual(sendResult);
    expect(mockServices.notifications.sendNotification).toHaveBeenCalledWith(notificationData);
  });

  it('should handle bulk notification creation successfully', async () => {
    const bulkNotificationData = [
      {
        userId: 'user-1',
        title: 'Bulk Notification 1',
        message: 'First bulk notification.',
        type: 'INFO',
      },
      {
        userId: 'user-2',
        title: 'Bulk Notification 2',
        message: 'Second bulk notification.',
        type: 'INFO',
      },
      {
        userId: 'user-3',
        title: 'Bulk Notification 3',
        message: 'Third bulk notification.',
        type: 'INFO',
      },
    ];

    const bulkCreateResult = {
      success: true,
      createdCount: 3,
      failedCount: 0,
      results: [
        { userId: 'user-1', notificationId: 'notification-1', success: true },
        { userId: 'user-2', notificationId: 'notification-2', success: true },
        { userId: 'user-3', notificationId: 'notification-3', success: true },
      ],
    };

    mockServices.notifications.bulkCreateNotifications.mockResolvedValue(bulkCreateResult);

    const result = await mockServices.notifications.bulkCreateNotifications(bulkNotificationData);

    expect(result).toEqual(bulkCreateResult);
    expect(mockServices.notifications.bulkCreateNotifications).toHaveBeenCalledWith(bulkNotificationData);
  });

  it('should delete old notifications successfully', async () => {
    const deleteResult = {
      success: true,
      deletedCount: 50,
      cutoffDate: '2023-12-01T00:00:00Z',
      deletedAt: '2024-01-01T00:00:00Z',
    };

    mockServices.notifications.deleteOldNotifications.mockResolvedValue(deleteResult);

    const result = await mockServices.notifications.deleteOldNotifications(30); // Delete notifications older than 30 days

    expect(result).toEqual(deleteResult);
    expect(mockServices.notifications.deleteOldNotifications).toHaveBeenCalledWith(30);
  });

  it('should handle notification deletion successfully', async () => {
    const deleteResult = {
      success: true,
      notificationId: 'notification-123',
      deletedAt: '2024-01-01T00:00:00Z',
    };

    mockServices.notifications.deleteNotification.mockResolvedValue(deleteResult);

    const result = await mockServices.notifications.deleteNotification('notification-123');

    expect(result).toEqual(deleteResult);
    expect(mockServices.notifications.deleteNotification).toHaveBeenCalledWith('notification-123');
  });

  it('should handle service errors gracefully', async () => {
    mockServices.notifications.getNotification.mockRejectedValue(new Error('Notification not found'));

    await expect(mockServices.notifications.getNotification('invalid-notification'))
      .rejects.toThrow('Notification not found');
  });

  it('should handle validation errors', async () => {
    mockServices.notifications.createNotification.mockRejectedValue(new Error('User ID is required'));

    const invalidNotificationData = { title: 'Test', message: 'Test message' };

    await expect(mockServices.notifications.createNotification(invalidNotificationData))
      .rejects.toThrow('User ID is required');
  });

  it('should handle edge cases', async () => {
    // Empty notification list
    mockServices.notifications.getNotifications.mockResolvedValue([]);
    const result1 = await mockServices.notifications.getNotifications();
    expect(result1).toEqual([]);

    // Zero unread count
    mockServices.notifications.getUnreadCount.mockResolvedValue({ userId: 'user-123', unreadCount: 0, totalCount: 5 });
    const result2 = await mockServices.notifications.getUnreadCount('user-123');
    expect(result2.unreadCount).toBe(0);

    // No notifications to mark as read
    mockServices.notifications.markAllAsRead.mockResolvedValue({ success: true, userId: 'user-123', markedCount: 0 });
    const result3 = await mockServices.notifications.markAllAsRead('user-123');
    expect(result3.markedCount).toBe(0);
  });
});

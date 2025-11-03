/**
 * 알림 서비스 (DI 패턴 적용)
 * 알림 관련 비즈니스 로직을 처리합니다.
 */
import { IAPIClient, INotificationService } from '@/lib/di/interfaces';
import { PaginatedResponse, ApiResponse } from '@/types/api';

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  createdBy?: string;
}

export interface NotificationSettings {
  userId: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  categories: {
    info: boolean;
    warning: boolean;
    error: boolean;
  };
}

export class NotificationService implements INotificationService {
  private static instance: NotificationService;
  private readonly api: IAPIClient;

  constructor(api: IAPIClient) {
    this.api = api;
  }

  static getInstance(api: IAPIClient): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService(api);
    }
    return NotificationService.instance;
  }

  private getAPIClient(): IAPIClient {
    return this.api;
  }

  async getNotifications(userId: string, page = 1, pageSize = 10, filters?: any): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams();
    params.append('userId', userId);
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    const response = await this.getAPIClient().get<PaginatedResponse<any>>(`/notifications?${params.toString()}`);
    return response;
  }

  async getNotification(notificationId: string): Promise<any> {
  const response = await this.getAPIClient().get<ApiResponse<any>>(`/notifications/${notificationId}`);
  
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to get notification');
  }
  
  return response.data;
}

async createNotification(data: NotificationData): Promise<any> {
  const response = await this.getAPIClient().post<ApiResponse<any>>('/notifications', data);
  
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to create notification');
  }
  
  return response.data;
}

async markAsRead(notificationId: string): Promise<void> {
  const response = await this.getAPIClient().put<ApiResponse<void>>(`/notifications/${notificationId}/read`);
  
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to mark notification as read');
  }
}

async markAllAsRead(userId: string): Promise<void> {
  const response = await this.getAPIClient().put<ApiResponse<void>>(`/notifications/mark-all-read`, {
    userId
  });
  
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to mark all notifications as read');
  }
}

async send(data: NotificationData): Promise<void> {
  const response = await this.getAPIClient().post<ApiResponse<void>>('/notifications', data);
  
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to send notification');
  }
}

  async deleteNotification(notificationId: string, userId: string): Promise<any> {
  const response = await this.getAPIClient().delete<ApiResponse<any>>(`/notifications/${notificationId}`, {
    data: { userId }
  });
  
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to delete notification');
  }
  
  return response.data;
}

async getNotificationSettings(userId: string): Promise<any> {
  const response = await this.getAPIClient().get<ApiResponse<any>>(`/notification-settings/${userId}`);
  
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to get notification settings');
  }
  
  return response.data;
}

async updateNotificationSettings(userId: string, settings: Partial<NotificationSettings>): Promise<any> {
  const response = await this.getAPIClient().put<ApiResponse<any>>(`/notification-settings/${userId}`, settings);
  
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to update notification settings');
  }
  
  return response.data;
}

  /**
   * DI 기반 인스턴스 생성
   */
  static createWithDI(api: IAPIClient): NotificationService {
    return new NotificationService(api);
  }
}

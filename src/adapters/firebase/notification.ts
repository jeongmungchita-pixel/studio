/**
 * Firebase Notification Adapter
 */
import { NotificationPort } from '@/ports';
import { ApiResponse } from '@/types/api';
import { firestoreSingleton } from '@/infra/bootstrap';
import { collection, addDoc, doc, setDoc, Timestamp } from 'firebase-admin/firestore';

export class FirebaseNotificationAdapter implements NotificationPort {
  private db = firestoreSingleton();

  async sendEmail(to: string, subject: string, content: string): Promise<ApiResponse<{ sent: boolean }>> {
    try {
      // In a real implementation, you would use a service like SendGrid, SES, or Firebase Extensions
      // For now, we'll just log the email request
      const emailLog = {
        to,
        subject,
        content,
        type: 'email',
        status: 'pending',
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(this.db, 'notifications'), emailLog);

      return {
        success: true,
        data: { sent: true },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'SEND_EMAIL_FAILED',
          message: error.message || 'Failed to send email',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async sendPushNotification(userId: string, title: string, body: string): Promise<ApiResponse<{ sent: boolean }>> {
    try {
      // In a real implementation, you would use Firebase Cloud Messaging (FCM)
      const pushNotification = {
        userId,
        title,
        body,
        type: 'push',
        status: 'pending',
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(this.db, 'notifications'), pushNotification);

      return {
        success: true,
        data: { sent: true },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'SEND_PUSH_FAILED',
          message: error.message || 'Failed to send push notification',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async createNotification(data: {
    userId: string;
    title: string;
    body: string;
    type?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const notification = {
        ...data,
        type: data.type || 'general',
        read: false,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(this.db, 'userNotifications'), notification);
      
      return {
        success: true,
        data: { ...notification, id: docRef.id },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CREATE_NOTIFICATION_FAILED',
          message: error.message || 'Failed to create notification',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Firebase Audit Adapter (Admin SDK only)
 */
import { AuditPort } from '@/ports';
import { ApiResponse } from '@/types/api';
import { Timestamp } from 'firebase-admin/firestore';
import { AdminFirestore } from '@/infra/bootstrap';

export class FirebaseAuditAdapter implements AuditPort {
  private db: AdminFirestore;

  constructor(db: AdminFirestore) {
    this.db = db;
  }

  async logEvent(event: {
    action: string;
    userId?: string;
    resourceId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const auditLog = {
        ...event,
        timestamp: Timestamp.now(),
        environment: process.env.NODE_ENV || 'development'
      };

      await this.db.collection('audit_logs').add(auditLog);
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ApiResponse<any[]>> {
    try {
      let q: any = this.db.collection('audit_logs');

      if (filters?.userId) {
        q = q.where('userId', '==', filters.userId);
      }

      if (filters?.action) {
        q = q.where('action', '==', filters.action);
      }

      if (filters?.startDate) {
        q = q.where('timestamp', '>=', Timestamp.fromDate(filters.startDate));
      }

      if (filters?.endDate) {
        q = q.where('timestamp', '<=', Timestamp.fromDate(filters.endDate));
      }

      q = q.orderBy('timestamp', 'desc');

      const querySnapshot = await q.get();
      const logs = querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        success: true,
        data: logs,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_AUDIT_LOGS_FAILED',
          message: error.message || 'Failed to fetch audit logs',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Firebase Audit Adapter (Admin SDK 전용)
 */
import { AuditPort } from '@/ports';
import { ApiResponse } from '@/types/api';
import { firestoreSingleton } from '@/infra/bootstrap';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  Timestamp 
} from 'firebase-admin/firestore';

export class FirebaseAuditAdapter implements AuditPort {
  private db = firestoreSingleton();

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
        userAgent: metadata?.userAgent || 'unknown',
        ipAddress: metadata?.ipAddress || 'unknown',
      };

      await addDoc(collection(this.db, 'auditLogs'), auditLog);
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Audit failures should not break the main flow
    }
  }

  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ApiResponse<any[]>> {
    try {
      let q = query(collection(this.db, 'auditLogs'));

      if (filters?.userId) {
        q = query(q, where('userId', '==', filters.userId));
      }
      if (filters?.action) {
        q = query(q, where('action', '==', filters.action));
      }
      if (filters?.startDate) {
        q = query(q, where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
      }
      if (filters?.endDate) {
        q = query(q, where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
      }

      q = query(q, orderBy('timestamp', 'desc'));

      const querySnapshot = await getDocs(q);
      const logs: any[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate() || new Date(),
        });
      });

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

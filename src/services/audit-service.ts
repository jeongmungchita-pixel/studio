import { Firestore, collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { UserRole } from '@/types/auth';

export type AuditAction = 
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'access_granted'
  | 'access_denied'
  | 'permission_changed'
  | 'data_created'
  | 'data_updated'
  | 'data_deleted'
  | 'session_expired'
  | 'token_refreshed';

export interface AuditLog {
  userId?: string;
  userEmail?: string;
  userRole?: UserRole;
  action: AuditAction;
  resource?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * 감사 로깅 서비스
 * - 보안 이벤트 추적
 * - 사용자 활동 모니터링
 * - 컴플라이언스 준수
 */
export class AuditService {
  private static instance: AuditService;
  private firestore: Firestore | null = null;
  private queue: AuditLog[] = [];
  private isProcessing = false;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5초
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor() {
    // 주기적으로 큐 비우기
    this.startFlushTimer();
  }

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Firestore 초기화
   */
  initialize(firestore: Firestore) {
    this.firestore = firestore;
    // 초기화되면 대기 중인 로그 처리
    this.processQueue();
  }

  /**
   * 로그 기록
   */
  async log(log: Omit<AuditLog, 'timestamp' | 'ipAddress' | 'userAgent'>): Promise<void> {
    const fullLog: AuditLog = {
      ...log,
      timestamp: new Date().toISOString(),
      ipAddress: await this.getClientIP(),
      userAgent: this.getUserAgent(),
    };

    // 중요도가 높은 로그는 즉시 처리
    if (fullLog.severity === 'critical' || fullLog.severity === 'error') {
      await this.writeLog(fullLog);
    } else {
      // 큐에 추가하고 배치 처리
      this.queue.push(fullLog);
      if (this.queue.length >= this.BATCH_SIZE) {
        this.processQueue();
      }
    }

    // 개발 환경에서는 콘솔 출력
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(fullLog);
    }
  }

  /**
   * 로그인 이벤트
   */
  async logLogin(userId: string, email: string, role: UserRole, success: boolean) {
    await this.log({
      userId,
      userEmail: email,
      userRole: role,
      action: success ? 'login' : 'login_failed',
      severity: success ? 'info' : 'warning',
      metadata: {
        loginMethod: 'email',
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * 접근 거부 이벤트
   */
  async logAccessDenied(userId: string, resource: string, reason?: string) {
    await this.log({
      userId,
      action: 'access_denied',
      resource,
      severity: 'warning',
      metadata: {
        reason,
        attemptedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * 권한 변경 이벤트
   */
  async logPermissionChange(
    userId: string,
    fromRole: UserRole,
    toRole: UserRole,
    changedBy?: string
  ) {
    await this.log({
      userId,
      action: 'permission_changed',
      severity: 'info',
      metadata: {
        fromRole,
        toRole,
        changedBy,
        changedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * 데이터 변경 이벤트
   */
  async logDataChange(
    userId: string,
    action: 'data_created' | 'data_updated' | 'data_deleted',
    resource: string,
    metadata?: Record<string, any>
  ) {
    await this.log({
      userId,
      action,
      resource,
      severity: 'info',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * 감사 로그 조회
   */
  async getAuditLogs(
    filters: {
      userId?: string;
      action?: AuditAction;
      startDate?: Date;
      endDate?: Date;
      severity?: string;
    },
    limitCount = 100
  ): Promise<AuditLog[]> {
    if (!this.firestore) {
      return [];
    }

    try {
      const auditRef = collection(this.firestore, 'audit_logs');
      let q = query(auditRef);

      // 필터 적용
      if (filters.userId) {
        q = query(q, where('userId', '==', filters.userId));
      }
      if (filters.action) {
        q = query(q, where('action', '==', filters.action));
      }
      if (filters.severity) {
        q = query(q, where('severity', '==', filters.severity));
      }
      if (filters.startDate) {
        q = query(q, where('timestamp', '>=', filters.startDate.toISOString()));
      }
      if (filters.endDate) {
        q = query(q, where('timestamp', '<=', filters.endDate.toISOString()));
      }

      // 정렬 및 제한
      q = query(q, orderBy('timestamp', 'desc'), limit(limitCount));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as AuditLog);
    } catch (error) {
      return [];
    }
  }

  /**
   * 보안 이벤트 요약
   */
  async getSecuritySummary(days = 7): Promise<{
    totalLogins: number;
    failedLogins: number;
    accessDenied: number;
    criticalEvents: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.getAuditLogs(
      { startDate },
      1000
    );

    return {
      totalLogins: logs.filter(l => l.action === 'login').length,
      failedLogins: logs.filter(l => l.action === 'login_failed').length,
      accessDenied: logs.filter(l => l.action === 'access_denied').length,
      criticalEvents: logs.filter(l => l.severity === 'critical').length,
    };
  }

  /**
   * 비정상 활동 감지
   */
  async detectAnomalies(userId: string): Promise<string[]> {
    const anomalies: string[] = [];
    const logs = await this.getAuditLogs({ userId }, 100);

    // 짧은 시간 내 많은 로그인 시도
    const recentLogins = logs.filter(l => 
      l.action === 'login_failed' &&
      new Date(l.timestamp).getTime() > Date.now() - 3600000 // 1시간
    );
    if (recentLogins.length > 5) {
      anomalies.push('Multiple failed login attempts');
    }

    // 접근 거부 패턴
    const deniedAccess = logs.filter(l => l.action === 'access_denied');
    if (deniedAccess.length > 10) {
      anomalies.push('Frequent access denials');
    }

    return anomalies;
  }

  /**
   * 큐 처리
   */
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    const batch = this.queue.splice(0, this.BATCH_SIZE);
    
    try {
      await Promise.all(batch.map(log => this.writeLog(log)));
    } catch (error) {
      // 실패한 로그는 다시 큐에 추가
      this.queue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 개별 로그 쓰기
   */
  private async writeLog(log: AuditLog): Promise<void> {
    if (!this.firestore) {
      this.queue.push(log);
      return;
    }

    try {
      await addDoc(collection(this.firestore, 'audit_logs'), log);
    } catch (error) {
      // 실패한 로그는 로컬 스토리지에 백업
      this.backupToLocalStorage(log);
    }
  }

  /**
   * 로컬 스토리지 백업
   */
  private backupToLocalStorage(log: AuditLog) {
    if (typeof window === 'undefined') return;
    
    try {
      const key = 'audit_backup';
      const existing = localStorage.getItem(key);
      const logs = existing ? JSON.parse(existing) : [];
      logs.push(log);
      // 최대 100개만 유지
      if (logs.length > 100) {
        logs.shift();
      }
      localStorage.setItem(key, JSON.stringify(logs));
    } catch (error) {
    }
  }

  /**
   * 클라이언트 IP 가져오기
   */
  private async getClientIP(): Promise<string> {
    if (typeof window === 'undefined') return 'server';
    
    try {
      // 프로덕션에서는 실제 IP 서비스 사용
      // const response = await fetch('https://api.ipify.org?format=json');
      // const data = await response.json();
      // return data.ip;
      return 'client';
    } catch {
      return 'unknown';
    }
  }

  /**
   * User Agent 가져오기
   */
  private getUserAgent(): string {
    if (typeof window === 'undefined') return 'server';
    return window.navigator.userAgent;
  }

  /**
   * 콘솔 출력 (개발용)
   */
  private logToConsole(log: AuditLog) {
    const colors = {
      info: '\x1b[34m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      critical: '\x1b[35m',
    };
    
    const color = colors[log.severity];
    const reset = '\x1b[0m';
    
  }

  /**
   * 플러시 타이머 시작
   */
  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.processQueue();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * 서비스 종료 시 정리
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // 남은 로그 모두 처리
    this.processQueue();
  }
}

// 싱글톤 인스턴스 export
export const auditService = AuditService.getInstance();

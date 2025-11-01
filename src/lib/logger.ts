// ============================================
// 📊 통합 로깅 시스템
// ============================================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  category: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  stack?: string;
}

export interface SecurityEvent {
  type: 'LOGIN_ATTEMPT' | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'PERMISSION_DENIED' | 'SUSPICIOUS_ACTIVITY';
  userId?: string;
  ip?: string;
  userAgent?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private logLevel: LogLevel;
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.logLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    category: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      category,
      userId: this.userId,
      sessionId: this.sessionId,
      metadata,
      stack: error?.stack
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLog(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp;
    const category = entry.category;
    const message = entry.message;
    const userId = entry.userId ? ` [User: ${entry.userId}]` : '';
    const sessionId = entry.sessionId ? ` [Session: ${entry.sessionId}]` : '';
    
    let formatted = `[${timestamp}] ${levelName} [${category}]${userId}${sessionId}: ${message}`;
    
    if (entry.metadata) {
      formatted += `\nMetadata: ${JSON.stringify(entry.metadata, null, 2)}`;
    }
    
    if (entry.stack) {
      formatted += `\nStack: ${entry.stack}`;
    }
    
    return formatted;
  }

  private output(entry: LogEntry) {
    if (!this.shouldLog(entry.level)) return;

    const formatted = this.formatLog(entry);
    
    // 개발 환경에서는 콘솔에 출력
    if (process.env.NODE_ENV === 'development') {
      switch (entry.level) {
        case LogLevel.DEBUG:
        case LogLevel.INFO:
          break;
        case LogLevel.WARN:
          break;
        case LogLevel.ERROR:
        case LogLevel.CRITICAL:
          break;
      }
    }

    // 프로덕션 환경에서는 외부 로깅 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(entry);
    }

    // 로컬 스토리지에도 저장 (클라이언트 사이드)
    if (typeof window !== 'undefined') {
      this.saveToLocalStorage(entry);
    }
  }

  private sendToLoggingService(entry: LogEntry) {
    // 실제 환경에서는 여기서 외부 로깅 서비스 (예: Winston, Sentry 등)로 전송
    // 현재는 시뮬레이션
    if (entry.level >= LogLevel.ERROR) {
      // 에러 레벨 이상은 즉시 알림
    }
  }

  private saveToLocalStorage(entry: LogEntry) {
    try {
      const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
      logs.push(entry);
      
      // 최대 100개 로그만 유지
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (error: unknown) {
      // 로컬 스토리지 저장 실패는 무시
    }
  }

  debug(message: string, category = 'DEBUG', metadata?: Record<string, unknown>) {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, category, metadata);
    this.output(entry);
  }

  info(message: string, category = 'INFO', metadata?: Record<string, unknown>) {
    const entry = this.createLogEntry(LogLevel.INFO, message, category, metadata);
    this.output(entry);
  }

  warn(message: string, category = 'WARNING', metadata?: Record<string, unknown>) {
    const entry = this.createLogEntry(LogLevel.WARN, message, category, metadata);
    this.output(entry);
  }

  error(message: string, error?: Error, category = 'ERROR', metadata?: Record<string, unknown>) {
    const entry = this.createLogEntry(LogLevel.ERROR, message, category, metadata, error);
    this.output(entry);
  }

  critical(message: string, error?: Error, category = 'CRITICAL', metadata?: Record<string, unknown>) {
    const entry = this.createLogEntry(LogLevel.CRITICAL, message, category, metadata, error);
    this.output(entry);
  }

  // 보안 이벤트 전용 로깅
  security(_event: SecurityEvent) {
    const entry = this.createLogEntry(
      LogLevel.WARN,
      _event.message,
      'SECURITY',
      {
        type: _event.type,
        userId: _event.userId,
        ip: _event.ip,
        userAgent: _event.userAgent,
        ..._event.metadata
      }
    );
    this.output(entry);
  }

  // 성능 메트릭 로깅
  performance(operation: string, duration: number, metadata?: Record<string, unknown>) {
    this.info(
      `Performance: ${operation} completed in ${duration}ms`,
      'PERFORMANCE',
      { operation, duration, ...metadata }
    );
  }

  // 사용자 액션 로깅
  userAction(action: string, metadata?: Record<string, unknown>) {
    this.info(
      `User Action: ${action}`,
      'USER_ACTION',
      { action, ...metadata }
    );
  }

  // API 호출 로깅
  apiCall(method: string, endpoint: string, statusCode: number, duration: number) {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const entry = this.createLogEntry(
      level,
      `API ${method} ${endpoint} - ${statusCode} (${duration}ms)`,
      'API',
      { method, endpoint, statusCode, duration }
    );
    this.output(entry);
  }

  // 로그 검색 및 필터링 (클라이언트 사이드)
  getLogs(filter?: {
    level?: LogLevel;
    category?: string;
    startTime?: Date;
    endTime?: Date;
  }): LogEntry[] {
    if (typeof window === 'undefined') return [];

    try {
      const logs: LogEntry[] = JSON.parse(localStorage.getItem('app_logs') || '[]');
      
      if (!filter) return logs;

      return logs.filter(log => {
        if (filter.level !== undefined && log.level < filter.level) return false;
        if (filter.category && log.category !== filter.category) return false;
        if (filter.startTime && new Date(log.timestamp) < filter.startTime) return false;
        if (filter.endTime && new Date(log.timestamp) > filter.endTime) return false;
        return true;
      });
    } catch {
      return [];
    }
  }

  // 로그 내보내기
  exportLogs(): string {
    const logs = this.getLogs();
    return logs.map(log => this.formatLog(log)).join('\n\n');
  }

  // 로그 지우기
  clearLogs() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_logs');
    }
  }
}

// 싱글톤 인스턴스
export const logger = new Logger();

// 전역 에러 핸들러
if (typeof window !== 'undefined') {
  window.addEventListener('error', (_event) => {
    logger.error(
      `Uncaught Error: ${_event.message}`,
      new Error(_event.message),
      'GLOBAL_ERROR',
      {
        filename: _event.filename,
        lineno: _event.lineno,
        colno: _event.colno
      }
    );
  });

  window.addEventListener('unhandledrejection', (_event) => {
    logger.error(
      `Unhandled Promise Rejection: ${_event.reason}`,
      _event.reason instanceof Error ? _event.reason : new Error(String(_event.reason)),
      'PROMISE_REJECTION'
    );
  });
}

// React 에러 바운더리용 헬퍼
export function logReactError(error: Error, errorInfo: { componentStack: string }) {
  logger.error(
    `React Error: ${error.message}`,
    error,
    'REACT_ERROR',
    { componentStack: errorInfo.componentStack }
  );
}

// 성능 측정 헬퍼
export function measurePerformance<T>(
  operation: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();
  
  try {
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        logger.performance(operation, duration);
      });
    } else {
      const duration = performance.now() - start;
      logger.performance(operation, duration);
      return result;
    }
  } catch (error: unknown) {
    const duration = performance.now() - start;
    logger.error(
      `Performance measurement failed for ${operation}`,
      error instanceof Error ? error : new Error(String(error)),
      'PERFORMANCE',
      { operation, duration }
    );
    throw error;
  }
}

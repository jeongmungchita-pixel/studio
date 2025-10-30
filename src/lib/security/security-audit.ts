import { UserRole } from '@/types/auth';
import { APIError } from '@/utils/error/api-error';

/**
 * 보안 이벤트 타입
 */
export enum SecurityEventType {
  // 인증 관련
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  
  // 권한 관련
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  PRIVILEGE_ESCALATION_ATTEMPT = 'PRIVILEGE_ESCALATION_ATTEMPT',
  
  // 데이터 접근
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT',
  BULK_DATA_ACCESS = 'BULK_DATA_ACCESS',
  
  // 보안 위반
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  CSRF_ATTEMPT = 'CSRF_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  
  // 시스템 보안
  SYSTEM_ACCESS = 'SYSTEM_ACCESS',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  BACKUP_ACCESS = 'BACKUP_ACCESS',
  
  // 파일 관련
  FILE_UPLOAD = 'FILE_UPLOAD',
  FILE_DOWNLOAD = 'FILE_DOWNLOAD',
  MALICIOUS_FILE_DETECTED = 'MALICIOUS_FILE_DETECTED',
}

/**
 * 보안 이벤트 심각도
 */
export enum SecuritySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * 보안 이벤트 인터페이스
 */
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: Date;
  userId?: string;
  userRole?: UserRole;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details: Record<string, any>;
  riskScore: number;
  blocked: boolean;
}

/**
 * 보안 감사 로그 클래스
 */
export class SecurityAudit {
  private static events: SecurityEvent[] = [];
  private static maxEvents = 10000; // 메모리 제한
  private static riskThreshold = 70; // 위험 점수 임계값

  /**
   * 보안 이벤트 로깅
   */
  static logEvent(
    type: SecurityEventType,
    details: Record<string, any> = {},
    context?: {
      userId?: string;
      userRole?: UserRole;
      ipAddress?: string;
      userAgent?: string;
      resource?: string;
      action?: string;
    }
  ): SecurityEvent {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      type,
      severity: this.calculateSeverity(type, details),
      timestamp: new Date(),
      userId: context?.userId,
      userRole: context?.userRole,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      resource: context?.resource,
      action: context?.action,
      details,
      riskScore: this.calculateRiskScore(type, details, context),
      blocked: false,
    };

    // 위험 점수가 높으면 차단
    if (event.riskScore >= this.riskThreshold) {
      event.blocked = true;
      this.handleHighRiskEvent(event);
    }

    // 이벤트 저장
    this.events.push(event);

    // 메모리 제한 관리
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // 실시간 알림 (높은 위험도)
    if (event.severity === SecuritySeverity.HIGH || event.severity === SecuritySeverity.CRITICAL) {
      this.sendSecurityAlert(event);
    }

    return event;
  }

  /**
   * 심각도 계산
   */
  private static calculateSeverity(type: SecurityEventType, details: Record<string, any>): SecuritySeverity {
    const criticalEvents = [
      SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT,
      SecurityEventType.MALICIOUS_FILE_DETECTED,
      SecurityEventType.SQL_INJECTION_ATTEMPT,
    ];

    const highEvents = [
      SecurityEventType.PERMISSION_DENIED,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityEventType.CSRF_ATTEMPT,
      SecurityEventType.XSS_ATTEMPT,
      SecurityEventType.ACCOUNT_LOCKED,
    ];

    const mediumEvents = [
      SecurityEventType.LOGIN_FAILED,
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      SecurityEventType.INVALID_TOKEN,
      SecurityEventType.SENSITIVE_DATA_ACCESS,
    ];

    if (criticalEvents.includes(type)) return SecuritySeverity.CRITICAL;
    if (highEvents.includes(type)) return SecuritySeverity.HIGH;
    if (mediumEvents.includes(type)) return SecuritySeverity.MEDIUM;
    return SecuritySeverity.LOW;
  }

  /**
   * 위험 점수 계산
   */
  private static calculateRiskScore(
    type: SecurityEventType,
    details: Record<string, any>,
    context?: any
  ): number {
    let score = 0;

    // 기본 점수 (이벤트 타입별)
    const baseScores: Record<SecurityEventType, number> = {
      [SecurityEventType.LOGIN_SUCCESS]: 0,
      [SecurityEventType.LOGIN_FAILED]: 20,
      [SecurityEventType.LOGOUT]: 0,
      [SecurityEventType.PASSWORD_CHANGE]: 10,
      [SecurityEventType.ACCOUNT_LOCKED]: 50,
      [SecurityEventType.PERMISSION_DENIED]: 40,
      [SecurityEventType.ROLE_CHANGED]: 30,
      [SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT]: 90,
      [SecurityEventType.SENSITIVE_DATA_ACCESS]: 30,
      [SecurityEventType.DATA_EXPORT]: 40,
      [SecurityEventType.BULK_DATA_ACCESS]: 50,
      [SecurityEventType.SUSPICIOUS_ACTIVITY]: 60,
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: 30,
      [SecurityEventType.INVALID_TOKEN]: 25,
      [SecurityEventType.CSRF_ATTEMPT]: 70,
      [SecurityEventType.XSS_ATTEMPT]: 70,
      [SecurityEventType.SQL_INJECTION_ATTEMPT]: 90,
      [SecurityEventType.SYSTEM_ACCESS]: 40,
      [SecurityEventType.CONFIG_CHANGE]: 50,
      [SecurityEventType.BACKUP_ACCESS]: 60,
      [SecurityEventType.FILE_UPLOAD]: 20,
      [SecurityEventType.FILE_DOWNLOAD]: 10,
      [SecurityEventType.MALICIOUS_FILE_DETECTED]: 95,
    };

    score += baseScores[type] || 0;

    // 반복 시도 가중치
    if (details.attemptCount && details.attemptCount > 1) {
      score += Math.min(details.attemptCount * 10, 50);
    }

    // 시간대 가중치 (업무 시간 외)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      score += 15;
    }

    // IP 주소 위험도
    if (context?.ipAddress) {
      if (this.isKnownMaliciousIP(context.ipAddress)) {
        score += 40;
      }
      if (this.isUnusualLocation(context.ipAddress)) {
        score += 20;
      }
    }

    // 사용자 에이전트 위험도
    if (context?.userAgent && this.isSuspiciousUserAgent(context.userAgent)) {
      score += 25;
    }

    return Math.min(score, 100);
  }

  /**
   * 높은 위험도 이벤트 처리
   */
  private static handleHighRiskEvent(event: SecurityEvent): void {
    // 자동 차단 로직
    if (event.userId) {
      this.temporaryBlockUser(event.userId, event.type);
    }

    if (event.ipAddress) {
      this.temporaryBlockIP(event.ipAddress);
    }

    // 관리자 알림
    this.notifyAdministrators(event);
  }

  /**
   * 사용자 임시 차단
   */
  private static temporaryBlockUser(userId: string, eventType: SecurityEventType): void {
    const blockDuration = this.getBlockDuration(eventType);
    
    // TODO: 실제 사용자 차단 로직 구현
    console.warn(`User ${userId} temporarily blocked for ${blockDuration}ms due to ${eventType}`);
  }

  /**
   * IP 임시 차단
   */
  private static temporaryBlockIP(ipAddress: string): void {
    // TODO: 실제 IP 차단 로직 구현
    console.warn(`IP ${ipAddress} temporarily blocked`);
  }

  /**
   * 차단 기간 계산
   */
  private static getBlockDuration(eventType: SecurityEventType): number {
    const durations: Record<SecurityEventType, number> = {
      [SecurityEventType.LOGIN_FAILED]: 5 * 60 * 1000, // 5분
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: 15 * 60 * 1000, // 15분
      [SecurityEventType.CSRF_ATTEMPT]: 60 * 60 * 1000, // 1시간
      [SecurityEventType.XSS_ATTEMPT]: 60 * 60 * 1000, // 1시간
      [SecurityEventType.SQL_INJECTION_ATTEMPT]: 24 * 60 * 60 * 1000, // 24시간
      [SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT]: 24 * 60 * 60 * 1000, // 24시간
      [SecurityEventType.MALICIOUS_FILE_DETECTED]: 24 * 60 * 60 * 1000, // 24시간
    } as any;

    return durations[eventType] || 30 * 60 * 1000; // 기본 30분
  }

  /**
   * 보안 알림 전송
   */
  private static sendSecurityAlert(event: SecurityEvent): void {
    // TODO: 실제 알림 시스템 연동
    console.warn('Security Alert:', {
      type: event.type,
      severity: event.severity,
      riskScore: event.riskScore,
      userId: event.userId,
      timestamp: event.timestamp,
    });
  }

  /**
   * 관리자 알림
   */
  private static notifyAdministrators(event: SecurityEvent): void {
    // TODO: 관리자 알림 시스템 연동
    console.error('Administrator Alert - High Risk Security Event:', event);
  }

  /**
   * 악성 IP 확인
   */
  private static isKnownMaliciousIP(ipAddress: string): boolean {
    // TODO: 실제 악성 IP 데이터베이스 연동
    const knownMaliciousIPs: string[] = [
      // 알려진 악성 IP 목록
    ];
    return knownMaliciousIPs.includes(ipAddress);
  }

  /**
   * 비정상적인 위치 확인
   */
  private static isUnusualLocation(ipAddress: string): boolean {
    // TODO: 지리적 위치 기반 위험도 분석
    return false;
  }

  /**
   * 의심스러운 사용자 에이전트 확인
   */
  private static isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * 이벤트 ID 생성
   */
  private static generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 보안 이벤트 조회
   */
  static getEvents(filters?: {
    type?: SecurityEventType;
    severity?: SecuritySeverity;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): SecurityEvent[] {
    let filteredEvents = [...this.events];

    if (filters) {
      if (filters.type) {
        filteredEvents = filteredEvents.filter(e => e.type === filters.type);
      }
      if (filters.severity) {
        filteredEvents = filteredEvents.filter(e => e.severity === filters.severity);
      }
      if (filters.userId) {
        filteredEvents = filteredEvents.filter(e => e.userId === filters.userId);
      }
      if (filters.startDate) {
        filteredEvents = filteredEvents.filter(e => e.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredEvents = filteredEvents.filter(e => e.timestamp <= filters.endDate!);
      }
    }

    // 최신순 정렬
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 제한
    if (filters?.limit) {
      filteredEvents = filteredEvents.slice(0, filters.limit);
    }

    return filteredEvents;
  }

  /**
   * 보안 통계 조회
   */
  static getSecurityStats(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): {
    totalEvents: number;
    eventsBySeverity: Record<SecuritySeverity, number>;
    eventsByType: Record<SecurityEventType, number>;
    riskTrend: number[];
    blockedEvents: number;
  } {
    const now = new Date();
    const timeRangeMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    }[timeRange];

    const cutoffTime = new Date(now.getTime() - timeRangeMs);
    const recentEvents = this.events.filter(e => e.timestamp >= cutoffTime);

    const eventsBySeverity = {
      [SecuritySeverity.LOW]: 0,
      [SecuritySeverity.MEDIUM]: 0,
      [SecuritySeverity.HIGH]: 0,
      [SecuritySeverity.CRITICAL]: 0,
    };

    const eventsByType = {} as Record<SecurityEventType, number>;
    let blockedEvents = 0;

    recentEvents.forEach(event => {
      eventsBySeverity[event.severity]++;
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      if (event.blocked) blockedEvents++;
    });

    // 위험도 트렌드 (시간대별)
    const riskTrend: number[] = [];
    const intervals = 24; // 24시간 또는 24개 구간
    const intervalMs = timeRangeMs / intervals;

    for (let i = 0; i < intervals; i++) {
      const intervalStart = new Date(cutoffTime.getTime() + i * intervalMs);
      const intervalEnd = new Date(intervalStart.getTime() + intervalMs);
      
      const intervalEvents = recentEvents.filter(e => 
        e.timestamp >= intervalStart && e.timestamp < intervalEnd
      );
      
      const avgRisk = intervalEvents.length > 0
        ? intervalEvents.reduce((sum, e) => sum + e.riskScore, 0) / intervalEvents.length
        : 0;
      
      riskTrend.push(Math.round(avgRisk));
    }

    return {
      totalEvents: recentEvents.length,
      eventsBySeverity,
      eventsByType,
      riskTrend,
      blockedEvents,
    };
  }

  /**
   * 보안 이벤트 내보내기
   */
  static exportEvents(format: 'json' | 'csv' = 'json'): string {
    const events = this.getEvents();
    
    if (format === 'csv') {
      const headers = [
        'ID', 'Type', 'Severity', 'Timestamp', 'User ID', 'User Role',
        'IP Address', 'Resource', 'Action', 'Risk Score', 'Blocked'
      ];
      
      const csvRows = [
        headers.join(','),
        ...events.map(event => [
          event.id,
          event.type,
          event.severity,
          event.timestamp.toISOString(),
          event.userId || '',
          event.userRole || '',
          event.ipAddress || '',
          event.resource || '',
          event.action || '',
          event.riskScore,
          event.blocked
        ].join(','))
      ];
      
      return csvRows.join('\n');
    }

    return JSON.stringify(events, null, 2);
  }
}

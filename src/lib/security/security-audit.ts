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
  details: Record<string, unknown>;
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
  // 동일 밀리초 타임스탬프에 대한 결정적 정렬을 보장하기 위한 모노토닉 카운터
  private static lastTimestamp = 0;
  /**
   * 보안 이벤트 로깅
   */
  static logEvent(
    type: SecurityEventType,
    details: Record<string, unknown> = {},
    context?: {
      userId?: string;
      userRole?: UserRole;
      ipAddress?: string;
      userAgent?: string;
      resource?: string;
      action?: string;
    }
  ): SecurityEvent {
    // 모노토닉 타임스탬프 생성 (동일 ms 충돌 방지)
    const now = Date.now();
    const monotonic = Math.max(now, this.lastTimestamp + 1);
    this.lastTimestamp = monotonic;

    const _event: SecurityEvent = {
      id: this.generateEventId(),
      type,
      severity: this.calculateSeverity(type, details),
      timestamp: new Date(monotonic),
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
    if (_event.riskScore >= this.riskThreshold) {
      _event.blocked = true;
      this.handleHighRiskEvent(_event);
    }
    // 이벤트 저장
    this.events.push(_event);
    // 메모리 제한 관리
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    // 실시간 알림 (높은 위험도)
    if (_event.severity === SecuritySeverity.HIGH || _event.severity === SecuritySeverity.CRITICAL) {
      this.sendSecurityAlert(_event);
    }
    return _event;
  }
  /**
   * 심각도 계산
   */
  private static calculateSeverity(type: SecurityEventType, details: Record<string, unknown>): SecuritySeverity {
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
    details: Record<string, unknown>,
    context?: {
      userId?: string;
      userRole?: UserRole;
      ipAddress?: string;
      userAgent?: string;
      resource?: string;
      action?: string;
    }
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
    const attemptCount = typeof details.attemptCount === 'number'
      ? details.attemptCount
      : Number(details.attemptCount ?? 0);
    if (!Number.isNaN(attemptCount) && attemptCount > 1) {
      score += Math.min(attemptCount * 10, 50);
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
  private static handleHighRiskEvent(_event: SecurityEvent): void {
    // 자동 차단 로직
    if (_event.userId) {
      this.temporaryBlockUser(_event.userId, _event.type);
    }
    if (_event.ipAddress) {
      this.temporaryBlockIP(_event.ipAddress);
    }
    // 관리자 알림
    this.notifyAdministrators(_event);
  }
  /**
   * 사용자 임시 차단
   */
  private static temporaryBlockUser(userId: string, eventType: SecurityEventType): void {
    const blockDuration = this.getBlockDuration(eventType);
    const blockUntil = new Date(Date.now() + blockDuration);
    
    // 차단 정보 저장
    const blockInfo = {
      userId,
      eventType,
      blockedAt: new Date().toISOString(),
      blockUntil: blockUntil.toISOString(),
      duration: blockDuration,
      reason: `Security event: ${eventType}`
    };
    
    // localStorage에 차단 목록 저장
    if (typeof window !== 'undefined') {
      const blockedUsers = JSON.parse(localStorage.getItem('blocked-users') || '{}');
      blockedUsers[userId] = blockInfo;
      localStorage.setItem('blocked-users', JSON.stringify(blockedUsers));
      
      // 차단 만료 타이머 설정
      setTimeout(() => {
        const users = JSON.parse(localStorage.getItem('blocked-users') || '{}');
        delete users[userId];
        localStorage.setItem('blocked-users', JSON.stringify(users));
      }, blockDuration);
    }
  }
  /**
   * IP 임시 차단
   */
  private static temporaryBlockIP(ipAddress: string): void {
    const blockDuration = 60 * 60 * 1000; // 기본 1시간 차단
    const blockUntil = new Date(Date.now() + blockDuration);
    
    // IP 차단 정보 저장
    const blockInfo = {
      ipAddress,
      blockedAt: new Date().toISOString(),
      blockUntil: blockUntil.toISOString(),
      duration: blockDuration,
      attempts: 1
    };
    
    // localStorage에 차단 IP 저장
    if (typeof window !== 'undefined') {
      const blockedIPs = JSON.parse(localStorage.getItem('blocked-ips') || '{}');
      
      // 이미 차단된 IP인 경우 시도 횟수 증가
      if (blockedIPs[ipAddress]) {
        blockedIPs[ipAddress].attempts++;
        blockedIPs[ipAddress].blockUntil = blockUntil.toISOString();
      } else {
        blockedIPs[ipAddress] = blockInfo;
      }
      
      localStorage.setItem('blocked-ips', JSON.stringify(blockedIPs));
      
      // 차단 만료 타이머 설정
      setTimeout(() => {
        const ips = JSON.parse(localStorage.getItem('blocked-ips') || '{}');
        delete ips[ipAddress];
        localStorage.setItem('blocked-ips', JSON.stringify(ips));
      }, blockDuration);
    }
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
    } as Record<SecurityEventType, number>;
    return durations[eventType] || 30 * 60 * 1000; // 기본 30분
  }
  /**
   * 보안 알림 전송
   */
  private static sendSecurityAlert(_event: SecurityEvent): void {
    // Firestore에 보안 알림 기록
    if (typeof window !== 'undefined') {
      // 클라이언트 사이드에서만 실행
      const alertData = {
        eventId: _event.id,
        type: _event.type,
        severity: _event.severity,
        timestamp: _event.timestamp.toISOString(),
        userId: _event.userId,
        ipAddress: _event.ipAddress,
        details: _event.details,
        blocked: _event.blocked
      };
      
      // localStorage에 임시 저장 (Firestore 연결 전)
      const alerts = JSON.parse(localStorage.getItem('security-alerts') || '[]');
      alerts.push(alertData);
      if (alerts.length > 100) {
        alerts.shift(); // 오래된 항목 제거
      }
      localStorage.setItem('security-alerts', JSON.stringify(alerts));
      
      // 브라우저 콘솔에 경고 (개발 환경에서만)
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Security Alert]', _event.type, _event);
      }
    }
  }
  /**
   * 관리자 알림
   */
  private static notifyAdministrators(_event: SecurityEvent): void {
    // 관리자 알림 큐에 추가
    const adminAlert = {
      id: _event.id,
      type: _event.type,
      severity: _event.severity,
      timestamp: _event.timestamp.toISOString(),
      userId: _event.userId || 'anonymous',
      ipAddress: _event.ipAddress || 'unknown',
      resource: _event.resource || 'system',
      riskScore: _event.riskScore,
      message: `보안 이벤트 발생: ${_event.type} (위험도: ${_event.riskScore}/100)`,
      requiresAction: _event.riskScore >= 70
    };
    
    // 관리자 알림 큐에 저장
    if (typeof window !== 'undefined') {
      const adminAlerts = JSON.parse(sessionStorage.getItem('admin-alerts') || '[]');
      adminAlerts.push(adminAlert);
      sessionStorage.setItem('admin-alerts', JSON.stringify(adminAlerts));
      
      // 심각한 이벤트의 경우 즉시 알림
      if (_event.severity === SecuritySeverity.CRITICAL || _event.riskScore >= 90) {
        // 브라우저 알림 API 사용 (권한 필요)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('보안 경고', {
            body: `${_event.type}: ${_event.details.message || '즉시 확인이 필요합니다'}`,
            icon: '/favicon.ico',
            requireInteraction: true
          });
        }
      }
    }
  }
  /**
   * 악성 IP 확인
   */
  private static isKnownMaliciousIP(ipAddress: string): boolean {
    // 알려진 악성 IP 패턴 및 차단된 IP 확인
    const knownMaliciousIPs: string[] = [
      // Tor exit nodes (예시)
      '198.96.155.3',
      '192.42.116.16',
      // VPN/Proxy 서버 (예시)
      '104.248.63.17',
      '45.33.32.156',
      // 알려진 봇넷 IP (예시)
      '185.220.101.0',
      '185.220.102.0'
    ];
    
    // 차단된 IP 목록 확인
    if (typeof window !== 'undefined') {
      const blockedIPs = JSON.parse(localStorage.getItem('blocked-ips') || '{}');
      if (blockedIPs[ipAddress]) {
        const blockInfo = blockedIPs[ipAddress];
        const blockUntil = new Date(blockInfo.blockUntil);
        if (blockUntil > new Date()) {
          return true; // 아직 차단 중
        }
      }
    }
    
    // 사설 IP 범위 체크 (의심스러운 경우)
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./
    ];
    
    // localhost나 사설 IP는 개발 환경에서만 허용
    if (process.env.NODE_ENV !== 'development') {
      for (const range of privateRanges) {
        if (range.test(ipAddress)) {
          return true; // 프로덕션에서 사설 IP는 의심스러움
        }
      }
    }
    
    return knownMaliciousIPs.includes(ipAddress);
  }
  /**
   * 비정상적인 위치 확인
   */
  private static isUnusualLocation(ipAddress: string): boolean {
    // IP 기반 국가 추정 (간단한 규칙 기반)
    const suspiciousCountryRanges: { [key: string]: RegExp[] } = {
      // 고위험 국가 IP 대역 (예시)
      'high-risk': [
        /^1\.93\./, // 중국 일부
        /^5\.188\./, // 러시아 일부
        /^31\.184\./, // 러시아 일부
        /^37\.72\./, // 우크라이나 일부
        /^41\.216\./, // 나이지리아 일부
        /^45\.123\./, // 베트남 일부
        /^103\./, // 아시아 일부 고위험 대역
        /^185\./, // 중동/동유럽 일부
        /^196\./, // 아프리카 일부
      ]
    };
    
    // 사용자의 평소 접속 패턴과 비교
    if (typeof window !== 'undefined') {
      // 사용자의 평소 IP 패턴 가져오기
      const userIPHistory = JSON.parse(localStorage.getItem('user-ip-history') || '[]');
      
      // IP의 처음 두 옥텟으로 네트워크 대역 확인
      const currentNetwork = ipAddress.split('.').slice(0, 2).join('.');
      const knownNetworks = userIPHistory.map((ip: string) => 
        ip.split('.').slice(0, 2).join('.')
      );
      
      // 완전히 새로운 네트워크 대역에서의 접속
      if (userIPHistory.length > 5 && !knownNetworks.includes(currentNetwork)) {
        // 고위험 국가 대역인지 확인
        for (const ranges of Object.values(suspiciousCountryRanges)) {
          for (const range of ranges) {
            if (range.test(ipAddress)) {
              return true; // 의심스러운 위치
            }
          }
        }
      }
      
      // IP 히스토리 업데이트 (최대 20개 유지)
      if (!userIPHistory.includes(ipAddress)) {
        userIPHistory.push(ipAddress);
        if (userIPHistory.length > 20) {
          userIPHistory.shift();
        }
        localStorage.setItem('user-ip-history', JSON.stringify(userIPHistory));
      }
    }
    
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

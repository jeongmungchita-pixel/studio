import CryptoJS from 'crypto-js';
import { APIError } from '@/utils/error/api-error';
/**
 * 데이터 암호화 및 보안 처리 클래스
 */
export class DataEncryption {
  private static readonly ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key-change-in-production';
  private static readonly IV_LENGTH = 16;
  /**
   * 민감한 데이터 암호화
   */
  static encrypt(data: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(data, this.ENCRYPTION_KEY).toString();
      return encrypted;
    } catch (error: unknown) {
      throw new APIError(
        '데이터 암호화에 실패했습니다',
        'ENCRYPTION_FAILED',
        500
      );
    }
  }
  /**
   * 암호화된 데이터 복호화
   */
  static decrypt(encryptedData: string): string {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error: unknown) {
      throw new APIError(
        '데이터 복호화에 실패했습니다',
        'DECRYPTION_FAILED',
        500
      );
    }
  }
  /**
   * 개인정보 마스킹
   */
  static maskPersonalInfo(data: string, type: 'email' | 'phone' | 'name' | 'id'): string {
    switch (type) {
      case 'email':
        const emailParts = data.split('@');
        if (emailParts.length !== 2) return data;
        const username = emailParts[0];
        const domain = emailParts[1];
        const maskedUsername = username.length > 2 
          ? username.substring(0, 2) + '*'.repeat(username.length - 2)
          : username;
        return `${maskedUsername}@${domain}`;
      case 'phone':
        if (data.length < 4) return data;
        return data.substring(0, 3) + '*'.repeat(data.length - 6) + data.substring(data.length - 3);
      case 'name':
        if (data.length < 2) return data;
        return data.substring(0, 1) + '*'.repeat(data.length - 1);
      case 'id':
        if (data.length < 4) return data;
        return '*'.repeat(data.length - 4) + data.substring(data.length - 4);
      default:
        return data;
    }
  }
  /**
   * 해시 생성 (비밀번호 등)
   */
  static hash(data: string, salt?: string): string {
    const saltToUse = salt || CryptoJS.lib.WordArray.random(128/8).toString();
    const hash = CryptoJS.PBKDF2(data, saltToUse, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
    return `${saltToUse}:${hash}`;
  }
  /**
   * 해시 검증
   */
  static verifyHash(data: string, hashedData: string): boolean {
    try {
      const [salt, hash] = hashedData.split(':');
      const newHash = CryptoJS.PBKDF2(data, salt, {
        keySize: 256/32,
        iterations: 10000
      }).toString();
      return newHash === hash;
    } catch {
      return false;
    }
  }
  /**
   * 안전한 랜덤 토큰 생성
   */
  static generateSecureToken(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString();
  }
  /**
   * JWT 토큰 검증 (간단한 구현)
   */
  static validateJWT(token: string): { valid: boolean; payload?: any } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false };
      }
      const payload = JSON.parse(atob(parts[1]));
      // 만료 시간 확인
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return { valid: false };
      }
      return { valid: true, payload };
    } catch {
      return { valid: false };
    }
  }
}
/**
 * 민감한 필드 자동 암호화/복호화 데코레이터
 */
export function EncryptedField(target: any, propertyKey: string) {
  let value: string;
  const getter = function() {
    return value ? DataEncryption.decrypt(value) : value;
  };
  const setter = function(newValue: string) {
    value = newValue ? DataEncryption.encrypt(newValue) : newValue;
  };
  Object.defineProperty(target, propertyKey, {
    get: getter,
    set: setter,
    enumerable: true,
    configurable: true,
  });
}
/**
 * 보안 정책 클래스
 */
export class SecurityPolicy {
  /**
   * 비밀번호 강도 검증
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;
    // 길이 검사
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('비밀번호는 최소 8자 이상이어야 합니다');
    }
    // 대문자 포함
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('대문자를 포함해야 합니다');
    }
    // 소문자 포함
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('소문자를 포함해야 합니다');
    }
    // 숫자 포함
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('숫자를 포함해야 합니다');
    }
    // 특수문자 포함
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push('특수문자를 포함해야 합니다');
    }
    // 일반적인 패턴 검사
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /(.)\1{2,}/, // 같은 문자 3번 이상 반복
    ];
    if (commonPatterns.some(pattern => pattern.test(password))) {
      score -= 2;
      feedback.push('일반적인 패턴은 사용할 수 없습니다');
    }
    return {
      isValid: score >= 4 && feedback.length === 0,
      score: Math.max(0, score),
      feedback,
    };
  }
  /**
   * 세션 토큰 생성
   */
  static generateSessionToken(userId: string, expiresIn: number = 24 * 60 * 60 * 1000): string {
    const payload = {
      userId,
      iat: Date.now(),
      exp: Date.now() + expiresIn,
      jti: DataEncryption.generateSecureToken(16), // JWT ID
    };
    return btoa(JSON.stringify(payload));
  }
  /**
   * IP 주소 검증
   */
  static validateIPAddress(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
  /**
   * 사용자 에이전트 검증
   */
  static validateUserAgent(userAgent: string): boolean {
    // 의심스러운 사용자 에이전트 패턴
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
    ];
    return !suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
  /**
   * CSRF 토큰 생성
   */
  static generateCSRFToken(): string {
    return DataEncryption.generateSecureToken(32);
  }
  /**
   * CSRF 토큰 검증
   */
  static validateCSRFToken(token: string, sessionToken: string): boolean {
    // 간단한 CSRF 토큰 검증 로직
    // 실제 구현에서는 더 복잡한 검증이 필요
    return token.length === 64 && /^[a-f0-9]+$/.test(token);
  }
}
/**
 * 데이터 무결성 검증
 */
export class DataIntegrity {
  /**
   * 체크섬 생성
   */
  static generateChecksum(data: unknown): string {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const record = data as Record<string, unknown>;
      const sortedKeys = Object.keys(record).sort();
      const sortedData: Record<string, unknown> = {};
      sortedKeys.forEach(key => {
        sortedData[key] = record[key];
      });
      return CryptoJS.SHA256(JSON.stringify(sortedData)).toString();
    }
    return CryptoJS.SHA256(JSON.stringify(data)).toString();
  }
  /**
   * 데이터 무결성 검증
   */
  static verifyIntegrity(data: unknown, expectedChecksum: string): boolean {
    const actualChecksum = this.generateChecksum(data);
    return actualChecksum === expectedChecksum;
  }
  /**
   * 디지털 서명 생성 (간단한 구현)
   */
  static signData(data: unknown, privateKey: string): string {
    const dataString = JSON.stringify(data);
    return CryptoJS.HmacSHA256(dataString, privateKey).toString();
  }
  /**
   * 디지털 서명 검증
   */
  static verifySignature(data: unknown, signature: string, publicKey: string): boolean {
    const expectedSignature = this.signData(data, publicKey);
    return signature === expectedSignature;
  }
}
/**
 * 보안 헤더 설정
 */
export class SecurityHeaders {
  /**
   * 보안 헤더 생성
   */
  static getSecurityHeaders(): Record<string, string> {
    return {
      // XSS 보호
      'X-XSS-Protection': '1; mode=block',
      // 콘텐츠 타입 스니핑 방지
      'X-Content-Type-Options': 'nosniff',
      // 클릭재킹 방지
      'X-Frame-Options': 'DENY',
      // HTTPS 강제
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      // 리퍼러 정책
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // 권한 정책
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      // CSP (Content Security Policy)
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https://firestore.googleapis.com https://firebase.googleapis.com",
        "frame-ancestors 'none'",
      ].join('; '),
    };
  }
  /**
   * CORS 헤더 설정
   */
  static getCORSHeaders(origin?: string): Record<string, string> {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://your-domain.com',
      // 프로덕션 도메인 추가
    ];
    const isAllowedOrigin = origin && allowedOrigins.includes(origin);
    return {
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'null',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400', // 24시간
    };
  }
}

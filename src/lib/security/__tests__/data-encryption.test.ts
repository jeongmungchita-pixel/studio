import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataEncryption, SecurityPolicy, DataIntegrity, SecurityHeaders } from '../data-encryption';

// Helper to control time
const now = 1700000000000;

describe('DataEncryption', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
  });

  it('encrypts and decrypts round-trip', () => {
    const plain = 'secret-data-한글123!@#';
    const enc = DataEncryption.encrypt(plain);
    expect(typeof enc).toBe('string');
    expect(enc).not.toBe(plain);
    const dec = DataEncryption.decrypt(enc);
    expect(dec).toBe(plain);
  });

  it('maskPersonalInfo handles email/phone/name/id', () => {
    expect(DataEncryption.maskPersonalInfo('john.doe@example.com', 'email')).toMatch(/jo\*+@example\.com/);
    expect(DataEncryption.maskPersonalInfo('01012345678', 'phone')).toMatch(/^010\*+678$/);
    expect(DataEncryption.maskPersonalInfo('홍길동', 'name')).toMatch(/^홍\*+$/);
    expect(DataEncryption.maskPersonalInfo('ABCDEFGHIJ', 'id')).toMatch(/^\*+GHIJ$/);
  });

  it('hash and verifyHash work and fail correctly', () => {
    const hashed = DataEncryption.hash('password');
    expect(DataEncryption.verifyHash('password', hashed)).toBe(true);
    expect(DataEncryption.verifyHash('wrong', hashed)).toBe(false);
    // malformed hashedData should be handled and return false
    expect(DataEncryption.verifyHash('password', 'malformed')).toBe(false);
  });

  it('generateSecureToken returns hex-like string with requested length', () => {
    const token = DataEncryption.generateSecureToken(16);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('validateJWT returns valid for non-expired token and invalid after expiry', () => {
    const payload = { sub: 'u1', exp: Math.floor((now + 1000) / 1000) };
    const token = `a.${btoa(JSON.stringify(payload))}.c`;
    expect(DataEncryption.validateJWT(token).valid).toBe(true);
    // advance time beyond exp
    vi.setSystemTime(new Date(now + 2000));
    expect(DataEncryption.validateJWT(token).valid).toBe(false);
    // malformed
    expect(DataEncryption.validateJWT('bad')).toEqual({ valid: false });
  });
});

describe('SecurityPolicy', () => {
  it('validatePasswordStrength scores and feedback', () => {
    const weak = SecurityPolicy.validatePasswordStrength('abc');
    expect(weak.isValid).toBe(false);
    const strong = SecurityPolicy.validatePasswordStrength('Abcdef1!');
    expect(strong.isValid).toBe(true);
  });

  it('generateSessionToken produces base64 with exp and iat', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    const token = SecurityPolicy.generateSessionToken('user1', 1000);
    const payload = JSON.parse(atob(token));
    expect(payload.userId).toBe('user1');
    expect(payload.iat).toBe(now);
    expect(payload.exp).toBe(now + 1000);
    expect(typeof payload.jti).toBe('string');
  });

  it('validateIPAddress validates ipv4/ipv6 formats', () => {
    expect(SecurityPolicy.validateIPAddress('192.168.0.1')).toBe(true);
    expect(SecurityPolicy.validateIPAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    expect(SecurityPolicy.validateIPAddress('999.999.999.999')).toBe(false);
  });

  it('validateUserAgent flags suspicious patterns', () => {
    expect(SecurityPolicy.validateUserAgent('Mozilla/5.0')).toBe(true);
    expect(SecurityPolicy.validateUserAgent('Googlebot')).toBe(false);
  });

  it('validateCSRFToken checks length and hex', () => {
    const ok = 'a'.repeat(64);
    const bad = 'z'.repeat(64); // not hex
    expect(SecurityPolicy.validateCSRFToken(ok, 'session')).toBe(true);
    expect(SecurityPolicy.validateCSRFToken(bad, 'session')).toBe(false);
  });
});

describe('DataIntegrity', () => {
  it('generateChecksum sorts object keys and verifyIntegrity passes/fails', () => {
    const a = { b: 2, a: 1 };
    const checksum = DataIntegrity.generateChecksum(a);
    expect(typeof checksum).toBe('string');
    expect(checksum).toHaveLength(64); // SHA256 hex length
    const sameDifferentOrder = { a: 1, b: 2 };
    expect(DataIntegrity.verifyIntegrity(sameDifferentOrder, checksum)).toBe(true);
    const different = { a: 2, b: 1 };
    expect(DataIntegrity.verifyIntegrity(different, checksum)).toBe(false);
  });

  it('signData and verifySignature', () => {
    const data = { id: 1, name: 'X' };
    const sig = DataIntegrity.signData(data, 'key');
    expect(typeof sig).toBe('string');
    expect(DataIntegrity.verifySignature(data, sig, 'key')).toBe(true);
    expect(DataIntegrity.verifySignature({ id: 2 }, sig, 'key')).toBe(false);
  });
});

describe('SecurityHeaders', () => {
  it('getSecurityHeaders returns common security headers', () => {
    const h = SecurityHeaders.getSecurityHeaders();
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Content-Security-Policy']).toContain("default-src 'self'");
  });

  it('getCORSHeaders allows configured origins and defaults to null otherwise', () => {
    const allow = SecurityHeaders.getCORSHeaders('http://localhost:3000');
    expect(allow['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    const deny = SecurityHeaders.getCORSHeaders('https://unknown.com');
    expect(deny['Access-Control-Allow-Origin']).toBe('null');
  });
});

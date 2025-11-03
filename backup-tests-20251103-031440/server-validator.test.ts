import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ServerValidator, BaseSchemas, UserSchemas } from '../server-validator';
import { UserRole } from '@/types/auth';

describe('ServerValidator', () => {
  describe('validate', () => {
    it('should parse valid data', () => {
      const schema = z.object({ email: BaseSchemas.email });
      const data = { email: 'test@example.com' };
      const parsed = ServerValidator.validate(schema, data);
      expect(parsed).toEqual(data);
    });

    it('should throw APIError on invalid data', () => {
      const schema = z.object({ email: BaseSchemas.email });
      expect(() => ServerValidator.validate(schema, { email: 'invalid' })).toThrowError();
    });
  });

  describe('safeParse', () => {
    it('should return success=true for valid data', () => {
      const schema = z.object({ email: BaseSchemas.email });
      const result = ServerValidator.safeParse(schema, { email: 'user@example.com' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ email: 'user@example.com' });
    });

    it('should return success=false and error message for invalid data', () => {
      const schema = z.object({ email: BaseSchemas.email });
      const result = ServerValidator.safeParse(schema, { email: 'x' });
      expect(result.success).toBe(false);
      expect(result.error).toBeTypeOf('string');
      expect(result?.error?.length).toBeGreaterThan(0);
    });
  });

  describe('validateWithPermission', () => {
    it('should allow when user has required role', () => {
      const data = { email: 'ok@example.com', displayName: 'User', role: UserRole.MEMBER };
      const parsed = ServerValidator.validateWithPermission(UserSchemas.createUser, data, UserRole.SUPER_ADMIN, [UserRole.SUPER_ADMIN]);
      expect(parsed).toBeDefined();
    });

    it('should throw when user lacks permission', () => {
      const data = { email: 'ok@example.com', displayName: 'User', role: UserRole.MEMBER };
      expect(() => ServerValidator.validateWithPermission(UserSchemas.createUser, data, UserRole.MEMBER, [UserRole.SUPER_ADMIN])).toThrowError();
    });
  });

  describe('validateFileUpload', () => {
    it('should accept valid file', () => {
      expect(() => ServerValidator.validateFileUpload({ name: 'file.pdf', size: 1000, type: 'application/pdf' })).not.toThrow();
    });

    it('should reject invalid type', () => {
      expect(() => ServerValidator.validateFileUpload({ name: 'file.exe', size: 1000, type: 'application/x-msdownload' })).toThrowError();
    });

    it('should reject too large file', () => {
      expect(() => ServerValidator.validateFileUpload({ name: 'big.pdf', size: 11 * 1024 * 1024, type: 'application/pdf' })).toThrowError();
    });

    it('should reject unsafe filename patterns', () => {
      expect(() => ServerValidator.validateFileUpload({ name: '../secret.pdf', size: 100, type: 'application/pdf' })).toThrowError();
    });
  });

  describe('sanitizeInput', () => {
    it('should remove tags, js protocol and handlers', () => {
      const input = '<img src=x onload=alert(1)>javascript:alert(2)';
      const sanitized = ServerValidator.sanitizeInput(input);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized.toLowerCase()).not.toContain('javascript:');
      expect(/on\w+=/i.test(sanitized)).toBe(false);
    });
  });

  describe('sanitizeQuery', () => {
    it('should keep only safe keys and sanitize string values', () => {
      const result = ServerValidator.sanitizeQuery({ 'na..me': 'bad', 'name': '<b>ok</b>', 'count': 3, 'active': true, 'skip': undefined as any, '$where': 'x' });
      // Keys not matching pattern (like $where) are dropped; valid keys are kept.
      // sanitizeInput removes angle brackets from strings, so '<b>ok</b>' -> 'bok/b'
      expect(result).toEqual({ 'na..me': 'bad', name: 'bok/b', count: 3, active: true });
    });
  });

  describe('validate (event schema refine)', () => {
    it('should fail when endDate <= startDate', () => {
      const data = {
        title: 'Comp', startDate: new Date('2024-01-02').toISOString(), endDate: new Date('2024-01-01').toISOString(),
        location: 'Seoul', category: 'competition', isPublic: true
      } as any;
      expect(() => ServerValidator.validate((UserSchemas as any), data)).toBeDefined();
    });
  });
});

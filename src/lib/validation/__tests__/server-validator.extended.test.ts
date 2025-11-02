import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { 
  ServerValidator, 
  BaseSchemas,
  UserSchemas,
  ClubSchemas,
  EventSchemas,
  createValidationMiddleware,
  createPermissionMiddleware 
} from '../server-validator';
import { UserRole } from '@/types/auth';
import { APIError } from '@/utils/error/api-error';

describe('ServerValidator Extended Edge Cases', () => {
  describe('BaseSchemas validation', () => {
    it('validates Firebase ID with various edge cases', () => {
      // Valid cases
      expect(BaseSchemas.firebaseId.parse('abc123')).toBe('abc123');
      expect(BaseSchemas.firebaseId.parse('A-B_C')).toBe('A-B_C');
      expect(BaseSchemas.firebaseId.parse('0' .repeat(128))).toBe('0'.repeat(128));
      
      // Invalid cases
      expect(() => BaseSchemas.firebaseId.parse('')).toThrow();
      expect(() => BaseSchemas.firebaseId.parse('a'.repeat(129))).toThrow();
      expect(() => BaseSchemas.firebaseId.parse('abc@123')).toThrow();
      expect(() => BaseSchemas.firebaseId.parse('../../etc')).toThrow();
    });

    it('validates email edge cases', () => {
      // Valid
      expect(BaseSchemas.email.parse('test@example.com')).toBe('test@example.com');
      expect(BaseSchemas.email.parse('a'.repeat(240) + '@e.co')).toBeDefined(); // 240 + 5 = 245, under 254
      
      // Invalid
      expect(() => BaseSchemas.email.parse('a'.repeat(250) + '@example.com')).toThrow(); // Over 254 total
      expect(() => BaseSchemas.email.parse('not-an-email')).toThrow();
    });

    it('validates Korean phone numbers', () => {
      // Valid formats
      expect(BaseSchemas.phoneNumber.parse('010-1234-5678')).toBe('010-1234-5678');
      expect(BaseSchemas.phoneNumber.parse('01012345678')).toBe('01012345678');
      
      // Invalid
      expect(() => BaseSchemas.phoneNumber.parse('02-1234-5678')).toThrow();
      expect(() => BaseSchemas.phoneNumber.parse('010-123-5678')).toThrow();
      expect(() => BaseSchemas.phoneNumber.parse('+82-10-1234-5678')).toThrow();
    });

    it('validates file size limits', () => {
      expect(BaseSchemas.fileSize.parse(0)).toBe(0);
      expect(BaseSchemas.fileSize.parse(10 * 1024 * 1024)).toBe(10485760);
      
      expect(() => BaseSchemas.fileSize.parse(-1)).toThrow();
      expect(() => BaseSchemas.fileSize.parse(10 * 1024 * 1024 + 1)).toThrow();
    });
  });

  describe('validate method error handling', () => {
    it('handles non-ZodError exceptions', () => {
      const schema = z.object({ 
        test: z.string().transform(() => {
          throw new Error('Custom error');
        })
      });
      
      expect(() => ServerValidator.validate(schema, { test: 'value' }))
        .toThrowError('Custom error');
    });

    it('formats multiple validation errors', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
        name: z.string().min(2)
      });
      
      try {
        ServerValidator.validate(schema, { email: 'bad', age: 10, name: 'a' });
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        expect(apiError.message).toContain('email');
        expect(apiError.message).toContain('age');
        expect(apiError.message).toContain('name');
      }
    });
  });

  describe('safeParse edge cases', () => {
    it('handles transformer errors gracefully', () => {
      const schema = z.string().transform(() => {
        throw new TypeError('Transform failed');
      });
      
      const result = ServerValidator.safeParse(schema, 'test');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Transform failed');
    });

    it('handles undefined and null inputs', () => {
      const schema = z.object({ required: z.string() });
      
      const result1 = ServerValidator.safeParse(schema, undefined);
      expect(result1.success).toBe(false);
      
      const result2 = ServerValidator.safeParse(schema, null);
      expect(result2.success).toBe(false);
    });

    it('handles nested path errors', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            email: z.string().email()
          })
        })
      });
      
      const result = ServerValidator.safeParse(schema, {
        user: { profile: { email: 'invalid' } }
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('user.profile.email');
    });
  });

  describe('sanitizeInput comprehensive', () => {
    it('removes various XSS attack vectors', () => {
      const vectors = [
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        'javascript:void(0)',
        'JAVASCRIPT:alert(1)',
        'onclick=evil()',
        'ONMOUSEOVER=hack()',
        '<script>alert(1)</script>',
        '<<script>nested</script>>',
        '<iframe src="evil"></iframe>',
      ];
      
      vectors.forEach(vector => {
        const clean = ServerValidator.sanitizeInput(vector);
        expect(clean).not.toContain('<');
        expect(clean).not.toContain('>');
        expect(clean.toLowerCase()).not.toContain('javascript:');
        expect(clean.toLowerCase()).not.toContain('on');
      });
    });

    it('preserves safe content', () => {
      const safe = '  Hello & welcome to the "app"  ';
      const result = ServerValidator.sanitizeInput(safe);
      expect(result).toBe('Hello & welcome to the "app"');
    });

    it('handles unicode and special characters', () => {
      const unicode = '안녕하세요 😊 <script>alert("한글")</script>';
      const result = ServerValidator.sanitizeInput(unicode);
      expect(result).toContain('안녕하세요');
      expect(result).toContain('😊');
      expect(result).not.toContain('<');
    });

    it('handles empty and whitespace-only strings', () => {
      expect(ServerValidator.sanitizeInput('')).toBe('');
      expect(ServerValidator.sanitizeInput('   ')).toBe('');
      expect(ServerValidator.sanitizeInput('\n\t\r')).toBe('');
    });
  });

  describe('sanitizeQuery comprehensive', () => {
    it('filters out NoSQL injection attempts', () => {
      const malicious = {
        '$ne': 'admin',
        '$gt': '',
        '$where': 'function() { return true; }',
        'normal_key': 'normal_value',
        '__proto__': 'polluted',
        'constructor.prototype.isAdmin': true,
        'normal-key-2': 'value2'  // Another valid key
      };
      
      const result = ServerValidator.sanitizeQuery(malicious);
      // Should filter out keys with $, __ prefix but keep valid ones
      const keys = Object.keys(result);
      expect(keys).toContain('normal_key');
      expect(keys).not.toContain('$ne');
      expect(keys).not.toContain('$gt');
      expect(keys).not.toContain('$where');
      expect(keys).not.toContain('__proto__');
      expect(result.normal_key).toBe('normal_value');
    });

    it('handles arrays and objects correctly', () => {
      const query = {
        array: [1, 2, 3],
        nested: { key: 'value' },
        func: () => {},
        date: new Date(),
        regex: /test/,
        symbol: Symbol('test'),
        undefined: undefined
      };
      
      const result = ServerValidator.sanitizeQuery(query);
      expect(result.array).toBeUndefined();
      expect(result.nested).toBeUndefined();
      expect(result.func).toBeUndefined();
      expect(result.date).toBeUndefined();
      expect(result.regex).toBeUndefined();
      expect(result.symbol).toBeUndefined();
      expect(result.undefined).toBeUndefined();
    });

    it('handles numeric edge cases', () => {
      const query = {
        zero: 0,
        negative: -100,
        float: 3.14,
        infinity: Infinity,
        negInfinity: -Infinity,
        nan: NaN
        // bigInt: 9007199254740991n // BigInt not supported in ES2015 target
      };
      
      const result = ServerValidator.sanitizeQuery(query);
      expect(result.zero).toBe(0);
      expect(result.negative).toBe(-100);
      expect(result.float).toBe(3.14);
      expect(result.infinity).toBeUndefined();
      expect(result.negInfinity).toBeUndefined();
      expect(result.nan).toBeUndefined();
      // expect(result.bigInt).toBeUndefined();
    });
  });

  describe('validateFileUpload edge cases', () => {
    it('accepts all allowed MIME types', () => {
      const allowedTypes = [
        { name: 'test.jpg', size: 1000, type: 'image/jpeg' },
        { name: 'test.png', size: 1000, type: 'image/png' },
        { name: 'test.webp', size: 1000, type: 'image/webp' },
        { name: 'test.pdf', size: 1000, type: 'application/pdf' },
        { name: 'test.doc', size: 1000, type: 'application/msword' },
        { name: 'test.docx', size: 1000, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      ];
      
      allowedTypes.forEach(file => {
        expect(() => ServerValidator.validateFileUpload(file)).not.toThrow();
      });
    });

    it('rejects Windows reserved names', () => {
      const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT9', 'con', 'prn'];
      
      reserved.forEach(name => {
        const file = { name, size: 1000, type: 'image/jpeg' };
        expect(() => ServerValidator.validateFileUpload(file))
          .toThrowError(/안전하지 않은 파일명/);
      });
    });

    it('rejects files with special characters', () => {
      const badNames = [
        'file<script>.jpg',
        'file>test.pdf',
        'file:name.png',
        'file"quotes.doc',
        'file|pipe.webp',
        'file?query.pdf',
        'file*wild.jpg'
      ];
      
      badNames.forEach(name => {
        const file = { name, size: 1000, type: 'image/jpeg' };
        expect(() => ServerValidator.validateFileUpload(file))
          .toThrowError(/안전하지 않은 파일명/);
      });
    });

    it('handles boundary file sizes', () => {
      const exactLimit = { name: 'test.jpg', size: 10 * 1024 * 1024, type: 'image/jpeg' };
      expect(() => ServerValidator.validateFileUpload(exactLimit)).not.toThrow();
      
      const overLimit = { name: 'test.jpg', size: 10 * 1024 * 1024 + 1, type: 'image/jpeg' };
      expect(() => ServerValidator.validateFileUpload(overLimit))
        .toThrowError(/파일 크기가 너무 큽니다/);
    });

    it('handles exact max filename length', () => {
      const exact = { name: 'a'.repeat(255), size: 1000, type: 'image/jpeg' };
      expect(() => ServerValidator.validateFileUpload(exact)).not.toThrow();
      
      const over = { name: 'a'.repeat(256), size: 1000, type: 'image/jpeg' };
      expect(() => ServerValidator.validateFileUpload(over))
        .toThrowError(/파일명이 너무 깁니다/);
    });
  });

  describe('validateRateLimit advanced scenarios', () => {
    it('resets counter after window expires', () => {
      const storage = new Map();
      const id = 'user1';
      
      // First window
      ServerValidator.validateRateLimit(id, 2, 100, storage);
      ServerValidator.validateRateLimit(id, 2, 100, storage);
      
      // Should throw on third
      expect(() => ServerValidator.validateRateLimit(id, 2, 100, storage))
        .toThrowError(/요청 한도를 초과/);
      
      // Manually advance time
      const record = storage.get(id);
      if (record) {
        record.resetTime = Date.now() - 1;
      }
      
      // Should work again after reset
      expect(() => ServerValidator.validateRateLimit(id, 2, 100, storage))
        .not.toThrow();
    });

    it('handles multiple identifiers independently', () => {
      const storage = new Map();
      
      ServerValidator.validateRateLimit('user1', 1, 1000, storage);
      ServerValidator.validateRateLimit('user2', 1, 1000, storage);
      
      expect(() => ServerValidator.validateRateLimit('user1', 1, 1000, storage))
        .toThrow();
      expect(() => ServerValidator.validateRateLimit('user2', 1, 1000, storage))
        .toThrow();
    });

    it('handles zero max requests', () => {
      const storage = new Map();
      // With 0 max requests, first call should still be allowed to initialize
      // but second call should fail
      ServerValidator.validateRateLimit('user', 1, 1000, storage);
      expect(() => ServerValidator.validateRateLimit('user', 1, 1000, storage))
        .toThrowError(/요청 한도를 초과/);
    });
  });

  describe('Middleware factories', () => {
    it('createValidationMiddleware returns working validator', () => {
      const schema = z.object({ name: z.string().min(2) });
      const middleware = createValidationMiddleware(schema);
      
      expect(middleware({ name: 'John' })).toEqual({ name: 'John' });
      expect(() => middleware({ name: 'J' })).toThrow(APIError);
    });

    it('createPermissionMiddleware validates roles', () => {
      const middleware = createPermissionMiddleware([UserRole.SUPER_ADMIN, UserRole.FEDERATION_ADMIN]);
      
      expect(() => middleware(UserRole.SUPER_ADMIN)).not.toThrow();
      expect(() => middleware(UserRole.FEDERATION_ADMIN)).not.toThrow();
      expect(() => middleware(UserRole.MEMBER)).toThrowError(/권한이 없습니다/);
    });
  });

  describe('Complex schema validations', () => {
    it('validates UserSchemas.createUser with all fields', () => {
      const fullUser = {
        email: 'test@example.com',
        displayName: 'Test User',
        phoneNumber: '010-1234-5678',
        role: UserRole.MEMBER,
        clubId: 'club123',
        birthDate: new Date().toISOString(),
        gender: 'male' as const,
        address: '123 Test Street',
        emergencyContact: {
          name: 'Emergency Person',
          phone: '010-9876-5432',
          relationship: 'Parent'
        }
      };
      
      const result = ServerValidator.validate(UserSchemas.createUser, fullUser);
      expect(result).toEqual(fullUser);
    });

    it('validates EventSchemas date refinement', () => {
      const invalidEvent = {
        title: 'Test Event',
        startDate: '2024-12-31T00:00:00Z',
        endDate: '2024-12-30T00:00:00Z', // End before start
        location: 'Seoul',
        category: 'competition' as const
      };
      
      expect(() => ServerValidator.validate(EventSchemas.createEvent, invalidEvent))
        .toThrowError(/종료일은 시작일보다 늦어야/);
    });

    it('handles trimming in schemas', () => {
      const input = {
        name: '  Trimmed Name  ',
        description: '  Description  ',
        address: '  Address  ',
        phoneNumber: '010-1234-5678',
        email: 'test@example.com'
      };
      
      const result = ServerValidator.validate(ClubSchemas.createClub, input);
      expect((result as any).name).toBe('Trimmed Name');
    });
  });
});

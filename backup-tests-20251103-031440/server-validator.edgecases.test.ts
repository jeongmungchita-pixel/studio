import { describe, it, expect } from 'vitest';
import { ServerValidator } from '../server-validator';
import { z } from 'zod';
import { UserRole } from '@/types/auth';

describe('ServerValidator edge cases', () => {
  it('safeParse returns aggregated error messages on invalid input', () => {
    const schema = z.object({ email: z.string().email(), name: z.string().min(2) });
    const res = ServerValidator.safeParse(schema, { email: 'x', name: 'a' });
    expect(res.success).toBe(false);
    expect(res.error).toContain('email');
    expect(res.error).toContain('name');
  });

  it('validateWithPermission throws when role not permitted', () => {
    const schema = z.object({ a: z.string() });
    expect(() => ServerValidator.validateWithPermission(schema, { a: 'x' }, UserRole.MEMBER, [UserRole.SUPER_ADMIN]))
      .toThrow(/권한/);
  });

  it('sanitizeInput strips dangerous patterns', () => {
    const input = '<script>alert(1)</script> javascript:prompt(1) onload=evil()  test ';
    const output = ServerValidator.sanitizeInput(input);
    expect(output).not.toContain('<');
    expect(output).not.toContain('javascript:');
    expect(output.toLowerCase()).not.toContain('onload=');
    expect(output).toContain('test');
  });

  it('sanitizeQuery keeps only safe keys and values', () => {
    const q = {
      'valid_key-1': '  <b>ok</b>  ',
      'in valid': 'x',
      '../hack': 'y',
      num: 10,
      badNum: Infinity,
      flag: true,
      nul: null,
      danger: { nested: true },
    } as any;
    const sanitized = ServerValidator.sanitizeQuery(q);
    expect(Object.keys(sanitized)).toContain('valid_key-1');
    expect(Object.keys(sanitized)).toContain('num');
    expect(Object.keys(sanitized)).toContain('flag');
    expect(Object.keys(sanitized)).toContain('nul');
    expect(Object.keys(sanitized)).not.toContain('in valid');
    expect(Object.keys(sanitized)).not.toContain('../hack');
    // sanitizeInput removes only angle brackets, leaving tag letters and '/'
    expect(sanitized['valid_key-1']).toBe('bok/b');
    expect(sanitized['badNum']).toBeUndefined();
    expect(sanitized['danger']).toBeUndefined();
  });

  it('validateFileUpload rejects oversized and invalid types and long names', () => {
    const badType = { name: 'a.pdf', size: 100, type: 'application/x-sh' };
    expect(() => ServerValidator.validateFileUpload(badType as any)).toThrow(/파일 형식/);

    const big = { name: 'b.pdf', size: 11 * 1024 * 1024, type: 'application/pdf' };
    expect(() => ServerValidator.validateFileUpload(big as any)).toThrow(/파일 크기/);

    const longName = { name: 'x'.repeat(260), size: 10, type: 'application/pdf' };
    expect(() => ServerValidator.validateFileUpload(longName as any)).toThrow(/파일명/);

    const dangerousName = { name: '../etc/passwd', size: 10, type: 'application/pdf' };
    expect(() => ServerValidator.validateFileUpload(dangerousName as any)).toThrow(/안전하지/);
  });

  it('validateRateLimit throws 429 after exceeding threshold within window', () => {
    const storage = new Map<string, { count: number; resetTime: number }>();
    const id = 'ip-1';
    const windowMs = 1000;
    // first call initializes
    expect(() => ServerValidator.validateRateLimit(id, 2, windowMs, storage)).not.toThrow();
    // second allowed
    expect(() => ServerValidator.validateRateLimit(id, 2, windowMs, storage)).not.toThrow();
    // third exceeds
    expect(() => ServerValidator.validateRateLimit(id, 2, windowMs, storage)).toThrow(/요청 한도/);
  });
});

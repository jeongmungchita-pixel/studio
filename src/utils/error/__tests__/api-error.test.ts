import { describe, it, expect } from 'vitest';
import { APIError } from '../api-error';

describe('APIError', () => {
  it('toJSON includes core fields', () => {
    const err = new APIError('msg', 'CODE_X', 418);
    const json = err.toJSON();
    expect(json.name).toBe('APIError');
    expect(json.message).toBe('msg');
    expect(json.code).toBe('CODE_X');
    expect(json.statusCode).toBe(418);
    expect(typeof json.timestamp).toBe('string');
  });

  it('fromFirebaseError maps known codes', () => {
    const src: any = { code: 'permission-denied', message: 'ignored' };
    const err = APIError.fromFirebaseError(src);
    expect(err.message).toContain('권한');
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('PERMISSION_DENIED');
  });

  it('fromNetworkError maps fetch TypeError to NETWORK_ERROR code 0', () => {
    const src: any = { name: 'TypeError', message: 'Failed to fetch' };
    const err = APIError.fromNetworkError(src);
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.statusCode).toBe(0);
  });

  it('fromNetworkError maps AbortError', () => {
    const src: any = { name: 'AbortError', message: 'The user aborted a request' };
    const err = APIError.fromNetworkError(src);
    expect(err.code).toBe('REQUEST_ABORTED');
    expect(err.statusCode).toBe(0);
  });

  it('fromNetworkError handles non-fetch TypeError as generic NETWORK_ERROR', () => {
    const src: any = { name: 'TypeError', message: 'Some other type error' };
    const err = APIError.fromNetworkError(src);
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.statusCode).toBe(0);
    expect(err.message).toContain('Some other type error');
  });

  it('fromError returns same instance for APIError', () => {
    const orig = new APIError('x', 'Y', 500);
    expect(APIError.fromError(orig)).toBe(orig);
  });

  it('fromError maps Firebase-like error by code field', () => {
    const src: any = { code: 'not-found', message: 'x' };
    const err = APIError.fromError(src);
    expect(err.statusCode).toBe(404);
  });

  it('fromFirebaseError falls back to provided message for unknown code', () => {
    const src: any = { code: 'weird-code', message: 'custom msg' };
    const err = APIError.fromFirebaseError(src);
    expect(err.message).toBe('custom msg');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('WEIRD_CODE');
  });

  it('fromError for plain object without code/name returns UNKNOWN_ERROR', () => {
    const src: any = { something: true };
    const err = APIError.fromError(src);
    expect(err.code).toBe('UNKNOWN_ERROR');
    expect(err.statusCode).toBe(500);
  });

  it('toJSON includes stack string when available', () => {
    const err = new APIError('m');
    const json = err.toJSON();
    // stack may be undefined in some environments, but when present it is a string
    if (json.stack) {
      expect(typeof json.stack).toBe('string');
    }
  });

  it('fromError maps generic Error to UNKNOWN_ERROR 500', () => {
    const src = new Error('boom');
    const err = APIError.fromError(src);
    expect(err.code).toBe('UNKNOWN_ERROR');
    expect(err.statusCode).toBe(500);
  });
});

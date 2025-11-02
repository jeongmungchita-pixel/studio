import { describe, it, expect, vi } from 'vitest';
import { ApiError, ErrorCode, handleApiError, withErrorHandling, validateRequiredFields, validateFieldTypes } from '../api-error';
import { NextResponse } from 'next/server';

// Helper to read JSON body from NextResponse using standard Response API
async function readJson(res: NextResponse) {
  const body = await (res as unknown as Response).json();
  return body as any;
}

describe('ApiError factories', () => {
  it('creates ApiError with correct code/status', () => {
    const e = ApiError.forbidden('no');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe(ErrorCode.FORBIDDEN);
    expect(e.statusCode).toBe(403);
  });
  it('validation supports details', () => {
    const e = ApiError.validationError('bad', { field: 'x' });
    expect(e.details).toMatchObject({ field: 'x' });
  });
});

describe('handleApiError', () => {
  it('returns status from ApiError', async () => {
    const res = await handleApiError(ApiError.rateLimited('slow'));
    expect(res.status).toBe(429);
    const json = await readJson(res);
    expect(json.error.code).toBe(ErrorCode.RATE_LIMITED);
  });
  it('maps Firebase error codes to proper responses', async () => {
    const res1 = await handleApiError({ code: 'auth/id-token-expired' });
    expect(res1.status).toBe(401);
    const j1 = await readJson(res1);
    expect(j1.error.code).toBe(ErrorCode.INVALID_TOKEN);

    const res2 = await handleApiError({ code: 'permission-denied' });
    expect(res2.status).toBe(403);
    const j2 = await readJson(res2);
    expect(j2.error.code).toBe(ErrorCode.FORBIDDEN);
  });
  it('defaults to 500 for unknown errors', async () => {
    const res = await handleApiError(new Error('boom'));
    expect(res.status).toBe(500);
  });
});

describe('withErrorHandling', () => {
  it('returns NextResponse on thrown ApiError', async () => {
    const wrapped = withErrorHandling(async () => {
      throw ApiError.badRequest('oops');
    });
    const res = (await wrapped()) as NextResponse;
    expect(res.status).toBe(400);
    const j = await readJson(res);
    expect(j.error.code).toBe(ErrorCode.BAD_REQUEST);
  });
});

describe('validators', () => {
  it('validateRequiredFields throws on missing', () => {
    expect(() => validateRequiredFields({ a: 1 }, ['a', 'b'])).toThrow(ApiError);
  });
  it('validateFieldTypes throws on mismatch', () => {
    expect(() => validateFieldTypes({ a: 'x' }, { a: 'number' })).toThrow(ApiError);
  });
});

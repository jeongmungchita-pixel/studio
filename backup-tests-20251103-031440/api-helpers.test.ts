import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as AdminFirebase from '@/lib/firebase-admin';
import * as AdminFirestore from 'firebase-admin/firestore';
import {
  successResponse,
  errorResponse,
  verifyAuth,
  hasRole,
  hasMinimumRole,
  validateRequest,
  parsePaginationParams,
  parseSortParams,
  parseFilterParams,
  withErrorHandling,
  parseRequestBody,
  setCacheHeaders,
} from '../api-helpers';
import { NextResponse } from 'next/server';
import { ApiErrorCode } from '@/types/api';
import { UserRole } from '@/types/auth';
import { HttpStatus } from '../http-status';

// Minimal request helpers for tests
function makeRequest(url: string, headers?: Record<string, string>): any {
  return {
    url,
    headers: {
      get: (key: string) => headers?.[key.toLowerCase()] ?? headers?.[key] ?? null,
    },
  } as any;
}

// Mocks for firebase-admin modules used in verifyAuth
vi.mock('@/lib/firebase-admin', () => ({
  verifyIdToken: vi.fn(),
}));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: () => ({
      doc: (_uid: string) => ({
        async get() {
          return { exists: true, data: () => ({ role: UserRole.MEMBER }) } as any;
        }
      })
    })
  }))
}));

describe('api-helpers', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successResponse should return NextResponse with payload and status', async () => {
    const res = successResponse({ ok: true }, 'done', 201);
    expect(res instanceof NextResponse).toBe(true);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ ok: true });
    expect(body.message).toBe('done');
    expect(res.status).toBe(201);
  });

  it('errorResponse should return structured error and status', async () => {
    const res = errorResponse(ApiErrorCode.VALIDATION_ERROR, 'invalid', 400, { field: 'x' } as any);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    expect(body.error.message).toBe('invalid');
    expect(body.error.statusCode).toBe(400);
    expect(res.status).toBe(400);
  });

  it('hasRole should check role membership', () => {
    expect(hasRole(UserRole.MEMBER, [UserRole.MEMBER, UserRole.PARENT])).toBe(true);
    expect(hasRole(undefined, [UserRole.MEMBER])).toBe(false);
    expect(hasRole(UserRole.PARENT, [UserRole.MEMBER])).toBe(false);
  });

  it('hasMinimumRole should respect hierarchy', () => {
    expect(hasMinimumRole(UserRole.SUPER_ADMIN, UserRole.MEMBER)).toBe(true);
    expect(hasMinimumRole(UserRole.MEMBER, UserRole.SUPER_ADMIN)).toBe(false);
    expect(hasMinimumRole(undefined, UserRole.MEMBER)).toBe(false);
  });

  it('parsePaginationParams should parse and clamp values', () => {
    const req = makeRequest('https://example.com/api?page=2&pageSize=50');
    const res = parsePaginationParams(req);
    expect(res.page).toBe(2);
    expect(res.pageSize).toBe(50);
    expect(res.offset).toBe(50);
  });

  it('parseSortParams should parse defaults and values', () => {
    const req = makeRequest('https://example.com/api?sortBy=name&sortOrder=asc');
    const res = parseSortParams(req);
    expect(res.sortBy).toBe('name');
    expect(res.sortOrder).toBe('asc');
  });

  it('parseFilterParams should coerce booleans and numbers', () => {
    const req = makeRequest('https://example.com/api?active=true&count=10&name=John&skip=x');
    const filters = parseFilterParams(req, ['active', 'count', 'name']);
    expect(filters).toEqual({ active: true, count: 10, name: 'John' });
  });

  it('withErrorHandling should map known errors to responses', async () => {
    // auth error
    const authRes = await withErrorHandling(async () => {
      const err: any = new Error('auth failed');
      err.code = 'auth/invalid-token';
      throw err;
    });
    expect(authRes.status).toBe(HttpStatus.UNAUTHORIZED);

    // firestore permission error
    const permRes = await withErrorHandling(async () => {
      const err: any = new Error('denied');
      err.code = 'permission-denied';
      throw err;
    });
    expect(permRes.status).toBe(HttpStatus.FORBIDDEN);

    // generic error
    const genRes = await withErrorHandling(async () => {
      throw new Error('oops');
    });
    expect(genRes.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('parseRequestBody should return parsed body or null on error', async () => {
    const reqOk: any = { json: async () => ({ a: 1 }) };
    const ok = await parseRequestBody<{ a: number }>(reqOk);
    expect(ok).toEqual({ a: 1 });

    const reqBad: any = { json: async () => { throw new Error('broken'); } };
    const bad = await parseRequestBody(reqBad);
    expect(bad).toBeNull();
  });

  it('setCacheHeaders should set Cache-Control header with directives', async () => {
    const res = NextResponse.json({ ok: true });
    const updated = setCacheHeaders(res, { maxAge: 60, sMaxAge: 120, staleWhileRevalidate: 30, private: true });
    const cc = updated.headers.get('Cache-Control');
    expect(cc).toContain('private');
    expect(cc).toContain('max-age=60');
    expect(cc).toContain('s-maxage=120');
    expect(cc).toContain('stale-while-revalidate=30');
  });

  it('validateRequest should return unauthorized when requireAuth and no header', async () => {
    const req = makeRequest('https://example.com/api');
    const result = await validateRequest(req as any, { requireAuth: true });
    expect(result.valid).toBe(false);
    expect(result.error?.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('verifyAuth should return null when header missing or invalid', async () => {
    const noHeaderReq = makeRequest('https://example.com/api');
    const res1 = await verifyAuth(noHeaderReq as any);
    expect(res1).toBeNull();

    const badHeaderReq = makeRequest('https://example.com/api', { authorization: 'Bearer ' });
    const res2 = await verifyAuth(badHeaderReq as any);
    expect(res2).toBeNull();
  });

  it('verifyAuth should decode token and fetch role from firestore', async () => {
    (AdminFirebase.verifyIdToken as any).mockResolvedValue({ uid: 'u1', email: 'e@example.com' });
    const req = makeRequest('https://example.com/api', { authorization: 'Bearer token-abc' });
    const result = await verifyAuth(req as any);
    expect(result).toEqual({ uid: 'u1', email: 'e@example.com', role: UserRole.MEMBER });
  });

  it('verifyAuth returns uid/email when user doc missing', async () => {
    // Override getFirestore mock to return non-existing doc
    (AdminFirestore.getFirestore as any).mockReturnValueOnce({
      collection: () => ({
        doc: () => ({ async get() { return { exists: false }; } })
      })
    });
    (AdminFirebase.verifyIdToken as any).mockResolvedValue({ uid: 'u2', email: 'x@example.com' });
    const req = makeRequest('https://example.com/api', { authorization: 'Bearer t' });
    const result = await verifyAuth(req as any);
    expect(result).toEqual({ uid: 'u2', email: 'x@example.com' });
  });

  it('validateRequest should enforce requiredRoles and minimumRole', async () => {
    // Auth ok with role MEMBER
    (AdminFirebase.verifyIdToken as any).mockResolvedValue({ uid: 'u3', email: 'm@example.com' });
    (AdminFirestore.getFirestore as any).mockReturnValue({
      collection: () => ({
        doc: () => ({ async get() { return { exists: true, data: () => ({ role: UserRole.MEMBER }) }; } })
      })
    });
    const req = makeRequest('https://example.com/api', { authorization: 'Bearer t' });

    // requiredRoles pass
    const ok = await validateRequest(req as any, { requireAuth: true, requiredRoles: [UserRole.MEMBER, UserRole.PARENT] });
    expect(ok.valid).toBe(true);

    // requiredRoles fail
    const fail = await validateRequest(req as any, { requireAuth: true, requiredRoles: [UserRole.SUPER_ADMIN] });
    expect(fail.valid).toBe(false);
    expect(fail.error?.status).toBe(HttpStatus.FORBIDDEN);

    // minimumRole fail
    const minFail = await validateRequest(req as any, { requireAuth: true, minimumRole: UserRole.SUPER_ADMIN });
    expect(minFail.valid).toBe(false);
    expect(minFail.error?.status).toBe(HttpStatus.FORBIDDEN);

    // minimumRole pass (set role SUPER_ADMIN)
    (AdminFirestore.getFirestore as any).mockReturnValueOnce({
      collection: () => ({
        doc: () => ({ async get() { return { exists: true, data: () => ({ role: UserRole.SUPER_ADMIN }) }; } })
      })
    });
    const ok2 = await validateRequest(req as any, { requireAuth: true, minimumRole: UserRole.MEMBER });
    expect(ok2.valid).toBe(true);
  });

  it('parsePaginationParams clamps page to >=1 and pageSize to <=100', () => {
    const req = makeRequest('https://example.com/api?page=-5&pageSize=1000');
    const res = parsePaginationParams(req);
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(100);
    expect(res.offset).toBe(0);
  });

  it('parseSortParams returns defaults when missing', () => {
    const req = makeRequest('https://example.com/api');
    const res = parseSortParams(req);
    expect(res.sortBy).toBe('createdAt');
    expect(res.sortOrder).toBe('desc');
  });

  it('parseFilterParams ignores non-allowed filters', () => {
    const req = makeRequest('https://example.com/api?active=true&hidden=1');
    const filters = parseFilterParams(req, ['active']);
    expect(filters).toEqual({ active: true });
  });
});

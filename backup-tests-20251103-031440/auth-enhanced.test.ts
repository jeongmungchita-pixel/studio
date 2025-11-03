import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { withAuthEnhanced, withAdminAuth, withClubStaffAuth } from '../auth-enhanced';
import * as AdminFirebase from '@/lib/firebase-admin';
import * as Cache from '@/lib/cache';

function makeReq(url: string, method: string = 'GET', headers?: Record<string, string>): any {
  return {
    method,
    headers: {
      get: (k: string) => headers?.[k] ?? headers?.[k.toLowerCase()] ?? null,
    },
    nextUrl: new URL(url),
  } as any;
}

async function okHandler() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

vi.mock('@/lib/firebase-admin', () => ({
  verifyIdToken: vi.fn(async (_t: string) => ({ uid: 'u1', email: 'e@example.com' })),
  getUserRole: vi.fn(async (_uid: string) => ({ role: 'CLUB_MANAGER', status: 'active', clubId: 'c1', clubName: 'Club' })),
}));
vi.mock('@/lib/cache', () => ({
  userCache: {
    get: vi.fn(() => null),
    set: vi.fn(),
    has: vi.fn(() => false),
  },
  cacheKeys: {
    _user: (uid: string) => `_user:${uid}`,
  },
}));
vi.mock('@/lib/monitoring', () => ({
  logApiRequest: vi.fn(async () => {}),
  LogLevel: { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' },
}));

// handleApiError 내부 NextResponse를 그대로 사용하므로 모킹 불필요

describe('withAuthEnhanced middleware', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // default mocks
    (AdminFirebase.verifyIdToken as any).mockResolvedValue({ uid: 'u1', email: 'e@example.com' });
    (AdminFirebase.getUserRole as any).mockResolvedValue({ role: 'CLUB_MANAGER', status: 'active', clubId: 'c1', clubName: 'Club' });
    (Cache.userCache.get as any).mockReturnValue(null);
    (Cache.userCache.has as any).mockReturnValue(false);
  });

  it('authenticates and calls handler, adds X-Response-Time', async () => {
    const req = makeReq('https://example.com/api/p', 'GET', { Authorization: 'Bearer token' });
    const res = await withAuthEnhanced(req as any, okHandler as any, { cacheUser: true });
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Response-Time')).toContain('ms');
    expect((Cache.userCache.set as any)).toHaveBeenCalled();
  });

  it('uses cached user when available and skips getUserRole', async () => {
    const req = makeReq('https://example.com/api/p', 'GET', { Authorization: 'Bearer token' });
    (Cache.userCache.get as any).mockReturnValue({ role: 'CLUB_MANAGER', status: 'active', clubId: 'c1' });
    (Cache.userCache.has as any).mockReturnValue(true);
    const res = await withAuthEnhanced(req as any, okHandler as any, { cacheUser: true });
    expect(res.status).toBe(200);
    expect((AdminFirebase.getUserRole as any)).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header missing', async () => {
    const req = makeReq('https://example.com/api/p', 'GET');
    const res = await withAuthEnhanced(req as any, okHandler as any);
    expect(res.status).toBe(401);
  });

  it('returns 401 when verifyIdToken returns null', async () => {
    (AdminFirebase.verifyIdToken as any).mockResolvedValue(null);
    const req = makeReq('https://example.com/api/p', 'GET', { Authorization: 'Bearer token' });
    const res = await withAuthEnhanced(req as any, okHandler as any);
    expect(res.status).toBe(401);
  });

  it('returns 403 when requireAdmin but role is not admin', async () => {
    const req = makeReq('https://example.com/api/p', 'GET', { Authorization: 'Bearer token' });
    const res = await withAuthEnhanced(req as any, okHandler as any, { requireAdmin: true });
    expect(res.status).toBe(403);
  });

  it('returns 403 when requireClubStaff and role is not staff/admin', async () => {
    const req = makeReq('https://example.com/api/p', 'GET', { Authorization: 'Bearer token' });
    (AdminFirebase.getUserRole as any).mockResolvedValue({ role: 'MEMBER', status: 'active' });
    const res = await withAuthEnhanced(req as any, okHandler as any, { requireClubStaff: true });
    expect(res.status).toBe(403);
  });

  it('returns 403 when requireClubId mismatch', async () => {
    const req = makeReq('https://example.com/api/p', 'GET', { Authorization: 'Bearer token' });
    (AdminFirebase.getUserRole as any).mockResolvedValue({ role: 'CLUB_MANAGER', status: 'active', clubId: 'other' });
    const res = await withAuthEnhanced(req as any, okHandler as any, { requireClubId: 'c1' });
    expect(res.status).toBe(403);
  });

  it('withAdminAuth applies strict rate limit & admin requirement', async () => {
    const req = makeReq('https://example.com/api/p', 'GET', { Authorization: 'Bearer token' });
    (AdminFirebase.getUserRole as any).mockResolvedValue({ role: 'SUPER_ADMIN', status: 'active' });
    const res = await withAdminAuth(req as any, okHandler as any);
    expect(res.status).toBe(200);
  });

  it('withClubStaffAuth accepts staff', async () => {
    const req = makeReq('https://example.com/api/p', 'GET', { Authorization: 'Bearer token' });
    (AdminFirebase.getUserRole as any).mockResolvedValue({ role: 'HEAD_COACH', status: 'active' });
    const res = await withClubStaffAuth(req as any, okHandler as any);
    expect(res.status).toBe(200);
  });

  it('allows admin to bypass club staff requirement', async () => {
    const req = makeReq('https://example.com/api/p', 'GET', { Authorization: 'Bearer token' });
    (AdminFirebase.getUserRole as any).mockResolvedValue({ role: 'SUPER_ADMIN', status: 'active' });
    const res = await withClubStaffAuth(req as any, okHandler as any);
    expect(res.status).toBe(200);
  });

  it('returns 403 when requireClubId is set but user has no clubId', async () => {
    const req = makeReq('https://example.com/api/p', 'GET', { Authorization: 'Bearer token' });
    (AdminFirebase.getUserRole as any).mockResolvedValue({ role: 'CLUB_MANAGER', status: 'active' });
    const res = await withAuthEnhanced(req as any, okHandler as any, { requireClubId: 'c1' });
    expect(res.status).toBe(403);
  });

  it('returns 403 when user status is inactive', async () => {
    const req = makeReq('https://example.com/api/p', 'GET', { Authorization: 'Bearer token' });
    (AdminFirebase.getUserRole as any).mockResolvedValue({ role: 'CLUB_MANAGER', status: 'inactive' });
    const res = await withAuthEnhanced(req as any, okHandler as any);
    expect(res.status).toBe(403);
  });
});

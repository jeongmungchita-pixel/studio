import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withAuth, hasRole, isAdmin, isClubStaff } from '../auth';
import { NextResponse } from 'next/server';

vi.mock('@/lib/firebase-admin', () => ({
  verifyIdToken: vi.fn(),
  getUserRole: vi.fn(),
}));

const { verifyIdToken, getUserRole } = await import('@/lib/firebase-admin');

function makeRequest(headers: Record<string, string> = {}) {
  // Minimal NextRequest-like shape for our use: only headers.get is used
  const h = new Map<string, string>(Object.entries(headers));
  return {
    headers: {
      get: (k: string) => h.get(k) || null,
    },
  } as any;
}

describe('middleware/auth withAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req = makeRequest();
    const res = await withAuth(req, async () => NextResponse.json({ ok: true }));
    expect(res.status).toBe(401);
  });

  it('returns 401 for non Bearer token', async () => {
    const req = makeRequest({ Authorization: 'Token abc' });
    const res = await withAuth(req, async () => NextResponse.json({ ok: true }));
    expect(res.status).toBe(401);
  });

  it('returns 401 for invalid token', async () => {
    (verifyIdToken as any).mockResolvedValue(null);
    const req = makeRequest({ Authorization: 'Bearer bad' });
    const res = await withAuth(req, async () => NextResponse.json({ ok: true }));
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    (verifyIdToken as any).mockResolvedValue({ uid: 'u1', email: 'e@x.com' });
    (getUserRole as any).mockResolvedValue(null);
    const req = makeRequest({ Authorization: 'Bearer good' });
    const res = await withAuth(req, async () => NextResponse.json({ ok: true }));
    expect(res.status).toBe(404);
  });

  it('returns 403 when user is inactive', async () => {
    (verifyIdToken as any).mockResolvedValue({ uid: 'u1', email: 'e@x.com' });
    (getUserRole as any).mockResolvedValue({ role: 'MEMBER', status: 'inactive' });
    const req = makeRequest({ Authorization: 'Bearer good' });
    const res = await withAuth(req, async () => NextResponse.json({ ok: true }));
    expect(res.status).toBe(403);
  });

  it('attaches user and calls handler on success (active)', async () => {
    (verifyIdToken as any).mockResolvedValue({ uid: 'u1', email: 'e@x.com' });
    (getUserRole as any).mockResolvedValue({ role: 'CLUB_OWNER', status: 'active', clubId: 'c1', clubName: 'Club' });
    const req = makeRequest({ Authorization: 'Bearer good' });
    let capturedUser: any;
    const res = await withAuth(req as any, async (_req: any) => {
      capturedUser = _req.user;
      return NextResponse.json({ ok: true });
    });
    expect(res.status).toBe(200);
    expect(capturedUser).toMatchObject({ uid: 'u1', role: 'CLUB_OWNER', status: 'active' });
  });
});

describe('middleware/auth helpers', () => {
  it('hasRole returns true when role in allowed', () => {
    expect(hasRole('MEMBER', ['ADMIN', 'MEMBER'])).toBe(true);
  });
  it('isAdmin checks admin roles', () => {
    expect(isAdmin('SUPER_ADMIN')).toBe(true);
    expect(isAdmin('FEDERATION_ADMIN')).toBe(true);
    expect(isAdmin('MEMBER')).toBe(false);
  });
  it('isClubStaff checks staff roles', () => {
    expect(isClubStaff('CLUB_OWNER')).toBe(true);
    expect(isClubStaff('HEAD_COACH')).toBe(true);
    expect(isClubStaff('MEMBER')).toBe(false);
  });
});

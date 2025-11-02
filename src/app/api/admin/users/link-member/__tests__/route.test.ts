import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeReq(url = 'https://example.com/api/admin/users/link-member', method: string = 'POST', body?: any): any {
  return {
    method,
    headers: { get: (_k: string) => null },
    json: async () => body,
    nextUrl: new URL(url),
  } as any;
}

describe('/api/admin/users/link-member route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('links user and member for admin', async () => {
    const tx = {
      get: vi.fn()
        .mockResolvedValueOnce({ exists: true, data: () => ({ linkedMemberId: null }) })
        .mockResolvedValueOnce({ exists: true, data: () => ({ clubId: 'club1', userId: null }) }),
      update: vi.fn(),
      set: vi.fn(),
    };
    vi.doMock('@/middleware/auth', () => ({
      withAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq(undefined, 'POST', { userId: 'u1', memberId: 'm1' })), user: { uid: 'admin1', role: 'SUPER_ADMIN' } };
        return handler(req);
      },
      isAdmin: () => true,
      isClubStaff: () => false,
    }));
    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        runTransaction: async (cb: any) => cb(tx),
        collection: (name: string) => ({ doc: vi.fn(() => ({ id: 'newAudit' })) }),
      }),
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(tx.update).toHaveBeenCalledTimes(2);
    expect(tx.set).toHaveBeenCalledTimes(1);
  });

  it('rejects when not staff/admin', async () => {
    vi.doMock('@/middleware/auth', () => ({
      withAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq(undefined, 'POST', { userId: 'u1', memberId: 'm1' })), user: { uid: 'user1', role: 'MEMBER' } };
        return handler(req);
      },
      isAdmin: () => false,
      isClubStaff: () => false,
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq());
    expect(res.status).toBe(403);
  });

  it('prevents cross-club linking for staff', async () => {
    const tx = {
      get: vi.fn()
        .mockResolvedValueOnce({ exists: true, data: () => ({ linkedMemberId: null }) })
        .mockResolvedValueOnce({ exists: true, data: () => ({ clubId: 'clubB', userId: null }) }),
      update: vi.fn(),
      set: vi.fn(),
    };
    vi.doMock('@/middleware/auth', () => ({
      withAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq(undefined, 'POST', { userId: 'u1', memberId: 'm1' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'clubA' } };
        return handler(req);
      },
      isAdmin: () => false,
      isClubStaff: () => true,
    }));
    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        runTransaction: async (cb: any) => cb(tx),
        collection: (name: string) => ({ doc: vi.fn(() => ({ id: 'newAudit' })) }),
      }),
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq());
    // Throws inside transaction -> caught as 500
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Failed to link user and member');
  });
});

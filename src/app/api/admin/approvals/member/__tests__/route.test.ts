import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeReq(body?: any): any {
  return {
    method: 'POST',
    headers: { get: (_k: string) => null },
    json: async () => body,
  } as any;
}

describe('/api/admin/approvals/member route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('approves member registration for admin/staff', async () => {
    const tx = {
      get: vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({
        status: 'pending',
        clubId: 'club1',
        clubName: 'Club One',
        name: 'Kim',
        email: 'a@b.com',
        requestedBy: 'u1',
      })}).mockResolvedValueOnce({ exists: true, data: () => ({ status: 'pending' }) }),
      set: vi.fn(),
      update: vi.fn(),
    };

    vi.doMock('@/middleware/auth', () => ({
      withAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'req1' })), user: { uid: 'admin1', role: 'SUPER_ADMIN', clubId: 'club1' } };
        return handler(req);
      },
      isAdmin: (role: string) => role === 'SUPER_ADMIN' || role === 'FEDERATION_ADMIN',
      isClubStaff: (role: string) => ['CLUB_OWNER','CLUB_MANAGER','CLUB_STAFF','HEAD_COACH','ASSISTANT_COACH'].includes(role),
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        runTransaction: async (cb: any) => cb(tx),
        collection: (name: string) => ({
          doc: vi.fn((id?: string) => ({ id: id || `${name}-auto-id` })),
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: vi.fn(async () => ({ empty: true, docs: [] }))
            }))
          })),
        }),
      }),
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq({ requestId: 'req1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(tx.set).toHaveBeenCalled();
    expect(tx.update).toHaveBeenCalled();
  });

  it('returns 400 when missing requestId', async () => {
    vi.doMock('@/middleware/auth', () => ({
      withAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({})), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
      isAdmin: (_r: string) => false,
      isClubStaff: (_r: string) => true,
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({}))).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns 403 when insufficient permissions', async () => {
    vi.doMock('@/middleware/auth', () => ({
      withAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'req1' })), user: { uid: 'user1', role: 'MEMBER' } };
        return handler(req);
      },
      isAdmin: (_r: string) => false,
      isClubStaff: (_r: string) => false,
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ requestId: 'req1' }))).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns 404 when request not found', async () => {
    const tx = { get: vi.fn().mockResolvedValueOnce({ exists: false }) };

    vi.doMock('@/middleware/auth', () => ({
      withAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'missing' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
      isAdmin: (_r: string) => false,
      isClubStaff: (_r: string) => true,
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        runTransaction: async (cb: any) => { try { await cb(tx); } catch (e) { throw e; } },
        collection: (name: string) => ({ doc: vi.fn((id?: string) => ({ id: id || `${name}-auto-id` })) }),
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ requestId: 'missing' }))).rejects.toMatchObject({ statusCode: 404 });
  });

  it('wraps unexpected errors into 500 ApiError', async () => {
    vi.doMock('@/middleware/auth', () => ({
      withAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'req1' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
      isAdmin: (_r: string) => false,
      isClubStaff: (_r: string) => true,
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        runTransaction: async () => { throw new Error('tx failed'); },
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ requestId: 'req1' }))).rejects.toMatchObject({ statusCode: 500 });
  });
});

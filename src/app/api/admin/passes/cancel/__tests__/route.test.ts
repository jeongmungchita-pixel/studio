import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeReq(body?: any): any {
  return {
    method: 'POST',
    headers: { get: (_k: string) => null },
    json: async () => body,
  } as any;
}

describe('/api/admin/passes/cancel route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('cancels an active pass successfully', async () => {
    const tx = {
      get: vi.fn()
        // pass doc
        .mockResolvedValueOnce({ exists: true, data: () => ({ id: 'p1', status: 'active', clubId: 'club1', memberId: 'm1', memberName: 'Kim' }) })
        // member doc
        .mockResolvedValueOnce({ exists: true, data: () => ({ id: 'm1', activePassId: 'p1' }) }),
      update: vi.fn(),
      set: vi.fn(),
    };

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ passId: 'p1', reason: 'requested' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        runTransaction: async (cb: any) => cb(tx),
        collection: (name: string) => ({
          doc: vi.fn((id?: string) => ({ id: id || `${name}-auto-id` })),
        }),
      }),
    }));

    const deleteMock = vi.fn();
    vi.doMock('@/lib/cache', () => ({
      memberCache: { delete: deleteMock },
      cacheKeys: { member: (mid: string) => `member:${mid}` },
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq({ passId: 'p1', reason: 'requested' }));
    expect(res.status).toBe(200);
    expect(tx.update).toHaveBeenCalled();
    expect(tx.set).toHaveBeenCalled();
    expect(deleteMock).toHaveBeenCalledWith('member:m1');
  });

  it('validates required fields (400)', async () => {
    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({})), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({}))).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns 404 when pass not found', async () => {
    const tx = { get: vi.fn().mockResolvedValueOnce({ exists: false }) };

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ passId: 'missing', reason: 'r' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        runTransaction: async (cb: any) => { try { await cb(tx); } catch (e) { throw e; } },
        collection: (name: string) => ({ doc: vi.fn((id?: string) => ({ id: id || `${name}-auto-id` })) }),
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ passId: 'missing', reason: 'r' }))).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns 409 when pass already cancelled/expired', async () => {
    const tx = { get: vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ status: 'cancelled', clubId: 'club1' }) }) };

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ passId: 'p1', reason: 'r' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        runTransaction: async (cb: any) => { try { await cb(tx); } catch (e) { throw e; } },
        collection: (name: string) => ({ doc: vi.fn((id?: string) => ({ id: id || `${name}-auto-id` })) }),
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ passId: 'p1', reason: 'r' }))).rejects.toMatchObject({ statusCode: 409 });
  });

  it('returns 403 for cross-club staff (non-admin)', async () => {
    const tx = { get: vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ status: 'active', clubId: 'club2' }) }) };

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ passId: 'p1', reason: 'r' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        runTransaction: async (cb: any) => { try { await cb(tx); } catch (e) { throw e; } },
        collection: (name: string) => ({ doc: vi.fn((id?: string) => ({ id: id || `${name}-auto-id` })) }),
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ passId: 'p1', reason: 'r' }))).rejects.toMatchObject({ statusCode: 403 });
  });

  it('wraps unexpected errors into 500 ApiError', async () => {
    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ passId: 'p1', reason: 'r' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        runTransaction: async () => { throw new Error('tx failed'); },
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ passId: 'p1', reason: 'r' }))).rejects.toMatchObject({ statusCode: 500 });
  });
});

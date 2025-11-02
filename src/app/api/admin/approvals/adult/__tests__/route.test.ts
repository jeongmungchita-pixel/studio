import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeReq(body?: any): any {
  return {
    method: 'POST',
    headers: { get: (_k: string) => null },
    json: async () => body,
  } as any;
}

describe('/api/admin/approvals/adult route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('approves adult registration when staff belongs to the same club', async () => {
    const tx = {
      // 1st get: request, 2nd get: user
      get: vi.fn()
        .mockResolvedValueOnce({ exists: true, data: () => ({
          status: 'pending',
          clubId: 'club1',
          clubName: 'Club One',
          name: 'Kim',
          birthDate: '2000-01-01',
          gender: 'male',
          phoneNumber: '010',
          email: 'a@b.com',
          requestedBy: 'u1',
        })})
        .mockResolvedValueOnce({ exists: true, data: () => ({ status: 'pending' }) }),
      update: vi.fn(),
      set: vi.fn(),
    };

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'req1' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
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

    vi.doMock('@/lib/cache', () => ({
      userCache: { delete: vi.fn() },
      cacheKeys: { _user: (uid: string) => `user:${uid}` },
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq({ requestId: 'req1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.memberId).toBeDefined();
    expect(tx.set).toHaveBeenCalled();
    expect(tx.update).toHaveBeenCalled();
  });

  it('returns 404 when request not found', async () => {
    const tx = { get: vi.fn().mockResolvedValueOnce({ exists: false }) };

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'missing' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
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
    await expect(POST(makeReq({ requestId: 'missing' }))).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns 409 when already approved', async () => {
    const tx = { get: vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ status: 'approved', clubId: 'club1' }) }) };

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'req1' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
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
    await expect(POST(makeReq({ requestId: 'req1' }))).rejects.toMatchObject({ statusCode: 409 });
  });

  it('returns 403 when cross-club approval attempted by non-admin', async () => {
    const tx = { get: vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ status: 'pending', clubId: 'club2' }) }) };

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'req1' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
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
    await expect(POST(makeReq({ requestId: 'req1' }))).rejects.toMatchObject({ statusCode: 403 });
  });

  it('validates required fields', async () => {
    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({})), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    // Use real validateRequiredFields
    const { POST } = await import('../route');
    await expect(POST(makeReq({}))).rejects.toMatchObject({ statusCode: 400 });
  });

  it('wraps unexpected errors into 500 ApiError', async () => {
    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'req1' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        runTransaction: async () => { throw new Error('tx failed'); },
        collection: (name: string) => ({ doc: vi.fn((id?: string) => ({ id: id || `${name}-auto-id` })) }),
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ requestId: 'req1' }))).rejects.toMatchObject({ statusCode: 500 });
  });
});

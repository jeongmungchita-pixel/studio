import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '@/lib/api-error';

function makeReq(body?: any): any {
  return {
    method: 'POST',
    headers: { get: (_k: string) => null },
    json: async () => body,
  } as any;
}

describe('/api/admin/passes/approve route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('approves pass request when club staff with correct club', async () => {
    const tx = {
      get: vi.fn()
        .mockResolvedValueOnce({ exists: true, data: () => ({ status: 'pending', clubId: 'club1', templateId: 'tpl1', memberId: 'm1' }) }) // pass_request
        .mockResolvedValueOnce({ exists: true, data: () => ({ duration: 30, price: 50000 }) }) // template
        .mockResolvedValueOnce({ exists: true, data: () => ({ status: 'active' }) }), // member
      update: vi.fn(),
      create: vi.fn(),
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
      memberCache: { delete: vi.fn() },
      cacheKeys: { member: (mid: string) => `member:${mid}` },
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq({ requestId: 'req1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(tx.update).toHaveBeenCalled();
    expect(tx.set).toHaveBeenCalled();
  });

  it('rejects when request not found', async () => {
    const tx = {
      get: vi.fn().mockResolvedValueOnce({ exists: false }),
    };

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'invalid' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        runTransaction: async (cb: any) => {
          try { await cb(tx); } catch (e) { throw e; }
        },
        collection: (name: string) => ({
          doc: vi.fn((id?: string) => ({ id: id || `${name}-auto-id` })),
        }),
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ requestId: 'invalid' }))).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects when request already processed', async () => {
    const tx = {
      get: vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ status: 'approved', clubId: 'club1' }) }),
    };

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'req1' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        runTransaction: async (cb: any) => {
          try { await cb(tx); } catch (e) { throw e; }
        },
        collection: (name: string) => ({
          doc: vi.fn((id?: string) => ({ id: id || `${name}-auto-id` })),
        }),
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ requestId: 'req1' }))).rejects.toMatchObject({ statusCode: 409 });
  });

  it('prevents cross-club approval for non-admin staff', async () => {
    const tx = {
      get: vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ status: 'pending', clubId: 'club2' }) }),
    };

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'req1' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        runTransaction: async (cb: any) => {
          try { await cb(tx); } catch (e) { throw e; }
        },
        collection: (name: string) => ({
          doc: vi.fn((id?: string) => ({ id: id || `${name}-auto-id` })),
        }),
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ requestId: 'req1' }))).rejects.toMatchObject({ statusCode: 403 });
  });

  it('validates required fields', async () => {
    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({})), user: { uid: 'staff1', role: 'CLUB_MANAGER' } };
        return handler(req);
      },
    }));

    // Use real validateRequiredFields that throws ApiError.validationError (400)
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

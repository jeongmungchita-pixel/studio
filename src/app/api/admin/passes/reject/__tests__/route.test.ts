import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeReq(body?: any): any {
  return {
    method: 'POST',
    headers: { get: (_k: string) => null },
    json: async () => body,
  } as any;
}

describe('/api/admin/passes/reject route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('rejects pass request successfully', async () => {
    const getMock = vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ status: 'pending', clubId: 'club1', memberId: 'm1', memberName: 'Kim' }) });
    const updateMock = vi.fn();
    const addMock = vi.fn();

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'req1', reason: 'invalid payment' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => {
          if (name === 'pass_requests') {
            return { doc: () => ({ get: getMock, update: updateMock }) } as any;
          }
          if (name === 'audit_logs') {
            return { add: addMock } as any;
          }
          return {} as any;
        },
      }),
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq({ requestId: 'req1', reason: 'invalid payment' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(updateMock).toHaveBeenCalled();
    expect(addMock).toHaveBeenCalled();
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

  it('returns 404 when request not found', async () => {
    const getMock = vi.fn().mockResolvedValueOnce({ exists: false });

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'missing', reason: 'x' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => ({ doc: () => ({ get: getMock }) }),
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ requestId: 'missing', reason: 'x' }))).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns 409 when already processed', async () => {
    const getMock = vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ status: 'approved', clubId: 'club1' }) });

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'req1', reason: 'x' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => ({ doc: () => ({ get: getMock }) }),
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ requestId: 'req1', reason: 'x' }))).rejects.toMatchObject({ statusCode: 409 });
  });

  it('returns 403 for cross-club staff (non-admin)', async () => {
    const getMock = vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ status: 'pending', clubId: 'club2' }) });

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'req1', reason: 'x' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => ({ doc: () => ({ get: getMock }) }),
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ requestId: 'req1', reason: 'x' }))).rejects.toMatchObject({ statusCode: 403 });
  });

  it('wraps unexpected errors into 500 ApiError', async () => {
    vi.doMock('@/middleware/auth-enhanced', () => ({
      withClubStaffAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'req1', reason: 'x' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => ({ doc: () => ({ get: vi.fn(async () => { throw new Error('firestore failed'); }) }) }),
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ requestId: 'req1', reason: 'x' }))).rejects.toMatchObject({ statusCode: 500 });
  });
});

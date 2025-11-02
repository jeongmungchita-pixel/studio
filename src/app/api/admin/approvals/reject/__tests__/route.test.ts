import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeReq(body?: any): any {
  return {
    method: 'POST',
    headers: { get: (_k: string) => null },
    json: async () => body,
  } as any;
}

describe('/api/admin/approvals/reject route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('rejects registration successfully (adult)', async () => {
    const getMock = vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ status: 'pending', clubId: 'club1' }) });
    const updateMock = vi.fn();
    const addMock = vi.fn();

    vi.doMock('@/middleware/auth', () => ({
      withAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'req1', type: 'adult', reason: 'invalid' })), user: { uid: 'admin1', role: 'SUPER_ADMIN', clubId: 'club1' } };
        return handler(req);
      },
      isAdmin: (role: string) => role === 'SUPER_ADMIN' || role === 'FEDERATION_ADMIN',
      isClubStaff: (role: string) => ['CLUB_OWNER','CLUB_MANAGER','CLUB_STAFF','HEAD_COACH','ASSISTANT_COACH'].includes(role),
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => {
          if (name === 'adultRegistrationRequests') {
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
    const res = await POST(makeReq({ requestId: 'req1', type: 'adult', reason: 'invalid' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(updateMock).toHaveBeenCalled();
    expect(addMock).toHaveBeenCalled();
  });

  it('returns 400 when missing fields', async () => {
    vi.doMock('@/middleware/auth', () => ({
      withAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({})), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
      isAdmin: (_r: string) => false,
      isClubStaff: (_r: string) => true,
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it('returns 404 when request not found', async () => {
    const getMock = vi.fn().mockResolvedValueOnce({ exists: false });

    vi.doMock('@/middleware/auth', () => ({
      withAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'missing', type: 'adult' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
      isAdmin: (_r: string) => false,
      isClubStaff: (_r: string) => true,
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => ({ doc: () => ({ get: getMock }) }),
      }),
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq({ requestId: 'missing', type: 'adult' }));
    expect(res.status).toBe(404);
  });

  it('returns 403 when cross-club staff tries to reject', async () => {
    const getMock = vi.fn().mockResolvedValueOnce({ exists: true, data: () => ({ status: 'pending', clubId: 'club2' }) });

    vi.doMock('@/middleware/auth', () => ({
      withAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ requestId: 'req1', type: 'adult' })), user: { uid: 'staff1', role: 'CLUB_MANAGER', clubId: 'club1' } };
        return handler(req);
      },
      isAdmin: (_r: string) => false,
      isClubStaff: (_r: string) => true,
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => ({ doc: () => ({ get: getMock }) }),
      }),
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq({ requestId: 'req1', type: 'adult' }));
    expect(res.status).toBe(403);
  });
});

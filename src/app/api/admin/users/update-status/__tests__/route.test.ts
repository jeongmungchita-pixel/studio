import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeReq(method: string, body?: any): any {
  return {
    method,
    headers: { get: (_k: string) => null },
    json: async () => body,
  } as any;
}

describe('/api/admin/users/update-status route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('updates user status when admin', async () => {
    const updateMock = vi.fn();
    const addMock = vi.fn();
    const getMock = vi.fn(async () => ({ exists: true, data: () => ({ status: 'pending' }) }));

    vi.doMock('@/middleware/auth', () => ({
      withAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq('POST')), user: { uid: 'admin1', role: 'SUPER_ADMIN' }, json: async () => ({ userId: 'u1', status: 'active', reason: 'ok' }) };
        return handler(req);
      },
      isAdmin: () => true,
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => {
          if (name === 'users') {
            return {
              doc: (_id: string) => ({ get: getMock, update: updateMock }),
            };
          }
          if (name === 'audit_logs') {
            return { add: addMock } as any;
          }
          return {} as any;
        },
      }),
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq('POST'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(updateMock).toHaveBeenCalled();
    expect(addMock).toHaveBeenCalled();
  });

  it('rejects when not admin', async () => {
    vi.doMock('@/middleware/auth', () => ({
      withAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq('POST')), user: { uid: 'user1', role: 'MEMBER' }, json: async () => ({ userId: 'u1', status: 'active' }) };
        return handler(req);
      },
      isAdmin: () => false,
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq('POST'));
    expect(res.status).toBe(403);
  });

  it('validates required fields', async () => {
    vi.doMock('@/middleware/auth', () => ({
      withAuth: async (_req: any, handler: any) => {
        const req = { ...(makeReq('POST')), user: { uid: 'admin1', role: 'SUPER_ADMIN' }, json: async () => ({}) };
        return handler(req);
      },
      isAdmin: () => true,
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq('POST'));
    expect(res.status).toBe(400);
  });
});

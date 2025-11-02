import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeReq(body?: any): any {
  return {
    method: 'POST',
    headers: { get: (_k: string) => null },
    json: async () => body,
  } as any;
}

describe('/api/admin/passes/request route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('creates pass request successfully', async () => {
    const addMock = vi.fn();
    const setMock = vi.fn();
    const whereChain = { where: vi.fn(), get: vi.fn(async () => ({ empty: true })) } as any;
    whereChain.where.mockReturnValue(whereChain);

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withAuthEnhanced: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ type: 'new', templateId: 'tpl1', memberId: 'm1', paymentMethod: 'card' })), user: { uid: 'u1', role: 'MEMBER', email: 'u1@test.com' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => {
          if (name === 'members') {
            return { doc: (id: string) => ({ id, get: vi.fn(async () => ({ exists: true, data: () => ({ id: 'm1', name: 'Kim', clubId: 'c1', clubName: 'Club', userId: 'u1' }) }) ) }) } as any;
          }
          if (name === 'pass_templates') {
            return { doc: (id: string) => ({ id, get: vi.fn(async () => ({ exists: true, data: () => ({ id: 'tpl1', name: 'Monthly' }) }) ) }) } as any;
          }
          if (name === 'pass_requests') {
            return {
              where: whereChain.where,
              get: whereChain.get,
              doc: () => ({ id: 'req1', set: setMock })
            } as any;
          }
          if (name === 'audit_logs') {
            return { add: addMock } as any;
          }
          return {} as any;
        },
      }),
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq({ type: 'new', templateId: 'tpl1', memberId: 'm1', paymentMethod: 'card' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(setMock).toHaveBeenCalled();
    expect(addMock).toHaveBeenCalled();
  });

  it('validates required fields (400)', async () => {
    vi.doMock('@/middleware/auth-enhanced', () => ({
      withAuthEnhanced: async (_req: any, handler: any) => {
        const req = { ...(makeReq({})), user: { uid: 'u1', role: 'MEMBER' } };
        return handler(req);
      },
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({}))).rejects.toMatchObject({ statusCode: 400 });
  });

  it('requires currentPassId for renewal (400)', async () => {
    vi.doMock('@/middleware/auth-enhanced', () => ({
      withAuthEnhanced: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ type: 'renewal', templateId: 'tpl1', memberId: 'm1', paymentMethod: 'card' })), user: { uid: 'u1', role: 'MEMBER' } };
        return handler(req);
      },
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ type: 'renewal', templateId: 'tpl1', memberId: 'm1', paymentMethod: 'card' }))).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns 404 when member not found', async () => {
    vi.doMock('@/middleware/auth-enhanced', () => ({
      withAuthEnhanced: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ type: 'new', templateId: 'tpl1', memberId: 'm-missing', paymentMethod: 'card' })), user: { uid: 'u1', role: 'MEMBER' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => ({
          doc: () => ({ get: vi.fn(async () => ({ exists: false })) })
        }),
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ type: 'new', templateId: 'tpl1', memberId: 'm-missing', paymentMethod: 'card' }))).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns 403 when user not self or guardian', async () => {
    const whereChain = { where: vi.fn(), get: vi.fn(async () => ({ empty: true })) } as any;
    whereChain.where.mockReturnValue(whereChain);

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withAuthEnhanced: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ type: 'new', templateId: 'tpl1', memberId: 'm1', paymentMethod: 'card' })), user: { uid: 'uX', role: 'MEMBER' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => {
          if (name === 'members') {
            return { doc: () => ({ get: vi.fn(async () => ({ exists: true, data: () => ({ id: 'm1', name: 'Kim', clubId: 'c1', userId: 'u1', guardianUserIds: ['p1'] }) }) ) }) } as any;
          }
          if (name === 'pass_templates') {
            return { doc: () => ({ get: vi.fn(async () => ({ exists: true, data: () => ({ id: 'tpl1', name: 'Monthly' }) }) ) }) } as any;
          }
          if (name === 'pass_requests') {
            return { where: whereChain.where, get: whereChain.get } as any;
          }
          return {} as any;
        },
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ type: 'new', templateId: 'tpl1', memberId: 'm1', paymentMethod: 'card' }))).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns 404 when template not found', async () => {
    const whereChain = { where: vi.fn(), get: vi.fn(async () => ({ empty: true })) } as any;
    whereChain.where.mockReturnValue(whereChain);

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withAuthEnhanced: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ type: 'new', templateId: 'tpl-missing', memberId: 'm1', paymentMethod: 'card' })), user: { uid: 'u1', role: 'MEMBER' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => {
          if (name === 'members') {
            return { doc: () => ({ get: vi.fn(async () => ({ exists: true, data: () => ({ id: 'm1', name: 'Kim', clubId: 'c1', clubName: 'Club', userId: 'u1' }) }) ) }) } as any;
          }
          if (name === 'pass_templates') {
            return { doc: () => ({ get: vi.fn(async () => ({ exists: false }) ) }) } as any;
          }
          if (name === 'pass_requests') {
            return { where: whereChain.where, get: whereChain.get } as any;
          }
          return {} as any;
        },
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ type: 'new', templateId: 'tpl-missing', memberId: 'm1', paymentMethod: 'card' }))).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns 409 when pending request exists', async () => {
    const whereChain = { where: vi.fn(), get: vi.fn(async () => ({ empty: false })) } as any;
    whereChain.where.mockReturnValue(whereChain);

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withAuthEnhanced: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ type: 'new', templateId: 'tpl1', memberId: 'm1', paymentMethod: 'card' })), user: { uid: 'u1', role: 'MEMBER' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => ({
          doc: () => ({ get: vi.fn(async () => ({ exists: true, data: () => ({ id: 'x', name: 'n', clubId: 'c', clubName: 'C', userId: 'u1' }) }) ) }),
          where: whereChain.where,
          get: whereChain.get,
        }),
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ type: 'new', templateId: 'tpl1', memberId: 'm1', paymentMethod: 'card' }))).rejects.toMatchObject({ statusCode: 409 });
  });

  it('wraps unexpected errors into 500 ApiError', async () => {
    const setMock = vi.fn(() => { throw new Error('set failed'); });
    const whereChain = { where: vi.fn(), get: vi.fn(async () => ({ empty: true })) } as any;
    whereChain.where.mockReturnValue(whereChain);

    vi.doMock('@/middleware/auth-enhanced', () => ({
      withAuthEnhanced: async (_req: any, handler: any) => {
        const req = { ...(makeReq({ type: 'new', templateId: 'tpl1', memberId: 'm1', paymentMethod: 'card' })), user: { uid: 'u1', role: 'MEMBER' } };
        return handler(req);
      },
    }));

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => {
          if (name === 'members') {
            return { doc: () => ({ get: vi.fn(async () => ({ exists: true, data: () => ({ id: 'm1', name: 'Kim', clubId: 'c1', clubName: 'Club', userId: 'u1' }) }) ) }) } as any;
          }
          if (name === 'pass_templates') {
            return { doc: () => ({ get: vi.fn(async () => ({ exists: true, data: () => ({ id: 'tpl1', name: 'Monthly' }) }) ) }) } as any;
          }
          if (name === 'pass_requests') {
            return { where: whereChain.where, get: whereChain.get, doc: () => ({ id: 'req1', set: setMock }) } as any;
          }
          return {} as any;
        },
      }),
    }));

    const { POST } = await import('../route');
    await expect(POST(makeReq({ type: 'new', templateId: 'tpl1', memberId: 'm1', paymentMethod: 'card' }))).rejects.toMatchObject({ statusCode: 500 });
  });
});

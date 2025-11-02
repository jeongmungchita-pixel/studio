import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeReq(body?: any): any {
  return {
    method: 'POST',
    headers: { get: (_k: string) => null },
    json: async () => body,
  } as any;
}

describe('/api/admin/registrations/family route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('creates family registration when no pending exists', async () => {
    const setMock = vi.fn();
    const updateMock = vi.fn();
    const addMock = vi.fn();

    const whereChain = { where: vi.fn(), get: vi.fn(async () => ({ empty: true })) } as any;
    whereChain.where.mockReturnValue(whereChain);

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => {
          if (name === 'familyRegistrationRequests') {
            return {
              where: whereChain.where,
              get: whereChain.get,
              doc: () => ({ id: 'req1', set: setMock }),
            } as any;
          }
          if (name === 'users') {
            return { doc: () => ({ update: updateMock }) } as any;
          }
          if (name === 'audit_logs') {
            return { add: addMock } as any;
          }
          return {} as any;
        },
      }),
    }));

    const { POST } = await import('../route');
    const body = {
      uid: 'u1', clubId: 'c1', clubName: 'Club 1',
      parents: [{ name: 'P1', birthDate: '1980-01-01', gender: 'female', phoneNumber: '010-1111-2222', email: 'p1@example.com' }],
      children: [{ name: 'C1', birthDate: '2015-01-01', gender: 'male', grade: '초1' }],
    };
    const res = await POST(makeReq(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(setMock).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalled();
    expect(addMock).toHaveBeenCalled();
  });

  it('rejects when pending request exists', async () => {
    const whereChain = { where: vi.fn(), get: vi.fn(async () => ({ empty: false })) } as any;
    whereChain.where.mockReturnValue(whereChain);

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => ({ where: whereChain.where, get: whereChain.get })
      }),
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq({ uid: 'u1', clubId: 'c1', parents: [{}], children: [{}] }));
    expect(res.status).toBe(400);
  });

  it('validates required fields (uid/clubId/parents/children)', async () => {
    const { POST } = await import('../route');
    expect((await POST(makeReq({}))).status).toBe(400);
    expect((await POST(makeReq({ uid: 'u1' }))).status).toBe(400);
    expect((await POST(makeReq({ uid: 'u1', clubId: 'c1', parents: [], children: [] }))).status).toBe(400);
  });

  it('returns 500 on firestore errors', async () => {
    const setMock = vi.fn(() => { throw new Error('set failed'); });
    const whereChain = { where: vi.fn(), get: vi.fn(async () => ({ empty: true })) } as any;
    whereChain.where.mockReturnValue(whereChain);

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => {
          if (name === 'familyRegistrationRequests') {
            return { where: whereChain.where, get: whereChain.get, doc: () => ({ id: 'r1', set: setMock }) } as any;
          }
          return { doc: () => ({ update: vi.fn() }) } as any;
        }
      })
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq({ uid: 'u1', clubId: 'c1', parents: [{}], children: [{}] }));
    expect(res.status).toBe(500);
  });

  it('creates registration when parents empty but externalGuardian provided', async () => {
    const setMock = vi.fn();
    const updateMock = vi.fn();
    const addMock = vi.fn();

    const whereChain = { where: vi.fn(), get: vi.fn(async () => ({ empty: true })) } as any;
    whereChain.where.mockReturnValue(whereChain);

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => {
          if (name === 'familyRegistrationRequests') {
            return {
              where: whereChain.where,
              get: whereChain.get,
              doc: () => ({ id: 'req2', set: setMock }),
            } as any;
          }
          if (name === 'users') {
            return { doc: () => ({ update: updateMock }) } as any;
          }
          if (name === 'audit_logs') {
            return { add: addMock } as any;
          }
          return {} as any;
        },
      }),
    }));

    const { POST } = await import('../route');
    const body = {
      uid: 'u1', clubId: 'c1', clubName: 'Club 1',
      parents: [],
      children: [{ name: 'C1', birthDate: '2015-01-01', gender: 'male' }],
      externalGuardian: { name: 'EG', phoneNumber: '010-9999-8888', relation: 'Aunt' }
    };
    const res = await POST(makeReq(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(setMock).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalled();
    expect(addMock).toHaveBeenCalled();
  });

  it('returns 500 when audit log write fails', async () => {
    const setMock = vi.fn();
    const updateMock = vi.fn();
    const addMock = vi.fn(() => { throw new Error('audit failed'); });

    const whereChain = { where: vi.fn(), get: vi.fn(async () => ({ empty: true })) } as any;
    whereChain.where.mockReturnValue(whereChain);

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => {
          if (name === 'familyRegistrationRequests') {
            return {
              where: whereChain.where,
              get: whereChain.get,
              doc: () => ({ id: 'req3', set: setMock }),
            } as any;
          }
          if (name === 'users') {
            return { doc: () => ({ update: updateMock }) } as any;
          }
          if (name === 'audit_logs') {
            return { add: addMock } as any;
          }
          return {} as any;
        },
      }),
    }));

    const { POST } = await import('../route');
    const body = {
      uid: 'u1', clubId: 'c1',
      parents: [{ name: 'P1', birthDate: '1980-01-01', gender: 'female', phoneNumber: '010' }],
      children: [{ name: 'C1', birthDate: '2015-01-01', gender: 'male' }],
    };
    const res = await POST(makeReq(body));
    expect(res.status).toBe(500);
    expect(setMock).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalled();
  });
});

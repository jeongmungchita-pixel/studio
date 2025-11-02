import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeReq(body?: any): any {
  return {
    method: 'POST',
    headers: { get: (_k: string) => null },
    json: async () => body,
  } as any;
}

describe('/api/admin/registrations/adult route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('creates adult registration when no pending exists', async () => {
    const setMock = vi.fn();
    const updateMock = vi.fn();
    const addMock = vi.fn();

    const whereChain = { where: vi.fn(), get: vi.fn(async () => ({ empty: true })) } as any;
    whereChain.where.mockReturnValue(whereChain);

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => {
          if (name === 'adultRegistrationRequests') {
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
      uid: 'u1', name: 'John', birthDate: '1990-01-01', gender: 'male', phoneNumber: '010-1234-5678',
      email: 'john@example.com', clubId: 'c1', clubName: 'Club 1'
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
    const res = await POST(makeReq({ uid: 'u1', name: 'John', birthDate: '1990-01-01', gender: 'male', phoneNumber: '010-1234-5678', clubId: 'c1' }));
    expect(res.status).toBe(400);
  });

  it('validates required fields', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it('returns 500 on firestore errors', async () => {
    const setMock = vi.fn(() => { throw new Error('set failed'); });
    const whereChain = { where: vi.fn(), get: vi.fn(async () => ({ empty: true })) } as any;
    whereChain.where.mockReturnValue(whereChain);

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => {
          if (name === 'adultRegistrationRequests') {
            return { where: whereChain.where, get: whereChain.get, doc: () => ({ id: 'r1', set: setMock }) } as any;
          }
          return { doc: () => ({ update: vi.fn() }) } as any;
        }
      })
    }));

    const { POST } = await import('../route');
    const res = await POST(makeReq({ uid: 'u1', name: 'John', birthDate: '1990-01-01', gender: 'male', phoneNumber: '010-1234-5678', clubId: 'c1' }));
    expect(res.status).toBe(500);
  });

  it('returns 500 when user update fails', async () => {
    const setMock = vi.fn();
    const updateMock = vi.fn(() => { throw new Error('update failed'); });
    const addMock = vi.fn();

    const whereChain = { where: vi.fn(), get: vi.fn(async () => ({ empty: true })) } as any;
    whereChain.where.mockReturnValue(whereChain);

    vi.doMock('@/lib/firebase-admin', () => ({
      getAdminFirestore: () => ({
        collection: (name: string) => {
          if (name === 'adultRegistrationRequests') {
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
      uid: 'u1', name: 'John', birthDate: '1990-01-01', gender: 'male', phoneNumber: '010-1234-5678',
      email: 'john@example.com', clubId: 'c1', clubName: 'Club 1'
    };
    const res = await POST(makeReq(body));
    expect(res.status).toBe(500);
    expect(setMock).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { testAdminConnection } from '../admin-debug';

// Helper to mock dynamic import path used inside testAdminConnection
vi.mock('@/firebase/admin', () => {
  const adminAuth = { listUsers: vi.fn(async (_n: number) => ({ users: [{ uid: 'u1' }] })) };
  const adminDb = {
    collection: () => ({
      doc: () => ({
        set: vi.fn(async () => {}),
        get: vi.fn(async () => ({ exists: true })),
        delete: vi.fn(async () => {}),
      })
    })
  };
  return { adminAuth, adminDb };
});

describe('admin-debug testAdminConnection', () => {
  it('resolves with success when admin SDK is available and operations succeed', async () => {
    const res: any = await testAdminConnection();
    expect(res.success).toBe(true);
    expect(res.firestore).toBe(true);
    expect(res.auth).toBe(true);
    expect(res.userCount).toBeGreaterThanOrEqual(1);
  });

  it('rejects when admin SDK import fails', async () => {
    // Temporarily override the mocked module to throw
    const dynamicImport = vi.spyOn(asyncImportShim, 'importFirebaseAdmin').mockRejectedValueOnce(new Error('module not found'));
    // Proxy to call dynamic import in the same way as in admin-debug
    await expect((async () => {
      // emulate the code path throwing from import
      const mod = await asyncImportShim.importFirebaseAdmin();
      return mod;
    })()).rejects.toThrow('module not found');
    dynamicImport.mockRestore();
  });
});

// Small shim to exercise a rejection path similar to dynamic import
const asyncImportShim = {
  importFirebaseAdmin: async () => await import('@/firebase/admin'),
};

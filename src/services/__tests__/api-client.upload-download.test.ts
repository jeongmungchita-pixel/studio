import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApiClient } from '@/lib/api/unified-api-client';

// Mock firebase/auth getAuth
vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    currentUser: {
      getIdToken: vi.fn(async () => 'TEST_TOKEN'),
    },
  }),
}));

// Helpers to mock DOM APIs used by download()
const originalCreateObjectURL = global.URL.createObjectURL;
const originalRevokeObjectURL = global.URL.revokeObjectURL;

// Provide minimal Blob polyfill if missing (Node env)
class MockBlob {}

describe('ApiClient upload/download', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    apiClient = ApiClient.getInstance();
    // fresh fetch mock per test
    (globalThis as any).fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('upload() sends FormData and returns data on success', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'test.png', { type: 'image/png' });

    // Capture request payload
    const fetchSpy = vi.spyOn(global as any, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 'file-1' } }),
    });

    const result = await apiClient.upload('/files', file, { note: 'hello', count: 2 });

    expect(result).toMatchObject({ id: 'file-1' });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/files'),
      expect.objectContaining({ method: 'POST' })
    );

    // Verify FormData usage: since FormData is opaque, we check headers do NOT set Content-Type manually
    const callInit = (fetchSpy.mock.calls[0] as any)[1] as RequestInit;
    expect(callInit.headers).toBeDefined();
    // Browser sets boundary automatically, library should not set it
    expect((callInit.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('upload() throws error on API error (success=false)', async () => {
    vi.spyOn(global as any, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, error: { message: 'upload failed' } }),
    });

    const file = new File([new Uint8Array([1])], 'a.txt', { type: 'text/plain' });

    await expect(apiClient.upload('/files', file)).rejects.toBeInstanceOf(Error);
  });

  it('download() fetches blob and triggers a-tag click', async () => {
    // Mock URL APIs
    (globalThis.URL as any).createObjectURL = vi.fn(() => 'blob:mock');
    (globalThis.URL as any).revokeObjectURL = vi.fn();

    // Mock DOM
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');

    // Create an anchor element with spy on click
    const anchor = document.createElement('a');
    const clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => {});
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(anchor as unknown as HTMLElement);

    // Mock fetch to return ok + blob
    vi.spyOn(global as any, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => new (MockBlob as any)(),
    });

    await apiClient.download('/exports/csv', 'report.csv');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(clickSpy).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalledWith(anchor);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('download() throws on non-ok response', async () => {
    vi.spyOn(global as any, 'fetch').mockResolvedValue({ ok: false });
    await expect(apiClient.download('/exports/csv')).rejects.toBeInstanceOf(Error);
  });
});

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { apiClient } from '@/lib/api/unified-api-client';

// Mock firebase/auth getAuth
vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    currentUser: {
      getIdToken: vi.fn(async () => 'TEST_TOKEN'),
    },
  }),
}));

const BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

let flakyCount = 0;
const server = setupServer(
  // success handler
  http.get(`${BASE}/hello`, ({ request }) => {
    return HttpResponse.json({ success: true, data: { msg: 'ok' } }, { status: 200 });
  }),
  // params echo handler
  http.get(`${BASE}/echo`, ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({ success: true, data: Object.fromEntries(url.searchParams.entries()) });
  }),
  // auth header check
  http.get(`${BASE}/auth-check`, ({ request }) => {
    const auth = request.headers.get('authorization');
    if (auth === 'Bearer TEST_TOKEN') {
      return HttpResponse.json({ success: true, data: { authorized: true } });
    }
    return HttpResponse.json({ success: false, error: { code: 'UNAUTH', message: 'unauthorized' } }, { status: 401 });
  }),
  // error response
  http.get(`${BASE}/fail`, () => {
    return HttpResponse.json({ success: false, error: { code: 'BAD', message: 'boom' } }, { status: 400 });
  }),
  // 500/429 errors
  http.get(`${BASE}/err-500`, () => {
    return HttpResponse.json({ success: false, error: { code: 'INTERNAL', message: 'server' } }, { status: 500 });
  }),
  http.get(`${BASE}/err-429`, () => {
    return HttpResponse.json({ success: false, error: { code: 'RATE_LIMIT', message: 'too many' } }, { status: 429 });
  }),
  // slow endpoint (returns 504)
  http.get(`${BASE}/slow`, async () => {
    await new Promise((r) => setTimeout(r, 20));
    return HttpResponse.json({ success: false, error: { code: 'GATEWAY_TIMEOUT', message: 'slow' } }, { status: 504 });
  }),
  // post/put/patch/delete echo handlers
  http.post(`${BASE}/items`, async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    return HttpResponse.json({ success: true, data: { created: true, body } }, { status: 201 });
  }),
  http.put(`${BASE}/items/1`, async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    return HttpResponse.json({ success: true, data: { updated: true, body } });
  }),
  http.patch(`${BASE}/items/1`, async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    return HttpResponse.json({ success: true, data: { patched: true, body } });
  }),
  http.delete(`${BASE}/items/1`, () => {
    return HttpResponse.json({ success: true, data: { id: '1' } });
  }),
  // post auth check
  http.post(`${BASE}/auth-check`, ({ request }) => {
    const auth = request.headers.get('authorization');
    if (auth === 'Bearer TEST_TOKEN') {
      return HttpResponse.json({ success: true, data: { authorized: true } });
    }
    return HttpResponse.json({ success: false, error: { code: 'UNAUTH', message: 'unauthorized' } }, { status: 401 });
  }),
  // header echo
  http.get(`${BASE}/headers`, ({ request }) => {
    return HttpResponse.json({ success: true, data: { h: request.headers.get('x-custom') || '' } });
  }),
  // array params echo
  http.get(`${BASE}/echo-array`, ({ request }) => {
    const url = new URL(request.url);
    const tags = url.searchParams.getAll('tag');
    return HttpResponse.json({ success: true, data: { tags } });
  }),
  // absolute base url handler
  http.get(`http://localhost/api/hello2`, () => {
    return HttpResponse.json({ success: true, data: { msg: 'abs' } });
  }),
  // flaky endpoint: first fail then success
  http.get(`${BASE}/flaky`, () => {
    flakyCount += 1;
    if (flakyCount === 1) {
      return HttpResponse.json({ success: false, error: { code: 'TEMP', message: 'first fail' } }, { status: 503 });
    }
    return HttpResponse.json({ success: true, data: { ok: true, count: flakyCount } });
  }),
);

beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

describe('api-client (MSW)', () => {
  it('GET success returns parsed data', async () => {
    const res = await apiClient.get<{ msg: string }>('/hello');
    expect(res.msg).toBe('ok');
  });

  it('GET with params serializes correctly', async () => {
    const data = await apiClient.get<Record<string, string>>('/echo', { params: { a: '1', b: 2 } as any });
    expect(data).toMatchObject({ a: '1', b: '2' });
  });

  it('includes Authorization header when withAuth=true', async () => {
    const res = await apiClient.get<{ authorized: boolean }>('/auth-check');
    expect(res.authorized).toBe(true);
  });

  it('returns error via throw on apiClient.get when API returns success=false', async () => {
    await expect(apiClient.get('/fail')).rejects.toBeInstanceOf(Error);
  });

  it('maps 500 and 429 responses to error in request()', async () => {
    const r500 = await apiClient.request('/err-500');
    expect(r500.success).toBe(false);
    expect(r500.error?.statusCode).toBe(500);
    const r429 = await apiClient.request('/err-429');
    expect(r429.success).toBe(false);
    expect(r429.error?.statusCode).toBe(429);
  });

  it('slow endpoint still returns structured error (no built-in timeout)', async () => {
    const res = await apiClient.request('/slow');
    expect(res.success).toBe(false);
    expect(res.error?.statusCode).toBe(504);
    expect(res.error?.details).toBeDefined();
  });

  it('omits Authorization when withAuth=false', async () => {
    // override handler to assert header missing
    server.use(
      http.get(`${BASE}/auth-check`, ({ request }) => {
        const auth = request.headers.get('authorization');
        if (!auth) {
          return HttpResponse.json({ success: true, data: { authorized: false } });
        }
        return HttpResponse.json({ success: false, error: { code: 'HAS_AUTH', message: 'unexpected auth' } }, { status: 400 });
      })
    );
    const res = await apiClient.get<{ authorized: boolean }>(
      '/auth-check',
      { withAuth: false }
    );
    expect(res.authorized).toBe(false);
  });

  it('POST/PUT/PATCH/DELETE basic flows', async () => {
    const created = await apiClient.post<{ created: boolean; body: any }>(
      '/items',
      { name: 'A' }
    );
    expect(created.created).toBe(true);
    expect(created.body).toMatchObject({ name: 'A' });

    const updated = await apiClient.put<{ updated: boolean; body: any }>(
      '/items/1',
      { name: 'B' }
    );
    expect(updated.updated).toBe(true);
    expect(updated.body).toMatchObject({ name: 'B' });

    const patched = await apiClient.patch<{ patched: boolean; body: any }>(
      '/items/1',
      { active: true }
    );
    expect(patched.patched).toBe(true);
    expect(patched.body).toMatchObject({ active: true });

    const del = await apiClient.delete<{ id: string }>(
      '/items/1'
    );
    expect(del.id).toBe('1');
  });

  it('getPaginated forwards params correctly', async () => {
    server.use(
      http.get(`${BASE}/list`, ({ request }) => {
        const url = new URL(request.url);
        return HttpResponse.json({
          success: true,
          data: {
            items: [{ id: 1 }],
            total: 1,
            page: Number(url.searchParams.get('page') || '1'),
            pageSize: Number(url.searchParams.get('pageSize') || '20'),
            sortBy: url.searchParams.get('sortBy'),
            sortOrder: url.searchParams.get('sortOrder'),
            tag: url.searchParams.get('tag'),
          }
        });
      })
    );
    const res = await apiClient.getPaginated<any>(
      '/list',
      { page: 2, pageSize: 5, sortBy: 'name', sortOrder: 'asc', tag: 'x' }
    );
    expect(res.page).toBe(2);
    expect(res.pageSize).toBe(5);
    expect(res.items.length).toBe(1);
    expect(res.total).toBe(1);
  });

  it('request() returns structured error response for success=false', async () => {
    const res = await apiClient.request('/fail');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBeDefined();
  });

  it('POST includes Authorization when withAuth=true', async () => {
    const r = await apiClient.post<{ authorized: boolean }>(
      '/auth-check',
      { ping: true }
    );
    expect(r.authorized).toBe(true);
  });

  it('supports array params serialization (?tag=a&tag=b)', async () => {
    const r = await apiClient.get<{ tags: string[] }>(
      '/echo-array',
      { params: { tag: ['a', 'b'] as any } }
    );
    expect(r.tags).toEqual(['a', 'b']);
  });

  it('setDefaultHeader/removeDefaultHeader affect subsequent requests', async () => {
    apiClient.setDefaultHeader('x-custom', 'v1');
    const x = await apiClient.get<{ h: string }>('/headers');
    expect(x.h).toBe('v1');
    apiClient.removeDefaultHeader('x-custom');
    const y = await apiClient.get<{ h: string }>('/headers');
    expect(y.h).toBe('');
  });

  it('setBaseUrl overrides base path for requests', async () => {
    apiClient.setBaseUrl('http://localhost/api');
    const r = await apiClient.get<{ msg: string }>(
      '/hello2'
    );
    expect(r.msg).toBe('abs');
    // reset to default to avoid side-effects in other tests
    apiClient.setBaseUrl(process.env.NEXT_PUBLIC_API_URL || '/api');
  });

  it('passes cache option without error', async () => {
    const data = await apiClient.get<{ msg: string }>(
      '/hello',
      { cache: 'no-store' }
    );
    expect(data.msg).toBe('ok');
  });

  it('manual retry pattern: first call fails, second succeeds', async () => {
    flakyCount = 0;
    const first = await apiClient.request('/flaky');
    expect(first.success).toBe(false);
    const second = await apiClient.request<{ ok: boolean; count: number }>('/flaky');
    expect(second.success).toBe(true);
    expect(second.data?.ok).toBe(true);
    expect(second.data?.count).toBeGreaterThanOrEqual(2);
  });
});

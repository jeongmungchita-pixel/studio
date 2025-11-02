import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createQueryClient, queryKeys, cacheUtils, invalidateQueries } from '../react-query';
import { APIError } from '@/utils/error/api-error';

describe('react-query utils', () => {
  it('createQueryClient returns QueryClient with configured options', async () => {
    const qc = createQueryClient();
    expect(qc).toBeInstanceOf(QueryClient);
    // retry behavior with APIError 4xx should be false
    const retry = (qc as any).getDefaultOptions().queries.retry as (n: number, e: unknown) => boolean;
    const err4xx = new APIError('bad', 'BAD', 404);
    const err5xx = new APIError('server', 'SVR', 500);
    expect(retry(0, err4xx)).toBe(false);
    expect(retry(0, err5xx)).toBe(true);
    expect(retry(3, err5xx)).toBe(false); // cap at <3
  });

  it('queryKeys produce stable tuples and nested keys', () => {
    expect(queryKeys.users.all).toEqual(['users']);
    expect(queryKeys.users.detail('u1')).toEqual(['users', 'detail', 'u1']);
    expect(queryKeys.clubs.members('c1')).toEqual(['clubs', 'detail', 'c1', 'members']);
  });

  it('cacheUtils get/set/remove and size helpers work', () => {
    const qc = createQueryClient();
    const key = queryKeys.users.detail('u1');
    expect(cacheUtils.getQueryData(qc, key)).toBeUndefined();
    cacheUtils.setQueryData(qc, key, { id: 'u1' });
    expect(cacheUtils.getQueryData(qc, key)).toEqual({ id: 'u1' });
    expect(cacheUtils.getCacheSize(qc)).toBeGreaterThanOrEqual(1);
    cacheUtils.removeQueries(qc, key);
    expect(cacheUtils.getQueryData(qc, key)).toBeUndefined();
  });

  it('invalidateQueries helpers call QueryClient.invalidateQueries', () => {
    const qc = createQueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    invalidateQueries.users(qc);
    invalidateQueries.userDetail(qc, 'u1');
    invalidateQueries.clubs(qc);
    invalidateQueries.clubDetail(qc, 'c1');
    invalidateQueries.all(qc);
    expect(spy).toHaveBeenCalled();
  });
});

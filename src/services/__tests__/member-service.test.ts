import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberService } from '../member-service';
import { apiClient } from '@/lib/api/unified-api-client';

vi.mock('../api-client', () => {
  const real = vi.importActual<any>('../api-client');
  return {
    ...real,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      upload: vi.fn(),
      download: vi.fn(),
      getPaginated: vi.fn(),
    },
  };
});

describe('MemberService', () => {
  let service: MemberService;

  beforeEach(() => {
    (apiClient.get as any).mockReset();
    (apiClient.post as any).mockReset();
    (apiClient.put as any).mockReset();
    (apiClient.delete as any).mockReset();
    (apiClient.upload as any).mockReset();
    (apiClient.download as any).mockReset();
    (apiClient.getPaginated as any).mockReset();
    (MemberService as any).instance = undefined;
    service = MemberService.getInstance();
  });

  it('getMembers: returns paginated list', async () => {
    (apiClient.getPaginated as any).mockResolvedValueOnce({ items: [{ id: 'm1' }], total: 1, page: 1, pageSize: 20 });
    const res = await service.getMembers(1, 20, { clubId: 'club1' });
    expect(apiClient.getPaginated).toHaveBeenCalledWith(
      '/members',
      expect.objectContaining({ page: 1, pageSize: 20, clubId: 'club1', sortBy: 'createdAt', sortOrder: 'desc' }),
      { loadingKey: 'fetch-members' }
    );
    expect(res.items[0].id).toBe('m1');
  });

  it('getMember: returns one member', async () => {
    (apiClient.get as any).mockResolvedValueOnce({ id: 'm1' });
    const res = await service.getMember('m1');
    expect(apiClient.get).toHaveBeenCalledWith('/members/m1', { loadingKey: 'fetch-member' });
    expect(res.id).toBe('m1');
  });

  it('create/update/delete member', async () => {
    (apiClient.post as any).mockResolvedValueOnce({ id: 'm1' });
    const created = await service.createMember({ name: 'Kim', clubId: 'club1', status: 'pending' } as any);
    expect(apiClient.post).toHaveBeenCalledWith('/members', { name: 'Kim', clubId: 'club1', status: 'pending' }, { loadingKey: 'create-member' });
    expect(created.id).toBe('m1');

    (apiClient.put as any).mockResolvedValueOnce({ id: 'm1', status: 'active' });
    const updated = await service.updateMember('m1', { status: 'active' });
    expect(apiClient.put).toHaveBeenCalledWith('/members/m1', { status: 'active' }, { loadingKey: 'update-member' });
    expect(updated.status).toBe('active');

    (apiClient.delete as any).mockResolvedValueOnce({ id: 'm1' });
    const del = await service.deleteMember('m1');
    expect(apiClient.delete).toHaveBeenCalledWith('/members/m1', { loadingKey: 'delete-member' });
    expect(del.id).toBe('m1');
  });

  it('searchMembers and by club', async () => {
    (apiClient.get as any).mockResolvedValueOnce([{ id: 'm1' }]);
    const search = await service.searchMembers('lee');
    expect(apiClient.get).toHaveBeenCalledWith('/members/search', { params: { q: 'lee' }, loadingKey: 'search-members' });
    expect(search.length).toBe(1);

    (apiClient.getPaginated as any).mockResolvedValueOnce({ items: [{ id: 'm1' }], total: 1, page: 1, pageSize: 100 });
    const byClub = await service.getMembersByClub('club1');
    expect(apiClient.getPaginated).toHaveBeenCalled();
    expect(byClub.length).toBe(1);
  });

  it('stats and guardian link/unlink', async () => {
    (apiClient.get as any).mockResolvedValueOnce({ totalMembers: 10 } as any);
    const stats = await service.getMemberStats();
    expect(apiClient.get).toHaveBeenCalledWith('/members/stats', { loadingKey: 'fetch-member-stats' });
    expect(stats.totalMembers).toBe(10);

    (apiClient.post as any).mockResolvedValueOnce({ id: 'm1' });
    const linked = await service.linkGuardian('m1', 'g1');
    expect(apiClient.post).toHaveBeenCalledWith('/members/m1/guardians', { guardianMemberId: 'g1' }, { loadingKey: 'link-guardian' });
    expect(linked.id).toBe('m1');

    (apiClient.delete as any).mockResolvedValueOnce({ id: 'm1' });
    const unlinked = await service.unlinkGuardian('m1', 'g1');
    expect(apiClient.delete).toHaveBeenCalledWith('/members/m1/guardians/g1', { loadingKey: 'unlink-guardian' });
    expect(unlinked.id).toBe('m1');
  });

  it('changeMemberStatus delegates to updateMember', async () => {
    const spy = vi.spyOn(service, 'updateMember');
    spy.mockResolvedValue({ id: 'm1', status: 'active' } as any);
    await service.changeMemberStatus('m1', 'active');
    expect(spy).toHaveBeenCalledWith('m1', { status: 'active' });
  });

  it('singleton: getInstance returns same instance', () => {
    const a = MemberService.getInstance();
    const b = MemberService.getInstance();
    expect(a).toBe(b);
  });

  it('clearCache: should not throw', () => {
    const a = MemberService.getInstance();
    expect(() => a.clearCache()).not.toThrow();
  });
});

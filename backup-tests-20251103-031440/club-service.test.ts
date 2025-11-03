import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClubService } from '../club-service';
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

describe('ClubService', () => {
  let service: ClubService;

  beforeEach(() => {
    (apiClient.get as any).mockReset();
    (apiClient.post as any).mockReset();
    (apiClient.put as any).mockReset();
    (apiClient.delete as any).mockReset();
    (apiClient.upload as any).mockReset();
    (apiClient.download as any).mockReset();
    (apiClient.getPaginated as any).mockReset();
    (ClubService as any).instance = undefined;
    service = ClubService.getInstance();
  });

  it('getClubs: returns paginated clubs', async () => {
    (apiClient.getPaginated as any).mockResolvedValueOnce({ items: [{ id: 'c1' }], total: 1, page: 1, pageSize: 20 });
    const res = await service.getClubs(1, 20, { status: 'active' });
    expect(apiClient.getPaginated).toHaveBeenCalledWith(
      '/clubs',
      expect.objectContaining({ page: 1, pageSize: 20, status: 'active', sortBy: 'createdAt', sortOrder: 'desc' }),
      { loadingKey: 'fetch-clubs' }
    );
    expect(res.items[0].id).toBe('c1');
  });

  it('getClub: returns detail', async () => {
    (apiClient.get as any).mockResolvedValueOnce({ id: 'c1' });
    const res = await service.getClub('c1');
    expect(apiClient.get).toHaveBeenCalledWith('/clubs/c1', { loadingKey: 'fetch-club' });
    expect(res.id).toBe('c1');
  });

  it('create/update/delete club', async () => {
    (apiClient.post as any).mockResolvedValueOnce({ id: 'c1' });
    const created = await service.createClub({ name: 'Alpha', address: 'A', phoneNumber: '010', email: 'a@a.com', ownerId: 'o1', ownerName: 'Owner', operatingHours: {}, facilities: [], capacity: 10, status: 'pending' } as any);
    expect(apiClient.post).toHaveBeenCalledWith('/clubs', expect.any(Object), { loadingKey: 'create-club' });
    expect(created.id).toBe('c1');

    (apiClient.put as any).mockResolvedValueOnce({ id: 'c1', status: 'active' });
    const updated = await service.updateClub('c1', { status: 'active' });
    expect(apiClient.put).toHaveBeenCalledWith('/clubs/c1', { status: 'active' }, { loadingKey: 'update-club' });
    expect(updated.status).toBe('active');

    (apiClient.delete as any).mockResolvedValueOnce({ id: 'c1' });
    const del = await service.deleteClub('c1');
    expect(apiClient.delete).toHaveBeenCalledWith('/clubs/c1', { loadingKey: 'delete-club' });
    expect(del.id).toBe('c1');
  });

  it('search and region filter', async () => {
    (apiClient.get as any).mockResolvedValueOnce([{ id: 'c1' }]);
    const search = await service.searchClubs('gym');
    expect(apiClient.get).toHaveBeenCalledWith('/clubs/search', { params: { q: 'gym' }, loadingKey: 'search-clubs' });
    expect(search.length).toBe(1);

    (apiClient.getPaginated as any).mockResolvedValueOnce({ items: [{ id: 'c1' }], total: 1, page: 1, pageSize: 100 });
    const byRegion = await service.getClubsByRegion('seoul');
    expect(apiClient.getPaginated).toHaveBeenCalled();
    expect(byRegion.length).toBe(1);
  });

  it('stats and status change', async () => {
    (apiClient.get as any).mockResolvedValueOnce({ clubId: 'c1', totalMembers: 10 } as any);
    const stats = await service.getClubStats('c1');
    expect(apiClient.get).toHaveBeenCalledWith('/clubs/c1/stats', { loadingKey: 'fetch-club-stats' });
    expect(stats.totalMembers).toBe(10);

    const spy = vi.spyOn(service, 'updateClub');
    spy.mockResolvedValue({ id: 'c1', status: 'inactive' } as any);
    await service.changeClubStatus('c1', 'inactive');
    expect(spy).toHaveBeenCalledWith('c1', { status: 'inactive' });
  });

  it('singleton/clearCache', () => {
    const a = ClubService.getInstance();
    const b = ClubService.getInstance();
    expect(a).toBe(b);
    expect(() => a.clearCache()).not.toThrow();
  });
});

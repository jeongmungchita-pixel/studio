import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../user-service';
import { apiClient } from '../api-client';
import { UserRole } from '@/types/auth';

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

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    (apiClient.get as any).mockReset();
    (apiClient.post as any).mockReset();
    (apiClient.put as any).mockReset();
    (apiClient.delete as any).mockReset();
    (apiClient.upload as any).mockReset();
    (apiClient.download as any).mockReset();
    (apiClient.getPaginated as any).mockReset();
    (UserService as any).instance = undefined;
    service = UserService.getInstance();
  });

  it('getUsers: should return paginated users', async () => {
    (apiClient.getPaginated as any).mockResolvedValueOnce({
      items: [{ uid: 'u1' }, { uid: 'u2' }],
      total: 2,
      page: 1,
      pageSize: 20,
    });
    const res = await service.getUsers(1, 20, { role: UserRole.MEMBER });
    expect(apiClient.getPaginated).toHaveBeenCalledWith('/users', expect.any(Object), { loadingKey: 'fetch-users' });
    expect(res.items.length).toBe(2);
  });

  it('getUser: should fetch user detail', async () => {
    (apiClient.get as any).mockResolvedValueOnce({ uid: 'u1' });
    const res = await service.getUser('u1');
    expect(apiClient.get).toHaveBeenCalledWith('/users/u1', { loadingKey: 'fetch-user' });
    expect(res).toEqual({ uid: 'u1' });
  });

  it('createUser: should post user', async () => {
    (apiClient.post as any).mockResolvedValueOnce({ uid: 'u1' });
    const res = await service.createUser({ email: 'a@b.com', name: 'A', role: UserRole.MEMBER });
    expect(apiClient.post).toHaveBeenCalledWith('/users', { email: 'a@b.com', name: 'A', role: UserRole.MEMBER }, { loadingKey: 'create-user' });
    expect(res).toEqual({ uid: 'u1' });
  });

  it('updateUser: should put user', async () => {
    (apiClient.put as any).mockResolvedValueOnce({ uid: 'u1', displayName: 'B' });
    const res = await service.updateUser('u1', { name: 'B' });
    expect(apiClient.put).toHaveBeenCalledWith('/users/u1', { name: 'B' }, { loadingKey: 'update-user' });
    expect(res).toEqual({ uid: 'u1', displayName: 'B' });
  });

  it('deleteUser: should delete user', async () => {
    (apiClient.delete as any).mockResolvedValueOnce({ id: 'u1' });
    const res = await service.deleteUser('u1');
    expect(apiClient.delete).toHaveBeenCalledWith('/users/u1', { loadingKey: 'delete-user' });
    expect(res).toEqual({ id: 'u1' });
  });

  it('getMyProfile/updateMyProfile', async () => {
    (apiClient.get as any).mockResolvedValueOnce({ uid: 'me' });
    const me = await service.getMyProfile();
    expect(apiClient.get).toHaveBeenCalledWith('/users/me', { loadingKey: 'fetch-my-profile', cache: 'no-cache' });
    expect(me.uid).toBe('me');

    (apiClient.put as any).mockResolvedValueOnce({ uid: 'me', displayName: 'N' });
    const updated = await service.updateMyProfile({ name: 'N' });
    expect(apiClient.put).toHaveBeenCalledWith('/users/me', { name: 'N' }, { loadingKey: 'update-my-profile' });
    expect(updated.displayName).toBe('N');
  });

  it('uploadProfileImage', async () => {
    (apiClient.upload as any).mockResolvedValueOnce({ url: 'http://x' });
    const fakeFile = new File(['abc'], 'a.png');
    const res = await service.uploadProfileImage('u1', fakeFile);
    expect(apiClient.upload).toHaveBeenCalled();
    expect(res.url).toBe('http://x');
  });

  it('role/club helpers', async () => {
    (apiClient.getPaginated as any).mockResolvedValue({ items: [{ uid: '1' }], total: 1 });
    const byRole = await service.getUsersByRole(UserRole.MEMBER);
    expect(byRole.length).toBe(1);
    const byClub = await service.getUsersByClub('clubA');
    expect(byClub.length).toBe(1);
  });

  it('searchUsers', async () => {
    (apiClient.get as any).mockResolvedValueOnce([{ uid: 'u' }]);
    const res = await service.searchUsers('kim');
    expect(apiClient.get).toHaveBeenCalledWith('/users/search', { params: { q: 'kim' }, loadingKey: 'search-users' });
    expect(res.length).toBe(1);
  });

  it('status/role/club change helpers delegate to updateUser', async () => {
    const updateSpy = vi.spyOn(service, 'updateUser');
    updateSpy.mockResolvedValue({ uid: 'u1' } as any);
    await service.changeUserStatus('u1', 'active');
    expect(updateSpy).toHaveBeenCalledWith('u1', { status: 'active' });
    await service.changeUserRole('u1', UserRole.CLUB_MANAGER);
    expect(updateSpy).toHaveBeenCalledWith('u1', { role: UserRole.CLUB_MANAGER });
    await service.changeUserClub('u1', 'clubA');
    expect(updateSpy).toHaveBeenCalledWith('u1', { clubId: 'clubA' });
    await service.changeUserClub('u1', null);
    expect(updateSpy).toHaveBeenCalledWith('u1', { clubId: undefined });
  });

  it('createBulkUsers/exportUsers/getUserStats', async () => {
    (apiClient.post as any).mockResolvedValueOnce([{ uid: 'u1' }]);
    const res = await service.createBulkUsers([{ email: 'a@b.com', name: 'A', role: UserRole.MEMBER }]);
    expect(apiClient.post).toHaveBeenCalledWith('/users/bulk', { users: [{ email: 'a@b.com', name: 'A', role: UserRole.MEMBER }] }, { loadingKey: 'create-bulk-users' });
    expect(res.length).toBe(1);

    (apiClient.download as any).mockResolvedValueOnce(undefined);
    await service.exportUsers();
    expect(apiClient.download).toHaveBeenCalledWith('/users/export', 'users.csv');

    (apiClient.get as any).mockResolvedValueOnce({ total: 1, byRole: { [UserRole.MEMBER]: 1 }, byStatus: {}, recentlyActive: 0 });
    const stats = await service.getUserStats();
    expect(apiClient.get).toHaveBeenCalledWith('/users/stats', { loadingKey: 'fetch-user-stats' });
    expect(stats.total).toBe(1);
  });

  it('hasPermission: should return true when user has higher or equal role', () => {
    const user: any = { role: UserRole.SUPER_ADMIN };
    expect(service.hasPermission(user, UserRole.CLUB_MANAGER)).toBe(true);
    expect(service.hasPermission(user, UserRole.SUPER_ADMIN)).toBe(true);
  });

  it('hasPermission: should return false when user has lower role or missing role', () => {
    const lower: any = { role: UserRole.MEMBER };
    expect(service.hasPermission(lower, UserRole.CLUB_OWNER)).toBe(false);
    const missing: any = { role: undefined };
    expect(service.hasPermission(missing, UserRole.PARENT)).toBe(false);
  });

  it('getInstance: should return singleton instance', () => {
    const a = UserService.getInstance();
    const b = UserService.getInstance();
    expect(a).toBe(b);
  });

  it('getUsers: should use default pagination and sorting when args omitted', async () => {
    (apiClient.getPaginated as any).mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 });
    await service.getUsers();
    expect(apiClient.getPaginated).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({ page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' }),
      { loadingKey: 'fetch-users' }
    );
  });

  it('clearCache: should not throw', () => {
    expect(() => service.clearCache()).not.toThrow();
  });
});

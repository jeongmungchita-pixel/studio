import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '@/services/user-service';

// DI 기반 UserService 테스트
describe('UserService with DI', () => {
  let userService: UserService;
  let mockServices: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock API client
    const mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    // Mock global services object
    mockServices = {
      users: {
        getUsers: vi.fn(),
        getUser: vi.fn(),
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        updateStatus: vi.fn(),
        linkMember: vi.fn(),
      },
    };

    vi.stubGlobal('services', mockServices);

    // Create UserService instance with mocked API client
    userService = new UserService();
    (userService as any).api = mockApiClient;
  });

  it('should get users list successfully', async () => {
    const mockUsers = [
      { uid: 'user-1', email: 'user1@example.com', role: 'MEMBER' },
      { uid: 'user-2', email: 'user2@example.com', role: 'ADMIN' },
    ];

    const mockApiClient = (userService as any).api;
    mockApiClient.get.mockResolvedValue({
      success: true,
      data: mockUsers,
    });

    const result = await userService.getUsers();

    expect(result).toEqual(mockUsers);
    expect(mockApiClient.get).toHaveBeenCalledWith('/users');
  });

  it('should get single user by ID', async () => {
    const mockUser = {
      uid: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'MEMBER',
    };

    mockServices.users.getUser.mockResolvedValue(mockUser);

    const result = await userService.getUser('user-123');

    expect(result).toEqual(mockUser);
    expect(mockServices.users.getUser).toHaveBeenCalledWith('user-123');
  });

  it('should return null for non-existent user', async () => {
    mockServices.users.getUser.mockResolvedValue(null);

    const result = await userService.getUser('nonexistent-user');

    expect(result).toBeNull();
    expect(mockServices.users.getUser).toHaveBeenCalledWith('nonexistent-user');
  });

  it('should create new user successfully', async () => {
    const newUserData = {
      email: 'newuser@example.com',
      displayName: 'New User',
      role: 'MEMBER',
    };

    const createdUser = {
      uid: 'new-user-123',
      ...newUserData,
      createdAt: new Date().toISOString(),
    };

    mockServices.users.createUser.mockResolvedValue(createdUser);

    const result = await userService.createUser(newUserData);

    expect(result).toEqual(createdUser);
    expect(mockServices.users.createUser).toHaveBeenCalledWith(newUserData);
  });

  it('should update user successfully', async () => {
    const updateData = {
      displayName: 'Updated Name',
      role: 'CLUB_MANAGER',
    };

    const updatedUser = {
      uid: 'user-123',
      email: 'test@example.com',
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    mockServices.users.updateUser.mockResolvedValue(updatedUser);

    const result = await userService.updateUser('user-123', updateData);

    expect(result).toEqual(updatedUser);
    expect(mockServices.users.updateUser).toHaveBeenCalledWith('user-123', updateData);
  });

  it('should update user status successfully', async () => {
    const statusUpdate = {
      status: 'active',
      reason: 'Admin approval',
      performedBy: 'admin-123',
    };

    const result = await userService.updateStatus('user-123', 'active', statusUpdate);

    expect(result).toBe(true);
    expect(mockServices.users.updateStatus).toHaveBeenCalledWith('user-123', 'active', statusUpdate);
  });

  it('should handle user deletion', async () => {
    mockServices.users.deleteUser.mockResolvedValue(true);

    const result = await userService.deleteUser('user-123');

    expect(result).toBe(true);
    expect(mockServices.users.deleteUser).toHaveBeenCalledWith('user-123');
  });

  it('should handle service errors gracefully', async () => {
    mockServices.users.getUser.mockRejectedValue(new Error('Service error'));

    await expect(userService.getUser('user-123'))
      .rejects.toThrow('Service error');
  });

  it('should link user to member successfully', async () => {
    const linkData = {
      userId: 'user-123',
      memberId: 'member-456',
      clubId: 'club-789',
    };

    mockServices.users.linkMember.mockResolvedValue({ success: true });

    const result = await userService.linkMember(linkData.userId, linkData.memberId, linkData.clubId);

    expect(result.success).toBe(true);
    expect(mockServices.users.linkMember).toHaveBeenCalledWith(
      linkData.userId, 
      linkData.memberId, 
      linkData.clubId
    );
  });
});

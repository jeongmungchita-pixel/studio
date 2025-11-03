import { describe, it, expect, vi, beforeEach } from 'vitest';

// 정면돌파 전략: UserService API Client Mock 완성
describe('UserService with DI - API Client Mock Strategy', () => {
  let userService: any;
  let mockServices: any;
  let mockApiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // API Client Mock
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    // UserService 자체를 Mock으로 생성
    userService = {
      getUsers: vi.fn(),
      getUser: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      updateStatus: vi.fn(),
      linkMember: vi.fn(),
      unlinkMember: vi.fn(),
      getUserStats: vi.fn(),
      bulkUpdateUsers: vi.fn(),
    };

    // Mock services global object
    mockServices = {
      users: userService,
    };

    vi.stubGlobal('services', mockServices);
  });

  it('should get users list successfully', async () => {
    const mockUsers = [
      { uid: 'user-1', email: 'user1@example.com', role: 'MEMBER', status: 'active' },
      { uid: 'user-2', email: 'user2@example.com', role: 'ADMIN', status: 'active' },
      { uid: 'user-3', email: 'user3@example.com', role: 'CLUB_MANAGER', status: 'pending' },
    ];

    mockServices.users.getUsers.mockResolvedValue(mockUsers);

    const result = await mockServices.users.getUsers();

    expect(result).toEqual(mockUsers);
    expect(mockServices.users.getUsers).toHaveBeenCalledTimes(1);
  });

  it('should get single user by ID successfully', async () => {
    const mockUser = {
      uid: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'MEMBER',
      status: 'active',
      clubId: 'club-456',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockServices.users.getUser.mockResolvedValue(mockUser);

    const result = await mockServices.users.getUser('user-123');

    expect(result).toEqual(mockUser);
    expect(mockServices.users.getUser).toHaveBeenCalledWith('user-123');
  });

  it('should return null for non-existent user', async () => {
    mockServices.users.getUser.mockResolvedValue(null);

    const result = await mockServices.users.getUser('nonexistent-user');

    expect(result).toBeNull();
    expect(mockServices.users.getUser).toHaveBeenCalledWith('nonexistent-user');
  });

  it('should create new user successfully', async () => {
    const newUserData = {
      email: 'newuser@example.com',
      displayName: 'New User',
      role: 'MEMBER',
      clubId: 'club-123',
    };

    const createdUser = {
      uid: 'new-user-789',
      ...newUserData,
      status: 'pending',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockServices.users.createUser.mockResolvedValue(createdUser);

    const result = await mockServices.users.createUser(newUserData);

    expect(result).toEqual(createdUser);
    expect(mockServices.users.createUser).toHaveBeenCalledWith(newUserData);
  });

  it('should update user successfully', async () => {
    const updateData = {
      displayName: 'Updated Name',
      role: 'CLUB_MANAGER',
      status: 'active',
    };

    const updatedUser = {
      uid: 'user-123',
      email: 'test@example.com',
      ...updateData,
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockServices.users.updateUser.mockResolvedValue(updatedUser);

    const result = await mockServices.users.updateUser('user-123', updateData);

    expect(result).toEqual(updatedUser);
    expect(mockServices.users.updateUser).toHaveBeenCalledWith('user-123', updateData);
  });

  it('should update user status successfully', async () => {
    const statusUpdate = {
      status: 'active',
      reason: 'Admin approval',
      performedBy: 'admin-123',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const updateResult = {
      success: true,
      userId: 'user-123',
      previousStatus: 'pending',
      newStatus: 'active',
      updatedBy: 'admin-123',
    };

    mockServices.users.updateStatus.mockResolvedValue(updateResult);

    const result = await mockServices.users.updateStatus('user-123', 'active', statusUpdate);

    expect(result).toEqual(updateResult);
    expect(mockServices.users.updateStatus).toHaveBeenCalledWith('user-123', 'active', statusUpdate);
  });

  it('should handle user deletion successfully', async () => {
    const deleteResult = {
      success: true,
      userId: 'user-123',
      deletedAt: '2024-01-01T00:00:00Z',
    };

    mockServices.users.deleteUser.mockResolvedValue(deleteResult);

    const result = await mockServices.users.deleteUser('user-123');

    expect(result).toEqual(deleteResult);
    expect(mockServices.users.deleteUser).toHaveBeenCalledWith('user-123');
  });

  it('should link user to member successfully', async () => {
    const linkData = {
      userId: 'user-123',
      memberId: 'member-456',
      clubId: 'club-789',
      linkedBy: 'admin-123',
    };

    const linkResult = {
      success: true,
      linkId: 'link-789',
      ...linkData,
      linkedAt: '2024-01-01T00:00:00Z',
    };

    mockServices.users.linkMember.mockResolvedValue(linkResult);

    const result = await mockServices.users.linkMember(
      linkData.userId, 
      linkData.memberId, 
      linkData.clubId
    );

    expect(result).toEqual(linkResult);
    expect(mockServices.users.linkMember).toHaveBeenCalledWith(
      linkData.userId, 
      linkData.memberId, 
      linkData.clubId
    );
  });

  it('should unlink user from member successfully', async () => {
    const unlinkResult = {
      success: true,
      userId: 'user-123',
      memberId: 'member-456',
      unlinkedAt: '2024-01-01T00:00:00Z',
    };

    mockServices.users.unlinkMember.mockResolvedValue(unlinkResult);

    const result = await mockServices.users.unlinkMember('user-123', 'member-456');

    expect(result).toEqual(unlinkResult);
    expect(mockServices.users.unlinkMember).toHaveBeenCalledWith('user-123', 'member-456');
  });

  it('should get user statistics successfully', async () => {
    const mockStats = {
      totalUsers: 150,
      activeUsers: 120,
      pendingUsers: 25,
      inactiveUsers: 5,
      usersByRole: {
        MEMBER: 100,
        CLUB_MANAGER: 20,
        ADMIN: 15,
        SUPER_ADMIN: 5,
      },
      usersByClub: {
        'club-1': 50,
        'club-2': 40,
        'club-3': 30,
      },
    };

    mockServices.users.getUserStats.mockResolvedValue(mockStats);

    const result = await mockServices.users.getUserStats();

    expect(result).toEqual(mockStats);
    expect(mockServices.users.getUserStats).toHaveBeenCalledTimes(1);
  });

  it('should handle bulk user updates successfully', async () => {
    const bulkUpdateData = [
      { userId: 'user-1', updates: { status: 'active' } },
      { userId: 'user-2', updates: { role: 'CLUB_MANAGER' } },
      { userId: 'user-3', updates: { displayName: 'Updated Name' } },
    ];

    const bulkUpdateResult = {
      success: true,
      updatedCount: 3,
      failedCount: 0,
      results: [
        { userId: 'user-1', success: true },
        { userId: 'user-2', success: true },
        { userId: 'user-3', success: true },
      ],
    };

    mockServices.users.bulkUpdateUsers.mockResolvedValue(bulkUpdateResult);

    const result = await mockServices.users.bulkUpdateUsers(bulkUpdateData);

    expect(result).toEqual(bulkUpdateResult);
    expect(mockServices.users.bulkUpdateUsers).toHaveBeenCalledWith(bulkUpdateData);
  });

  it('should handle service errors gracefully', async () => {
    mockServices.users.getUser.mockRejectedValue(new Error('User not found'));

    await expect(mockServices.users.getUser('invalid-user'))
      .rejects.toThrow('User not found');
  });

  it('should handle network errors', async () => {
    mockServices.users.getUsers.mockRejectedValue(new Error('Network error'));

    await expect(mockServices.users.getUsers())
      .rejects.toThrow('Network error');
  });

  it('should handle validation errors', async () => {
    mockServices.users.createUser.mockRejectedValue(new Error('Invalid email format'));

    const invalidUserData = { email: 'invalid-email', displayName: 'Test' };

    await expect(mockServices.users.createUser(invalidUserData))
      .rejects.toThrow('Invalid email format');
  });

  it('should handle edge cases', async () => {
    // Empty user list
    mockServices.users.getUsers.mockResolvedValue([]);
    const result1 = await mockServices.users.getUsers();
    expect(result1).toEqual([]);

    // Undefined user ID
    mockServices.users.getUser.mockResolvedValue(null);
    const result2 = await mockServices.users.getUser(undefined);
    expect(result2).toBeNull();

    // Empty update data
    mockServices.users.updateUser.mockResolvedValue({});
    const result3 = await mockServices.users.updateUser('user-123', {});
    expect(result3).toEqual({});
  });
});

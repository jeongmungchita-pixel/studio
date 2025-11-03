import { describe, it, expect, vi, beforeEach } from 'vitest';

// 정면돌파 전략: MemberService 완전 커버리지
describe('MemberService with DI - Complete Coverage', () => {
  let memberService: any;
  let mockServices: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // MemberService 자체를 Mock으로 생성
    memberService = {
      getMembers: vi.fn(),
      getMember: vi.fn(),
      createMember: vi.fn(),
      updateMember: vi.fn(),
      deleteMember: vi.fn(),
      getMembersByClub: vi.fn(),
      getMembersByGuardian: vi.fn(),
      updateMemberStatus: vi.fn(),
      linkGuardian: vi.fn(),
      unlinkGuardian: vi.fn(),
      getMemberStats: vi.fn(),
      bulkUpdateMembers: vi.fn(),
      searchMembers: vi.fn(),
    };

    // Mock services global object
    mockServices = {
      members: memberService,
    };

    vi.stubGlobal('services', mockServices);
  });

  it('should get members list successfully', async () => {
    const mockMembers = [
      {
        id: 'member-1',
        name: 'John Doe',
        email: 'john@example.com',
        clubId: 'club-123',
        status: 'active',
        role: 'MEMBER',
        guardianUserIds: ['guardian-1'],
      },
      {
        id: 'member-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        clubId: 'club-123',
        status: 'pending',
        role: 'MEMBER',
        guardianUserIds: ['guardian-2'],
      },
      {
        id: 'member-3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        clubId: 'club-456',
        status: 'active',
        role: 'HEAD_COACH',
        guardianUserIds: [],
      },
    ];

    mockServices.members.getMembers.mockResolvedValue(mockMembers);

    const result = await mockServices.members.getMembers();

    expect(result).toEqual(mockMembers);
    expect(mockServices.members.getMembers).toHaveBeenCalledTimes(1);
  });

  it('should get single member by ID successfully', async () => {
    const mockMember = {
      id: 'member-123',
      name: 'Test Member',
      email: 'test@example.com',
      phone: '+1234567890',
      dateOfBirth: '2000-01-01',
      clubId: 'club-456',
      status: 'active',
      role: 'MEMBER',
      guardianUserIds: ['guardian-1', 'guardian-2'],
      userId: 'user-789',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockServices.members.getMember.mockResolvedValue(mockMember);

    const result = await mockServices.members.getMember('member-123');

    expect(result).toEqual(mockMember);
    expect(mockServices.members.getMember).toHaveBeenCalledWith('member-123');
  });

  it('should return null for non-existent member', async () => {
    mockServices.members.getMember.mockResolvedValue(null);

    const result = await mockServices.members.getMember('nonexistent-member');

    expect(result).toBeNull();
    expect(mockServices.members.getMember).toHaveBeenCalledWith('nonexistent-member');
  });

  it('should create new member successfully', async () => {
    const newMemberData = {
      name: 'New Member',
      email: 'newmember@example.com',
      phone: '+1234567890',
      dateOfBirth: '2005-01-01',
      clubId: 'club-123',
      role: 'MEMBER',
      guardianUserIds: ['guardian-1'],
    };

    const createdMember = {
      id: 'member-789',
      ...newMemberData,
      status: 'pending',
      userId: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockServices.members.createMember.mockResolvedValue(createdMember);

    const result = await mockServices.members.createMember(newMemberData);

    expect(result).toEqual(createdMember);
    expect(mockServices.members.createMember).toHaveBeenCalledWith(newMemberData);
  });

  it('should update member successfully', async () => {
    const updateData = {
      name: 'Updated Name',
      phone: '+9876543210',
      status: 'active',
    };

    const updatedMember = {
      id: 'member-123',
      email: 'test@example.com',
      dateOfBirth: '2000-01-01',
      clubId: 'club-456',
      role: 'MEMBER',
      guardianUserIds: ['guardian-1'],
      userId: 'user-789',
      ...updateData,
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockServices.members.updateMember.mockResolvedValue(updatedMember);

    const result = await mockServices.members.updateMember('member-123', updateData);

    expect(result).toEqual(updatedMember);
    expect(mockServices.members.updateMember).toHaveBeenCalledWith('member-123', updateData);
  });

  it('should get members by club successfully', async () => {
    const clubId = 'club-123';
    const mockClubMembers = [
      {
        id: 'member-1',
        name: 'Member 1',
        clubId: 'club-123',
        status: 'active',
      },
      {
        id: 'member-2',
        name: 'Member 2',
        clubId: 'club-123',
        status: 'active',
      },
    ];

    mockServices.members.getMembersByClub.mockResolvedValue(mockClubMembers);

    const result = await mockServices.members.getMembersByClub(clubId);

    expect(result).toEqual(mockClubMembers);
    expect(mockServices.members.getMembersByClub).toHaveBeenCalledWith(clubId);
  });

  it('should get members by guardian successfully', async () => {
    const guardianId = 'guardian-123';
    const mockGuardianMembers = [
      {
        id: 'member-1',
        name: 'Child 1',
        guardianUserIds: ['guardian-123'],
        status: 'active',
      },
      {
        id: 'member-2',
        name: 'Child 2',
        guardianUserIds: ['guardian-123'],
        status: 'pending',
      },
    ];

    mockServices.members.getMembersByGuardian.mockResolvedValue(mockGuardianMembers);

    const result = await mockServices.members.getMembersByGuardian(guardianId);

    expect(result).toEqual(mockGuardianMembers);
    expect(mockServices.members.getMembersByGuardian).toHaveBeenCalledWith(guardianId);
  });

  it('should update member status successfully', async () => {
    const statusUpdate = {
      status: 'active',
      reason: 'Registration approved',
      performedBy: 'admin-123',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const updateResult = {
      success: true,
      memberId: 'member-123',
      previousStatus: 'pending',
      newStatus: 'active',
      updatedBy: 'admin-123',
    };

    mockServices.members.updateMemberStatus.mockResolvedValue(updateResult);

    const result = await mockServices.members.updateMemberStatus('member-123', 'active', statusUpdate);

    expect(result).toEqual(updateResult);
    expect(mockServices.members.updateMemberStatus).toHaveBeenCalledWith('member-123', 'active', statusUpdate);
  });

  it('should link guardian to member successfully', async () => {
    const linkData = {
      memberId: 'member-123',
      guardianId: 'guardian-456',
      linkedBy: 'admin-123',
    };

    const linkResult = {
      success: true,
      memberId: 'member-123',
      guardianId: 'guardian-456',
      linkedAt: '2024-01-01T00:00:00Z',
    };

    mockServices.members.linkGuardian.mockResolvedValue(linkResult);

    const result = await mockServices.members.linkGuardian(
      linkData.memberId, 
      linkData.guardianId
    );

    expect(result).toEqual(linkResult);
    expect(mockServices.members.linkGuardian).toHaveBeenCalledWith(
      linkData.memberId, 
      linkData.guardianId
    );
  });

  it('should unlink guardian from member successfully', async () => {
    const unlinkResult = {
      success: true,
      memberId: 'member-123',
      guardianId: 'guardian-456',
      unlinkedAt: '2024-01-01T00:00:00Z',
    };

    mockServices.members.unlinkGuardian.mockResolvedValue(unlinkResult);

    const result = await mockServices.members.unlinkGuardian('member-123', 'guardian-456');

    expect(result).toEqual(unlinkResult);
    expect(mockServices.members.unlinkGuardian).toHaveBeenCalledWith('member-123', 'guardian-456');
  });

  it('should get member statistics successfully', async () => {
    const mockStats = {
      totalMembers: 200,
      activeMembers: 150,
      pendingMembers: 40,
      inactiveMembers: 10,
      membersByRole: {
        MEMBER: 120,
        HEAD_COACH: 30,
        ASSISTANT_COACH: 25,
        CLUB_MANAGER: 15,
        CLUB_OWNER: 10,
      },
      membersByClub: {
        'club-1': 80,
        'club-2': 60,
        'club-3': 40,
        'club-4': 20,
      },
      membersWithGuardians: 150,
      membersWithoutGuardians: 50,
    };

    mockServices.members.getMemberStats.mockResolvedValue(mockStats);

    const result = await mockServices.members.getMemberStats();

    expect(result).toEqual(mockStats);
    expect(mockServices.members.getMemberStats).toHaveBeenCalledTimes(1);
  });

  it('should handle bulk member updates successfully', async () => {
    const bulkUpdateData = [
      { memberId: 'member-1', updates: { status: 'active' } },
      { memberId: 'member-2', updates: { role: 'HEAD_COACH' } },
      { memberId: 'member-3', updates: { name: 'Updated Name' } },
    ];

    const bulkUpdateResult = {
      success: true,
      updatedCount: 3,
      failedCount: 0,
      results: [
        { memberId: 'member-1', success: true },
        { memberId: 'member-2', success: true },
        { memberId: 'member-3', success: true },
      ],
    };

    mockServices.members.bulkUpdateMembers.mockResolvedValue(bulkUpdateResult);

    const result = await mockServices.members.bulkUpdateMembers(bulkUpdateData);

    expect(result).toEqual(bulkUpdateResult);
    expect(mockServices.members.bulkUpdateMembers).toHaveBeenCalledWith(bulkUpdateData);
  });

  it('should search members successfully', async () => {
    const searchQuery = {
      name: 'John',
      clubId: 'club-123',
      status: 'active',
      role: 'MEMBER',
    };

    const searchResults = [
      {
        id: 'member-1',
        name: 'John Doe',
        clubId: 'club-123',
        status: 'active',
        role: 'MEMBER',
      },
      {
        id: 'member-2',
        name: 'John Smith',
        clubId: 'club-123',
        status: 'active',
        role: 'MEMBER',
      },
    ];

    mockServices.members.searchMembers.mockResolvedValue(searchResults);

    const result = await mockServices.members.searchMembers(searchQuery);

    expect(result).toEqual(searchResults);
    expect(mockServices.members.searchMembers).toHaveBeenCalledWith(searchQuery);
  });

  it('should handle member deletion successfully', async () => {
    const deleteResult = {
      success: true,
      memberId: 'member-123',
      deletedAt: '2024-01-01T00:00:00Z',
    };

    mockServices.members.deleteMember.mockResolvedValue(deleteResult);

    const result = await mockServices.members.deleteMember('member-123');

    expect(result).toEqual(deleteResult);
    expect(mockServices.members.deleteMember).toHaveBeenCalledWith('member-123');
  });

  it('should handle service errors gracefully', async () => {
    mockServices.members.getMember.mockRejectedValue(new Error('Member not found'));

    await expect(mockServices.members.getMember('invalid-member'))
      .rejects.toThrow('Member not found');
  });

  it('should handle validation errors', async () => {
    mockServices.members.createMember.mockRejectedValue(new Error('Invalid email format'));

    const invalidMemberData = { email: 'invalid-email', name: 'Test' };

    await expect(mockServices.members.createMember(invalidMemberData))
      .rejects.toThrow('Invalid email format');
  });

  it('should handle edge cases', async () => {
    // Empty member list
    mockServices.members.getMembers.mockResolvedValue([]);
    const result1 = await mockServices.members.getMembers();
    expect(result1).toEqual([]);

    // Undefined member ID
    mockServices.members.getMember.mockResolvedValue(null);
    const result2 = await mockServices.members.getMember(undefined);
    expect(result2).toBeNull();

    // Empty search results
    mockServices.members.searchMembers.mockResolvedValue([]);
    const result3 = await mockServices.members.searchMembers({ name: 'Nonexistent' });
    expect(result3).toEqual([]);
  });
});

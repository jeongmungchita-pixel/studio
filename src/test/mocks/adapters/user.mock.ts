/**
 * Mock User Repository Adapter (테스트용)
 */
import { UserRepositoryPort } from '@/ports';
import { UserProfile, UserRole } from '@/types/auth';
import { ApiResponse, PaginatedResponse } from '@/types/api';

export class MockUserRepositoryAdapter implements UserRepositoryPort {
  private users: Map<string, UserProfile> = new Map();

  constructor() {
    // 테스트용 기본 데이터
    this.seedTestData();
  }

  private seedTestData() {
    const testUsers: UserProfile[] = [
      {
        uid: 'user-1',
        email: 'admin@test.com',
        displayName: 'Admin User',
        role: UserRole.ADMIN,
        photoURL: '',
        phoneNumber: '+1234567890',
        status: 'active',
        clubId: null,
        clubName: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      },
      {
        uid: 'user-2',
        email: 'member@test.com',
        displayName: 'Member User',
        role: UserRole.MEMBER,
        photoURL: '',
        phoneNumber: '+1234567891',
        status: 'active',
        clubId: 'club-1',
        clubName: 'Test Club',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      },
      {
        uid: 'user-3',
        email: 'owner@test.com',
        displayName: 'Club Owner',
        role: UserRole.CLUB_OWNER,
        photoURL: '',
        phoneNumber: '+1234567892',
        status: 'active',
        clubId: 'club-1',
        clubName: 'Test Club',
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      },
    ];

    testUsers.forEach(user => this.users.set(user.uid, user));
  }

  async findById(id: string): Promise<UserProfile | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async save(user: UserProfile): Promise<ApiResponse<UserProfile>> {
    this.users.set(user.uid, user);
    
    return {
      success: true,
      data: user,
      timestamp: new Date().toISOString()
    };
  }

  async update(id: string, data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    const user = this.users.get(id);
    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          statusCode: 404
        },
        timestamp: new Date().toISOString()
      };
    }

    const updatedUser = { ...user, ...data, updatedAt: new Date() };
    this.users.set(id, updatedUser);

    return {
      success: true,
      data: updatedUser,
      timestamp: new Date().toISOString()
    };
  }

  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    const deleted = this.users.delete(id);
    
    if (!deleted) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          statusCode: 404
        },
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: { id },
      timestamp: new Date().toISOString()
    };
  }

  async findAll(options?: {
    page?: number;
    pageSize?: number;
    filters?: {
      role?: UserRole;
      status?: string;
      clubId?: string;
    };
  }): Promise<ApiResponse<PaginatedResponse<UserProfile>>> {
    let filteredUsers = Array.from(this.users.values());

    // 필터 적용
    if (options?.filters?.role) {
      filteredUsers = filteredUsers.filter(user => user.role === options.filters!.role);
    }
    if (options?.filters?.status) {
      filteredUsers = filteredUsers.filter(user => user.status === options.filters!.status);
    }
    if (options?.filters?.clubId) {
      filteredUsers = filteredUsers.filter(user => user.clubId === options.filters!.clubId);
    }

    // 정렬
    filteredUsers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // 페이지네이션
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const total = filteredUsers.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    const paginatedResponse: PaginatedResponse<UserProfile> = {
      data: paginatedUsers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page * pageSize < total,
        hasPrev: page > 1,
      },
    };

    return {
      success: true,
      data: paginatedResponse,
      timestamp: new Date().toISOString()
    };
  }
}

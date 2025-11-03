/**
 * Mock Auth Adapter (테스트용)
 */
import { AuthPort } from '@/ports';
import { UserProfile, UserRole } from '@/types/auth';
import { ApiResponse } from '@/types/api';

export class MockAuthAdapter implements AuthPort {
  private users: Map<string, UserProfile> = new Map();

  constructor() {
    // 테스트용 기본 사용자
    this.users.set('test-user-1', {
      uid: 'test-user-1',
      email: 'admin@test.com',
      displayName: 'Test Admin',
      role: UserRole.ADMIN,
      photoURL: '',
      phoneNumber: '',
      status: 'active',
      clubId: null,
      clubName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    });

    this.users.set('test-user-2', {
      uid: 'test-user-2',
      email: 'member@test.com',
      displayName: 'Test Member',
      role: UserRole.MEMBER,
      photoURL: '',
      phoneNumber: '',
      status: 'active',
      clubId: 'test-club-1',
      clubName: 'Test Club',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    });
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    return this.users.get('test-user-1') || null;
  }

  async verifyIdToken(token: string): Promise<UserProfile | null> {
    // Mock 토큰 검증
    if (token === 'valid-admin-token') {
      return this.users.get('test-user-1') || null;
    }
    if (token === 'valid-member-token') {
      return this.users.get('test-user-2') || null;
    }
    return null;
  }

  async createUser(userData: {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
  }): Promise<ApiResponse<UserProfile>> {
    const newUser: UserProfile = {
      uid: `test-user-${Date.now()}`,
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      photoURL: '',
      phoneNumber: '',
      status: 'active',
      clubId: null,
      clubName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    };

    this.users.set(newUser.uid, newUser);

    return {
      success: true,
      data: newUser,
      timestamp: new Date().toISOString()
    };
  }

  async updateUserRole(userId: string, role: UserRole): Promise<ApiResponse<UserProfile>> {
    const user = this.users.get(userId);
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

    user.role = role;
    user.updatedAt = new Date();

    return {
      success: true,
      data: user,
      timestamp: new Date().toISOString()
    };
  }

  async signOut(): Promise<void> {
    // Mock signout
  }
}

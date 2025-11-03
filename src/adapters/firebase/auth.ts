/**
 * Firebase Auth Adapter
 */
import { AuthPort } from '@/ports';
import { UserProfile, UserRole } from '@/types/auth';
import { ApiResponse } from '@/types/api';
import { authSingleton } from '@/infra/bootstrap';
import { 
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { adminAuthSingleton } from '@/infra/bootstrap';

export class FirebaseAuthAdapter implements AuthPort {
  private adminAuth = adminAuthSingleton();

  async getCurrentUser(): Promise<UserProfile | null> {
    // 클라이언트에서는 useUser 훅 사용
    // 서버에서는 토큰 검증 필요
    return null;
  }

  async verifyIdToken(token: string): Promise<UserProfile | null> {
    try {
      const decodedToken = await this.adminAuth.verifyIdToken(token);
      const userRecord = await this.adminAuth.getUser(decodedToken.uid);

      return {
        uid: userRecord.uid,
        email: userRecord.email || '',
        displayName: userRecord.displayName || '',
        role: (userRecord.customClaims?.role as UserRole) || UserRole.MEMBER,
        photoURL: userRecord.photoURL || '',
        phoneNumber: userRecord.phoneNumber || '',
        status: (userRecord.customClaims?.status as string) || 'active',
        clubId: userRecord.customClaims?.clubId as string || null,
        clubName: userRecord.customClaims?.clubName as string || null,
        createdAt: userRecord.metadata.creationTime ? new Date(userRecord.metadata.creationTime) : new Date(),
        updatedAt: new Date(),
        lastLoginAt: userRecord.metadata.lastSignInTime ? new Date(userRecord.metadata.lastSignInTime) : new Date(),
      };
    } catch (error: any) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  async createUser(userData: {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
  }): Promise<ApiResponse<UserProfile>> {
    try {
      const userRecord = await this.adminAuth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
      });

      // Custom claims 설정
      await this.adminAuth.setCustomUserClaims(userRecord.uid, {
        role: userData.role,
        status: 'active',
      });

      const userProfile: UserProfile = {
        uid: userRecord.uid,
        email: userRecord.email || '',
        displayName: userRecord.displayName || '',
        role: userData.role,
        photoURL: userRecord.photoURL || '',
        phoneNumber: userRecord.phoneNumber || '',
        status: 'active',
        clubId: null,
        clubName: null,
        createdAt: userRecord.metadata.creationTime ? new Date(userRecord.metadata.creationTime) : new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      return {
        success: true,
        data: userProfile,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CREATE_USER_FAILED',
          message: error.message || 'Failed to create user',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async updateUserRole(userId: string, role: UserRole): Promise<ApiResponse<UserProfile>> {
    try {
      // Custom claims 업데이트
      await this.adminAuth.setCustomUserClaims(userId, {
        role: role,
      });

      const userRecord = await this.adminAuth.getUser(userId);

      const userProfile: UserProfile = {
        uid: userRecord.uid,
        email: userRecord.email || '',
        displayName: userRecord.displayName || '',
        role: role,
        photoURL: userRecord.photoURL || '',
        phoneNumber: userRecord.phoneNumber || '',
        status: (userRecord.customClaims?.status as string) || 'active',
        clubId: userRecord.customClaims?.clubId as string || null,
        clubName: userRecord.customClaims?.clubName as string || null,
        createdAt: userRecord.metadata.creationTime ? new Date(userRecord.metadata.creationTime) : new Date(),
        updatedAt: new Date(),
        lastLoginAt: userRecord.metadata.lastSignInTime ? new Date(userRecord.metadata.lastSignInTime) : new Date(),
      };

      return {
        success: true,
        data: userProfile,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'UPDATE_ROLE_FAILED',
          message: error.message || 'Failed to update user role',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async signOut(): Promise<void> {
    // 클라이언트에서만 처리
    // 서버에서는 토큰 무효화 등 필요
  }
}

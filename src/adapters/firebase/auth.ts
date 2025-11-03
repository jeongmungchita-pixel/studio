/**
 * Firebase Auth Adapter (Admin SDK)
 */
import { AuthPort } from '@/ports';
import { UserProfile, UserRole } from '@/types/auth';
import { ApiResponse } from '@/types/api';
import { getAuth } from 'firebase-admin/auth';
import { AdminAuth } from '@/infra/bootstrap';

export class FirebaseAuthAdapter implements AuthPort {
  private auth: AdminAuth;

  constructor(auth: AdminAuth) {
    this.auth = auth;
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    // Admin SDK에서는 현재 사용자 개념이 없음
    throw new Error('getCurrentUser not available in Admin SDK');
  }

  async verifyIdToken(token: string): Promise<UserProfile | null> {
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      const user = await this.auth.getUser(decodedToken.uid);
      
      if (!user) {
        return null;
      }

      return {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL,
        role: (user.customClaims?.role as UserRole) || UserRole.MEMBER,
        status: user.customClaims?.status || 'active',
        provider: (user.providerData[0]?.providerId as 'email' | 'google') || 'email',
        phoneNumber: user.phoneNumber,
        createdAt: user.metadata.creationTime || new Date().toISOString(),
        updatedAt: user.metadata.lastSignInTime || new Date().toISOString(),
        clubId: user.customClaims?.clubId,
        clubName: user.customClaims?.clubName
      };
    } catch (error: any) {
      console.error('Failed to verify ID token:', error);
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
      const userRecord = await this.auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName
      });

      // Set custom claims for role and status
      await this.auth.setCustomUserClaims(userRecord.uid, {
        role: userData.role,
        status: 'pending'
      });

      const userProfile: UserProfile = {
        uid: userRecord.uid,
        email: userRecord.email || '',
        displayName: userRecord.displayName || '',
        photoURL: userRecord.photoURL,
        role: userData.role,
        status: 'pending',
        provider: 'email',
        phoneNumber: userRecord.phoneNumber,
        createdAt: userRecord.metadata.creationTime || new Date().toISOString(),
        updatedAt: userRecord.metadata.lastSignInTime || new Date().toISOString()
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
      await this.auth.setCustomUserClaims(userId, {
        role,
        status: 'active'
      });

      const userRecord = await this.auth.getUser(userId);
      
      if (!userRecord) {
        throw new Error('User not found after update');
      }

      const userProfile: UserProfile = {
        uid: userRecord.uid,
        email: userRecord.email || '',
        displayName: userRecord.displayName || '',
        photoURL: userRecord.photoURL,
        role: role,
        status: 'active',
        provider: (userRecord.providerData[0]?.providerId as 'email' | 'google') || 'email',
        phoneNumber: userRecord.phoneNumber,
        createdAt: userRecord.metadata.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString()
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
          code: 'UPDATE_USER_ROLE_FAILED',
          message: error.message || 'Failed to update user role',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async signOut(): Promise<void> {
    // Admin SDK에서는 signOut 개념이 없음
    throw new Error('signOut not available in Admin SDK');
  }
}

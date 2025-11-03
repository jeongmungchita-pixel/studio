/**
 * Firebase 어댑터 구현
 * - 포트(인터페이스)의 Firebase 구현체
 * - 인프라 싱글톤을 주입받아 사용
 */

import { 
  AuthPort, 
  UserRepositoryPort, 
  MemberRepositoryPort,
  ClubRepositoryPort,
  StatisticsPort,
  AuditPort,
  NotificationPort,
  StoragePort,
  SearchPort
} from '@/ports';
import { UserProfile, UserRole } from '@/types/auth';
import { Member } from '@/types/member';
import { Club } from '@/types/club';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { 
  authSingleton, 
  firestoreSingleton, 
  resetFirebaseSingletons 
} from '@/infra/bootstrap';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp
} from 'firebase-admin/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase-admin/auth';

// ============================================
// 🔐 Firebase Auth Adapter
// ============================================

export class FirebaseAuthAdapter implements AuthPort {
  private auth = authSingleton();

  async getCurrentUser(): Promise<UserProfile | null> {
    // Admin SDK에서는 현재 사용자 개념이 없음
    // 클라이언트에서 토큰을 받아 verifyIdToken으로 확인
    return null;
  }

  async verifyIdToken(token: string): Promise<UserProfile | null> {
    try {
      const decodedToken = await this.auth.verifyIdToken(token);
      const userDoc = await getDoc(doc(firestoreSingleton(), 'users', decodedToken.uid));
      
      if (!userDoc.exists()) {
        return null;
      }

      return {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        displayName: decodedToken.name || userDoc.data().displayName || '',
        role: userDoc.data().role || UserRole.MEMBER,
        photoURL: decodedToken.picture || userDoc.data().photoURL || '',
        phoneNumber: decodedToken.phone_number || userDoc.data().phoneNumber || '',
        status: userDoc.data().status || 'active',
        clubId: userDoc.data().clubId || null,
        clubName: userDoc.data().clubName || null,
        createdAt: userDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: userDoc.data().updatedAt?.toDate() || new Date(),
        lastLoginAt: decodedToken.auth_time ? new Date(decodedToken.auth_time * 1000) : new Date(),
      } as UserProfile;
    } catch (error) {
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
      const userRecord = await createUserWithEmailAndPassword(
        this.auth as any,
        userData.email,
        userData.password
      );

      await updateProfile(userRecord.user, {
        displayName: userData.displayName
      });

      const userProfile: UserProfile = {
        uid: userRecord.user.uid,
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

      await setDoc(doc(firestoreSingleton(), 'users', userRecord.user.uid), userProfile);

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
      await this.auth.setCustomUserClaims(userId, { role });
      
      const userDoc = doc(firestoreSingleton(), 'users', userId);
      await updateDoc(userDoc, { 
        role, 
        updatedAt: Timestamp.now() 
      });

      const updatedDoc = await getDoc(userDoc);
      const userData = updatedDoc.data() as UserProfile;

      return {
        success: true,
        data: { ...userData, uid: userId },
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
    // Admin SDK에서는 sign out을 직접 처리할 수 없음
    // 클라이언트에서 처리해야 함
    throw new Error('Sign out must be handled on client side');
  }
}

// ============================================
// 👤 Firebase User Repository Adapter
// ============================================

export class FirebaseUserRepositoryAdapter implements UserRepositoryPort {
  private db = firestoreSingleton();

  async findById(id: string): Promise<UserProfile | null> {
    const docRef = doc(this.db, 'users', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      uid: id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
    } as UserProfile;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const q = query(
      collection(this.db, 'users'),
      where('email', '==', email)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
    return {
      ...data,
      uid: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
    } as UserProfile;
  }

  async save(user: UserProfile): Promise<ApiResponse<UserProfile>> {
    try {
      const userToSave = {
        ...user,
        updatedAt: Timestamp.now(),
        createdAt: user.createdAt ? Timestamp.fromDate(user.createdAt) : Timestamp.now(),
        lastLoginAt: user.lastLoginAt ? Timestamp.fromDate(user.lastLoginAt) : Timestamp.now(),
      };

      await setDoc(doc(this.db, 'users', user.uid), userToSave);

      return {
        success: true,
        data: user,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'SAVE_USER_FAILED',
          message: error.message || 'Failed to save user',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async update(id: string, data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    try {
      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(this.db, 'users', id), updateData);

      const updatedDoc = await getDoc(doc(this.db, 'users', id));
      const userData = updatedDoc.data() as UserProfile;

      return {
        success: true,
        data: { ...userData, uid: id },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'UPDATE_USER_FAILED',
          message: error.message || 'Failed to update user',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    try {
      await deleteDoc(doc(this.db, 'users', id));

      return {
        success: true,
        data: { id },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'DELETE_USER_FAILED',
          message: error.message || 'Failed to delete user',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
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
    try {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 20;
      const filters = options?.filters || {};

      let q = query(collection(this.db, 'users'));

      if (filters.role) {
        q = query(q, where('role', '==', filters.role));
      }
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.clubId) {
        q = query(q, where('clubId', '==', filters.clubId));
      }

      q = query(q, orderBy('createdAt', 'desc'));

      // Count total
      const countQuery = query(q);
      const countSnapshot = await getDocs(countQuery);
      const total = countSnapshot.size;

      // Pagination
      const offset = (page - 1) * pageSize;
      q = query(q, limit(pageSize));
      if (offset > 0) {
        // For simplicity, skipping complex cursor pagination
        // In production, use proper cursor-based pagination
      }

      const querySnapshot = await getDocs(q);
      const users: UserProfile[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          ...data,
          uid: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
        } as UserProfile);
      });

      const result: PaginatedResponse<UserProfile> = {
        items: users,
        total,
        page,
        pageSize,
        hasNext: offset + users.length < total,
        hasPrev: page > 1,
      };

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_USERS_FAILED',
          message: error.message || 'Failed to fetch users',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}

// ============================================
// 🏋️ Firebase Member Repository Adapter
// ============================================

export class FirebaseMemberRepositoryAdapter implements MemberRepositoryPort {
  private db = firestoreSingleton();

  async findById(id: string): Promise<Member | null> {
    const docRef = doc(this.db, 'members', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Member;
  }

  async findByUserId(userId: string): Promise<Member[]> {
    const q = query(
      collection(this.db, 'members'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    const members: Member[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      members.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Member);
    });

    return members;
  }

  async save(member: Member): Promise<ApiResponse<Member>> {
    try {
      const memberToSave = {
        ...member,
        updatedAt: Timestamp.now(),
        createdAt: member.createdAt ? Timestamp.fromDate(member.createdAt) : Timestamp.now(),
      };

      await setDoc(doc(this.db, 'members', member.id), memberToSave);

      return {
        success: true,
        data: member,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'SAVE_MEMBER_FAILED',
          message: error.message || 'Failed to save member',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async update(id: string, data: Partial<Member>): Promise<ApiResponse<Member>> {
    try {
      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(this.db, 'members', id), updateData);

      const updatedDoc = await getDoc(doc(this.db, 'members', id));
      const memberData = updatedDoc.data() as Member;

      return {
        success: true,
        data: { ...memberData, id },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'UPDATE_MEMBER_FAILED',
          message: error.message || 'Failed to update member',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    try {
      await deleteDoc(doc(this.db, 'members', id));

      return {
        success: true,
        data: { id },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'DELETE_MEMBER_FAILED',
          message: error.message || 'Failed to delete member',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async findByClub(clubId: string): Promise<ApiResponse<Member[]>> {
    try {
      const q = query(
        collection(this.db, 'members'),
        where('clubId', '==', clubId)
      );
      const querySnapshot = await getDocs(q);
      
      const members: Member[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        members.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Member);
      });

      return {
        success: true,
        data: members,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_MEMBERS_BY_CLUB_FAILED',
          message: error.message || 'Failed to fetch members by club',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async findAll(options?: {
    page?: number;
    pageSize?: number;
    filters?: Record<string, any>;
  }): Promise<ApiResponse<PaginatedResponse<Member>>> {
    try {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 20;
      const filters = options?.filters || {};

      let q = query(collection(this.db, 'members'));

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          q = query(q, where(key, '==', value));
        }
      });

      q = query(q, orderBy('createdAt', 'desc'));

      // Get total count
      const countSnapshot = await getDocs(q);
      const total = countSnapshot.size;

      // Apply pagination
      const offset = (page - 1) * pageSize;
      q = query(q, limit(pageSize));

      const querySnapshot = await getDocs(q);
      const members: Member[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        members.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Member);
      });

      const result: PaginatedResponse<Member> = {
        items: members,
        total,
        page,
        pageSize,
        hasNext: offset + members.length < total,
        hasPrev: page > 1,
      };

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_MEMBERS_FAILED',
          message: error.message || 'Failed to fetch members',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}

// 나머지 어댑터들은 다음 단계에서 구현...
export * from './statistics';
export * from './audit';
export * from './notification';
export * from './storage';
export * from './search';
export * from './club';

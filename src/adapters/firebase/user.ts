/**
 * Firebase User Repository Adapter
 */
import { UserRepositoryPort } from '@/ports';
import { UserProfile, UserRole } from '@/types/auth';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { firestoreSingleton } from '@/infra/bootstrap';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  Timestamp
} from 'firebase/firestore';

export class FirebaseUserRepositoryAdapter implements UserRepositoryPort {
  private db = firestoreSingleton();

  async findById(id: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(this.db, 'users', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return this.mapDocumentToUser(docSnap);
      }
      return null;
    } catch (error: any) {
      console.error('Failed to find user by ID:', error);
      return null;
    }
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    try {
      const q = query(
        collection(this.db, 'users'), 
        where('email', '==', email),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return this.mapDocumentToUser(querySnapshot.docs[0]);
      }
      return null;
    } catch (error: any) {
      console.error('Failed to find user by email:', error);
      return null;
    }
  }

  async save(user: UserProfile): Promise<ApiResponse<UserProfile>> {
    try {
      const userDoc = {
        ...user,
        updatedAt: new Date(),
        lastLoginAt: user.lastLoginAt || new Date(),
      };

      await setDoc(doc(this.db, 'users', user.uid), userDoc);
      
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
      const docRef = doc(this.db, 'users', id);
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      await updateDoc(docRef, updateData);
      
      // 업데이트된 사용자 정보 반환
      const updatedUser = await this.findById(id);
      if (!updatedUser) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found after update',
            statusCode: 404
          },
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: updatedUser,
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

      // 필터 적용
      if (filters.role) {
        q = query(q, where('role', '==', filters.role));
      }
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.clubId) {
        q = query(q, where('clubId', '==', filters.clubId));
      }

      // 정렬 및 페이지네이션
      q = query(q, orderBy('createdAt', 'desc'));

      // 전체 개수 조회
      const countQuery = query(q);
      const countSnapshot = await getDocs(countQuery);
      const total = countSnapshot.size;

      // 페이지네이션 적용
      if (page > 1) {
        const offset = (page - 1) * pageSize;
        q = query(q, limit(pageSize));
      } else {
        q = query(q, limit(pageSize));
      }

      const querySnapshot = await getDocs(q);
      const users: UserProfile[] = [];

      querySnapshot.forEach((doc) => {
        users.push(this.mapDocumentToUser(doc));
      });

      const paginatedResponse: PaginatedResponse<UserProfile> = {
        data: users,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page * pageSize < total,
          hasPrev: page > 1,
        },
      };

      return {
        success: true,
        data: paginatedResponse,
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

  private mapDocumentToUser(doc: any): UserProfile {
    const data = doc.data();
    return {
      uid: doc.id,
      email: data.email || '',
      displayName: data.displayName || '',
      role: data.role || UserRole.MEMBER,
      photoURL: data.photoURL || '',
      phoneNumber: data.phoneNumber || '',
      status: data.status || 'active',
      clubId: data.clubId || null,
      clubName: data.clubName || null,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
    };
  }
}

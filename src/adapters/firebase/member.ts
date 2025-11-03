/**
 * Firebase Member Repository Adapter (Admin SDK 전용)
 */
import { MemberRepositoryPort } from '@/ports';
import { Member } from '@/types/member';
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
  Timestamp
} from 'firebase-admin/firestore';

export class FirebaseMemberRepositoryAdapter implements MemberRepositoryPort {
  private db = firestoreSingleton();

  async findById(id: string): Promise<Member | null> {
    try {
      const docRef = doc(this.db, 'members', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return this.mapDocumentToMember(docSnap);
      }
      return null;
    } catch (error: any) {
      console.error('Failed to find member by ID:', error);
      return null;
    }
  }

  async findByUserId(userId: string): Promise<Member[]> {
    try {
      const q = query(
        collection(this.db, 'members'), 
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      const members: Member[] = [];
      querySnapshot.forEach((doc) => {
        members.push(this.mapDocumentToMember(doc));
      });
      
      return members;
    } catch (error: any) {
      console.error('Failed to find members by user ID:', error);
      return [];
    }
  }

  async save(member: Member): Promise<ApiResponse<Member>> {
    try {
      const memberDoc = {
        ...member,
        updatedAt: new Date(),
      };

      await setDoc(doc(this.db, 'members', member.id), memberDoc);
      
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
      const docRef = doc(this.db, 'members', id);
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      await updateDoc(docRef, updateData);
      
      // 업데이트된 멤버 정보 반환
      const updatedMember = await this.findById(id);
      if (!updatedMember) {
        return {
          success: false,
          error: {
            code: 'MEMBER_NOT_FOUND',
            message: 'Member not found after update',
            statusCode: 404
          },
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: updatedMember,
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
        where('clubId', '==', clubId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const members: Member[] = [];
      querySnapshot.forEach((doc) => {
        members.push(this.mapDocumentToMember(doc));
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

      // 필터 적용
      if (filters.clubId) {
        q = query(q, where('clubId', '==', filters.clubId));
      }
      if (filters.userId) {
        q = query(q, where('userId', '==', filters.userId));
      }
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      // 정렬
      q = query(q, orderBy('createdAt', 'desc'));

      // 전체 개수 조회
      const countQuery = query(q);
      const countSnapshot = await getDocs(countQuery);
      const total = countSnapshot.size;

      // 페이지네이션 적용
      q = query(q, limit(pageSize));

      const querySnapshot = await getDocs(q);
      const members: Member[] = [];

      querySnapshot.forEach((doc) => {
        members.push(this.mapDocumentToMember(doc));
      });

      const paginatedResponse: PaginatedResponse<Member> = {
        data: members,
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
          code: 'FETCH_MEMBERS_FAILED',
          message: error.message || 'Failed to fetch members',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  private mapDocumentToMember(doc: any): Member {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId || '',
      clubId: data.clubId || '',
      name: data.name || '',
      email: data.email || '',
      phoneNumber: data.phoneNumber || '',
      birthDate: data.birthDate?.toDate() || null,
      address: data.address || '',
      emergencyContact: data.emergencyContact || {
        name: '',
        phone: '',
        relationship: '',
      },
      status: data.status || 'active',
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }
}

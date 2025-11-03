/**
 * Firebase Member Repository Adapter (Admin SDK only)
 */
import { MemberRepositoryPort } from '@/ports';
import { Member } from '@/types/member';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { Timestamp } from 'firebase-admin/firestore';
import { AdminFirestore } from '@/infra/bootstrap';

export class FirebaseMemberRepositoryAdapter implements MemberRepositoryPort {
  private db: AdminFirestore;

  constructor(db: AdminFirestore) {
    this.db = db;
  }

  async findById(id: string): Promise<Member | null> {
    try {
      const docRef = this.db.doc(`members/${id}`);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
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
      const q = this.db.collection('members').where('userId', '==', userId);
      const querySnapshot = await q.get();
      
      const members: Member[] = [];
      querySnapshot.forEach((doc: any) => {
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

      await this.db.doc(`members/${member.id}`).set(memberDoc);
      
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
      const docRef = this.db.doc(`members/${id}`);
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      await docRef.update(updateData);
      
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
      await this.db.doc(`members/${id}`).delete();
      
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
      const q = 
        this.db.collection(`members`).where('clubId', '==', clubId).orderBy('createdAt', 'desc');
      const querySnapshot = await q.get();
      
      const members: Member[] = [];
      querySnapshot.forEach((doc: any) => {
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

      let q: any = this.db.collection('members');

      // 필터 적용
      if (filters.clubId) {
        q = q.where('clubId', '==', filters.clubId);
      }
      if (filters.userId) {
        q = q.where('userId', '==', filters.userId);
      }
      if (filters.status) {
        q = q.where('status', '==', filters.status);
      }

      // 정렬
      q = q.orderBy('createdAt', 'desc');

      // 전체 개수 조회
      const countQuery = q;
      const countSnapshot = await countQuery.get();
      const total = countSnapshot.size;

      // 페이지네이션 적용
      q = q.limit(pageSize);

      const querySnapshot = await q.get();
      const members: Member[] = [];

      querySnapshot.forEach((doc: any) => {
        members.push(this.mapDocumentToMember(doc));
      });

      const paginatedResponse: PaginatedResponse<Member> = {
        items: members,
        total,
        page,
        pageSize,
        hasNext: page * pageSize < total,
        hasPrev: page > 1,
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
      name: data.name || '',
      dateOfBirth: data.dateOfBirth || '',
      gender: data.gender || undefined,
      email: data.email || '',
      phoneNumber: data.phoneNumber || '',
      clubId: data.clubId || '',
      clubName: data.clubName || '',
      status: data.status || 'active',
      guardianIds: data.guardianIds || [],
      guardianUserIds: data.guardianUserIds || [],
      photoURL: data.photoURL || '',
      activePassId: data.activePassId || '',
      memberCategory: data.memberCategory || 'adult',
      createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate()?.toISOString() || undefined,
    };
  }
}

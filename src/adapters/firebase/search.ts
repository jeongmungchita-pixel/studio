/**
 * Firebase Search Adapter (Admin SDK only)
 */
import { SearchPort } from '@/ports';
import { UserProfile, UserRole } from '@/types/auth';
import { Member } from '@/types/member';
import { Club } from '@/types/club';
import { ApiResponse } from '@/types/api';
import { Timestamp } from 'firebase-admin/firestore';
import { AdminFirestore } from '@/infra/bootstrap';

export class FirebaseSearchAdapter implements SearchPort {
  private db: AdminFirestore;

  constructor(db: AdminFirestore) {
    this.db = db;
  }

  async searchUsers(searchQuery: string, filters?: {
    role?: UserRole;
    clubId?: string;
  }): Promise<ApiResponse<UserProfile[]>> {
    try {
      const usersCollection = this.db.collection('users');
      
      // Simple text search - in production, consider using Algolia or Elasticsearch
      let q: any = usersCollection;

      // Search by displayName or email
      if (searchQuery.trim()) {
        // Note: Firebase doesn't support full-text search natively
        // This is a simplified implementation
        q = usersCollection
          .where('displayName', '>=', searchQuery)
          .where('displayName', '<=', searchQuery + '\uf8ff')
          .limit(50);
      }

      if (filters?.role) {
        q = q.where('role', '==', filters.role);
      }
      if (filters?.clubId) {
        q = q.where('clubId', '==', filters.clubId);
      }

      q = q.orderBy('displayName').limit(50);

      const querySnapshot = await q.get();
      const users: UserProfile[] = [];

      querySnapshot.forEach((doc: any) => {
        const data = doc.data();
        users.push({
          ...data,
          uid: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
        } as UserProfile);
      });

      return {
        success: true,
        data: users,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'SEARCH_USERS_FAILED',
          message: error.message || 'Failed to search users',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async searchMembers(searchQuery: string, clubId?: string): Promise<ApiResponse<Member[]>> {
    try {
      const membersCollection = this.db.collection('members');
      
      // Simple text search - in production, consider using Algolia or Elasticsearch
      let q: any = membersCollection;

      // Search by name
      if (searchQuery.trim()) {
        q = membersCollection
          .where('name', '>=', searchQuery)
          .where('name', '<=', searchQuery + '\uf8ff')
          .limit(50);
      }

      if (clubId) {
        q = q.where('clubId', '==', clubId);
      }

      q = q.orderBy('name').limit(50);

      const querySnapshot = await q.get();
      const members: Member[] = [];

      querySnapshot.forEach((doc: any) => {
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
          code: 'SEARCH_MEMBERS_FAILED',
          message: error.message || 'Failed to search members',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async searchClubs(searchQuery: string): Promise<ApiResponse<Club[]>> {
    try {
      const clubsCollection = this.db.collection('clubs');
      
      let q: any = clubsCollection;

      if (searchQuery.trim()) {
        q = clubsCollection
          .where('name', '>=', searchQuery)
          .where('name', '<=', searchQuery + '\uf8ff')
          .limit(50);
      }

      q = q.orderBy('name').limit(50);

      const querySnapshot = await q.get();
      const clubs: Club[] = [];

      querySnapshot.forEach((doc: any) => {
        const data = doc.data();
        clubs.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Club);
      });

      return {
        success: true,
        data: clubs,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'SEARCH_CLUBS_FAILED',
          message: error.message || 'Failed to search clubs',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}

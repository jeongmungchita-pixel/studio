/**
 * Firebase Search Adapter
 */
import { SearchPort } from '@/ports';
import { UserProfile, UserRole } from '@/types/auth';
import { Member } from '@/types/member';
import { Club } from '@/types/club';
import { ApiResponse } from '@/types/api';
import { firestoreSingleton } from '@/infra/bootstrap';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase-admin/firestore';

export class FirebaseSearchAdapter implements SearchPort {
  private db = firestoreSingleton();

  async searchUsers(query: string, filters?: {
    role?: UserRole;
    clubId?: string;
  }): Promise<ApiResponse<UserProfile[]>> {
    try {
      const usersCollection = collection(this.db, 'users');
      
      // Simple text search - in production, consider using Algolia or Elasticsearch
      let q = query(usersCollection);

      // Search by displayName or email
      if (query.trim()) {
        // Note: Firebase doesn't support full-text search natively
        // This is a simplified implementation
        q = query(
          usersCollection,
          where('displayName', '>=', query),
          where('displayName', '<=', query + '\uf8ff'),
          limit(50)
        );
      }

      if (filters?.role) {
        q = query(q, where('role', '==', filters.role));
      }
      if (filters?.clubId) {
        q = query(q, where('clubId', '==', filters.clubId));
      }

      q = query(q, orderBy('displayName'), limit(50));

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

  async searchMembers(query: string, clubId?: string): Promise<ApiResponse<Member[]>> {
    try {
      const membersCollection = collection(this.db, 'members');
      
      let q = query(membersCollection);

      if (query.trim()) {
        q = query(
          membersCollection,
          where('name', '>=', query),
          where('name', '<=', query + '\uf8ff'),
          limit(50)
        );
      }

      if (clubId) {
        q = query(q, where('clubId', '==', clubId));
      }

      q = query(q, orderBy('name'), limit(50));

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
          code: 'SEARCH_MEMBERS_FAILED',
          message: error.message || 'Failed to search members',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async searchClubs(query: string): Promise<ApiResponse<Club[]>> {
    try {
      const clubsCollection = collection(this.db, 'clubs');
      
      let q = query(clubsCollection);

      if (query.trim()) {
        q = query(
          clubsCollection,
          where('name', '>=', query),
          where('name', '<=', query + '\uf8ff'),
          limit(50)
        );
      }

      q = query(q, orderBy('name'), limit(50));

      const querySnapshot = await getDocs(q);
      const clubs: Club[] = [];

      querySnapshot.forEach((doc) => {
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

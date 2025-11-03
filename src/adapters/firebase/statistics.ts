/**
 * Firebase Statistics Adapter
 */
import { StatisticsPort } from '@/ports';
import { UserProfile, UserRole } from '@/types/auth';
import { ApiResponse } from '@/types/api';
import { firestoreSingleton } from '@/infra/bootstrap';
import { collection, getDocs, query, where, getCountFromServer } from 'firebase-admin/firestore';

export class FirebaseStatisticsAdapter implements StatisticsPort {
  private db = firestoreSingleton();

  async getUserStatistics(): Promise<ApiResponse<{
    total: number;
    byRole: Record<UserRole, number>;
    byStatus: Record<string, number>;
    recentlyActive: number;
  }>> {
    try {
      const usersCollection = collection(this.db, 'users');
      
      // Get total count
      const totalSnapshot = await getCountFromServer(usersCollection);
      const total = totalSnapshot.data().count;

      // Get role statistics
      const roleStats: Record<UserRole, number> = {} as Record<UserRole, number>;
      const roles = Object.values(UserRole);
      
      for (const role of roles) {
        const roleQuery = query(usersCollection, where('role', '==', role));
        const roleSnapshot = await getCountFromServer(roleQuery);
        roleStats[role] = roleSnapshot.data().count;
      }

      // Get status statistics
      const statusSnapshot = await getDocs(usersCollection);
      const statusStats: Record<string, number> = {};
      
      statusSnapshot.forEach((doc) => {
        const status = doc.data().status || 'unknown';
        statusStats[status] = (statusStats[status] || 0) + 1;
      });

      // Get recently active (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activeQuery = query(
        usersCollection,
        where('lastLoginAt', '>=', thirtyDaysAgo)
      );
      const activeSnapshot = await getCountFromServer(activeQuery);
      const recentlyActive = activeSnapshot.data().count;

      return {
        success: true,
        data: {
          total,
          byRole: roleStats,
          byStatus: statusStats,
          recentlyActive,
        },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_USER_STATS_FAILED',
          message: error.message || 'Failed to fetch user statistics',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async getMemberStatistics(clubId?: string): Promise<ApiResponse<{
    total: number;
    active: number;
    inactive: number;
    byAgeGroup: Record<string, number>;
  }>> {
    try {
      const membersCollection = collection(this.db, 'members');
      
      let q = membersCollection;
      if (clubId) {
        q = query(membersCollection, where('clubId', '==', clubId));
      }

      // Get total count
      const totalSnapshot = await getCountFromServer(q);
      const total = totalSnapshot.data().count;

      // Get status statistics
      const activeQuery = query(q, where('status', '==', 'active'));
      const activeSnapshot = await getCountFromServer(activeQuery);
      const active = activeSnapshot.data().count;

      const inactive = total - active;

      // Get age group statistics
      const allMembersSnapshot = await getDocs(q);
      const ageStats: Record<string, number> = {};
      
      allMembersSnapshot.forEach((doc) => {
        const birthDate = doc.data().birthDate?.toDate();
        if (birthDate) {
          const age = new Date().getFullYear() - birthDate.getFullYear();
          let ageGroup = 'unknown';
          
          if (age < 10) ageGroup = '0-9';
          else if (age < 20) ageGroup = '10-19';
          else if (age < 30) ageGroup = '20-29';
          else if (age < 40) ageGroup = '30-39';
          else if (age < 50) ageGroup = '40-49';
          else if (age < 60) ageGroup = '50-59';
          else ageGroup = '60+';
          
          ageStats[ageGroup] = (ageStats[ageGroup] || 0) + 1;
        }
      });

      return {
        success: true,
        data: {
          total,
          active,
          inactive,
          byAgeGroup: ageStats,
        },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_MEMBER_STATS_FAILED',
          message: error.message || 'Failed to fetch member statistics',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}

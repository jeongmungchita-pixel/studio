/**
 * Firebase Statistics Adapter (Admin SDK only)
 */
import { StatisticsPort } from '@/ports';
import { UserProfile, UserRole } from '@/types/auth';
import { ApiResponse } from '@/types/api';
import { Timestamp } from 'firebase-admin/firestore';
import { AdminFirestore } from '@/infra/bootstrap';

export class FirebaseStatisticsAdapter implements StatisticsPort {
  private db: AdminFirestore;

  constructor(db: AdminFirestore) {
    this.db = db;
  }

  async getUserStatistics(): Promise<ApiResponse<{
    total: number;
    byRole: Record<UserRole, number>;
    byStatus: Record<string, number>;
    recentlyActive: number;
  }>> {
    try {
      const usersCollection = this.db.collection('users');
      
      // Get total count
      const totalSnapshot = await usersCollection.get();
      const total = totalSnapshot.size;

      // Get role statistics
      const roleStats: Record<UserRole, number> = {} as Record<UserRole, number>;
      const roles = Object.values(UserRole);
      
      for (const role of roles) {
        const roleQuery = usersCollection.where('role', '==', role);
        const roleSnapshot = await roleQuery.get();
        roleStats[role] = roleSnapshot.size;
      }

      // Get status statistics
      const statusSnapshot = await usersCollection.get();
      const statusStats: Record<string, number> = {};
      
      statusSnapshot.forEach((doc: any) => {
        const status = doc.data().status || 'unknown';
        statusStats[status] = (statusStats[status] || 0) + 1;
      });

      // Get recently active (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activeQuery = usersCollection.where('lastLoginAt', '>=', thirtyDaysAgo);
      const activeSnapshot = await activeQuery.get();
      const recentlyActive = activeSnapshot.size;

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
      const membersCollection = this.db.collection('members');
      
      let q: any = membersCollection;
      if (clubId) {
        q = membersCollection.where('clubId', '==', clubId);
      }

      // Get total count
      const totalSnapshot = await q.get();
      const total = totalSnapshot.size;

      // Get status statistics
      const activeQuery = q.where('status', '==', 'active');
      const activeSnapshot = await activeQuery.get();
      const active = activeSnapshot.size;

      const inactive = total - active;

      // Get age group statistics
      const allMembersSnapshot = await q.get();
      const ageStats: Record<string, number> = {};
      
      allMembersSnapshot.forEach((doc: any) => {
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

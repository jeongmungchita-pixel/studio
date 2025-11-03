/**
 * 도메인 포트(인터페이스) 정의
 * - 애플리케이션 계층은 이 포트에만 의존
 * - 실제 구현은 어댑터에서 제공
 */

import { UserProfile, UserRole } from '@/types/auth';
import { Member } from '@/types/member';
import { Club } from '@/types/club';
import { ApiResponse, PaginatedResponse } from '@/types/api';

// ============================================
// 🔐 Authentication Ports
// ============================================

export interface AuthPort {
  getCurrentUser(): Promise<UserProfile | null>;
  verifyIdToken(token: string): Promise<UserProfile | null>;
  createUser(userData: {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
  }): Promise<ApiResponse<UserProfile>>;
  updateUserRole(userId: string, role: UserRole): Promise<ApiResponse<UserProfile>>;
  signOut(): Promise<void>;
}

// ============================================
// 👤 User Repository Ports
// ============================================

export interface UserRepositoryPort {
  findById(id: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  save(user: UserProfile): Promise<ApiResponse<UserProfile>>;
  update(id: string, data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>>;
  delete(id: string): Promise<ApiResponse<{ id: string }>>;
  findAll(options?: {
    page?: number;
    pageSize?: number;
    filters?: {
      role?: UserRole;
      status?: string;
      clubId?: string;
    };
  }): Promise<ApiResponse<PaginatedResponse<UserProfile>>>;
}

// ============================================
// 🏋️ Member Repository Ports
// ============================================

export interface MemberRepositoryPort {
  findById(id: string): Promise<Member | null>;
  findByUserId(userId: string): Promise<Member[]>;
  save(member: Member): Promise<ApiResponse<Member>>;
  update(id: string, data: Partial<Member>): Promise<ApiResponse<Member>>;
  delete(id: string): Promise<ApiResponse<{ id: string }>>;
  findByClub(clubId: string): Promise<ApiResponse<Member[]>>;
  findAll(options?: {
    page?: number;
    pageSize?: number;
    filters?: Record<string, any>;
  }): Promise<ApiResponse<PaginatedResponse<Member>>>;
}

// ============================================
// 🏢 Club Repository Ports
// ============================================

export interface ClubRepositoryPort {
  findById(id: string): Promise<Club | null>;
  save(club: Club): Promise<ApiResponse<Club>>;
  update(id: string, data: Partial<Club>): Promise<ApiResponse<Club>>;
  delete(id: string): Promise<ApiResponse<{ id: string }>>;
  findAll(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Club>>>;
}

// ============================================
// 📊 Statistics Ports
// ============================================

export interface StatisticsPort {
  getUserStatistics(): Promise<ApiResponse<{
    total: number;
    byRole: Record<UserRole, number>;
    byStatus: Record<string, number>;
    recentlyActive: number;
  }>>;
  
  getMemberStatistics(clubId?: string): Promise<ApiResponse<{
    total: number;
    active: number;
    inactive: number;
    byAgeGroup: Record<string, number>;
  }>>;
}

// ============================================
// 📝 Audit Ports
// ============================================

export interface AuditPort {
  logEvent(event: {
    action: string;
    userId?: string;
    resourceId?: string;
    metadata?: Record<string, any>;
  }): Promise<void>;
  
  getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ApiResponse<any[]>>;
}

// ============================================
// 📧 Notification Ports
// ============================================

export interface NotificationPort {
  sendEmail(to: string, subject: string, content: string): Promise<ApiResponse<{ sent: boolean }>>;
  sendPushNotification(userId: string, title: string, body: string): Promise<ApiResponse<{ sent: boolean }>>;
  createNotification(data: {
    userId: string;
    title: string;
    body: string;
    type?: string;
  }): Promise<ApiResponse<any>>;
}

// ============================================
// 📁 File Storage Ports
// ============================================

export interface StoragePort {
  uploadFile(path: string, file: Buffer | File): Promise<ApiResponse<{ url: string }>>;
  downloadFile(path: string): Promise<ApiResponse<Buffer>>;
  deleteFile(path: string): Promise<ApiResponse<{ deleted: boolean }>>;
  getPublicUrl(path: string): string;
}

// ============================================
// 🔍 Search Ports
// ============================================

export interface SearchPort {
  searchUsers(query: string, filters?: {
    role?: UserRole;
    clubId?: string;
  }): Promise<ApiResponse<UserProfile[]>>;
  
  searchMembers(query: string, clubId?: string): Promise<ApiResponse<Member[]>>;
  
  searchClubs(query: string): Promise<ApiResponse<Club[]>>;
}

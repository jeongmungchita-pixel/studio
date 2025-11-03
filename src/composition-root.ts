/**
 * Composition Root (의존성 결선 중앙화)
 * - 모든 의존성 주입은 이곳에서만 발생
 * - 인프라 싱글톤 + 도메인 DI 혼합 전략
 * - 원칙: 어댑터는 Admin SDK만, 클라이언트는 분리
 */

import { 
  // Ports
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

// Types
import { UserProfile, UserRole } from '@/types/auth';
import { Member } from '@/types/member';
import { Club } from '@/types/club';
import { ApiResponse, PaginatedResponse } from '@/types/api';

// Adapters (Server-side only)
import {
  FirebaseAuthAdapter,
  FirebaseUserRepositoryAdapter,
  FirebaseMemberRepositoryAdapter,
  FirebaseClubRepositoryAdapter,
  FirebaseStatisticsAdapter,
  FirebaseAuditAdapter,
  FirebaseNotificationAdapter,
  FirebaseStorageAdapter,
  FirebaseSearchAdapter
} from '@/adapters/firebase';

// Domain Services
import { UserService } from '@/domain/services/user.service';
import { MemberService } from '@/domain/services/member.service';
import { ClubService } from '@/domain/services/club.service';

// Infrastructure (Server-side only)
import { 
  authSingleton, 
  firestoreSingleton,
  storageSingleton,
  resetFirebaseSingletons 
} from '@/infra/bootstrap';

/**
 * 애플리케이션 의존성 구성
 */
export class AppComposition {
  private static instance: AppComposition;
  
  // Adapters (Infrastructure)
  private authAdapter!: AuthPort;
  private userRepoAdapter!: UserRepositoryPort;
  private memberRepoAdapter!: MemberRepositoryPort;
  private clubRepoAdapter!: ClubRepositoryPort;
  private statisticsAdapter!: StatisticsPort;
  private auditAdapter!: AuditPort;
  private notificationAdapter!: NotificationPort;
  private storageAdapter!: StoragePort;
  private searchAdapter!: SearchPort;

  // Domain Services
  private userService!: UserService;
  private memberService!: MemberService;
  private clubService!: ClubService;

  private constructor() {
    // Server-side only initialization
    if (typeof window === 'undefined') {
      this.initializeAdapters();
      this.initializeServices();
    } else {
      // Client-side: Mock or lightweight implementations
      this.initializeClientAdapters();
      this.initializeClientServices();
    }
  }

  static getInstance(): AppComposition {
    if (!AppComposition.instance) {
      AppComposition.instance = new AppComposition();
    }
    return AppComposition.instance;
  }

  /**
   * 서버사이드 어댑터 초기화 (Admin SDK only)
   */
  private initializeAdapters(): void {
    const auth = authSingleton();
    const firestore = firestoreSingleton();
    const storage = storageSingleton();

    this.authAdapter = new FirebaseAuthAdapter(auth);
    this.userRepoAdapter = new FirebaseUserRepositoryAdapter(firestore);
    this.memberRepoAdapter = new FirebaseMemberRepositoryAdapter(firestore);
    this.clubRepoAdapter = new FirebaseClubRepositoryAdapter(firestore);
    this.statisticsAdapter = new FirebaseStatisticsAdapter(firestore);
    this.auditAdapter = new FirebaseAuditAdapter(firestore);
    this.notificationAdapter = new FirebaseNotificationAdapter(firestore);
    this.storageAdapter = new FirebaseStorageAdapter();
    this.searchAdapter = new FirebaseSearchAdapter(firestore);
  }

  /**
   * 클라이언트사이드 어댑터 초기화 (Mock implementations)
   */
  private initializeClientAdapters(): void {
    // Client-side: Mock adapters that throw errors or return null
    // Real client-side implementations should use API calls or client SDK
    this.authAdapter = new MockAuthAdapter();
    this.userRepoAdapter = new MockUserRepositoryAdapter();
    this.memberRepoAdapter = new MockMemberRepositoryAdapter();
    this.clubRepoAdapter = new MockClubRepositoryAdapter();
    this.statisticsAdapter = new MockStatisticsAdapter();
    this.auditAdapter = new MockAuditAdapter();
    this.notificationAdapter = new MockNotificationAdapter();
    this.storageAdapter = new MockStorageAdapter();
    this.searchAdapter = new MockSearchAdapter();
  }

  /**
   * 서버사이드 서비스 초기화
   */
  private initializeServices(): void {
    this.userService = new UserService(this.authAdapter, this.userRepoAdapter, this.statisticsAdapter);
    this.memberService = new MemberService(this.memberRepoAdapter, this.auditAdapter);
    this.clubService = new ClubService(this.clubRepoAdapter, this.memberRepoAdapter, this.auditAdapter);
  }

  /**
   * 클라이언트사이드 서비스 초기화
   */
  private initializeClientServices(): void {
    // Client-side: API-based services
    throw new Error('Client-side services should use API calls, not direct service injection');
  }

  // ============================================
  // Public Accessors (의존성 접근 지점)
  // ============================================

  // Adapters
  getAuthAdapter(): AuthPort {
    return this.authAdapter;
  }

  getUserRepository(): UserRepositoryPort {
    return this.userRepoAdapter;
  }

  getMemberRepository(): MemberRepositoryPort {
    return this.memberRepoAdapter;
  }

  getClubRepository(): ClubRepositoryPort {
    return this.clubRepoAdapter;
  }

  getStatisticsAdapter(): StatisticsPort {
    return this.statisticsAdapter;
  }

  getAuditAdapter(): AuditPort {
    return this.auditAdapter;
  }

  getNotificationAdapter(): NotificationPort {
    return this.notificationAdapter;
  }

  getStorageAdapter(): StoragePort {
    return this.storageAdapter;
  }

  getSearchAdapter(): SearchPort {
    return this.searchAdapter;
  }

  // Services
  getUserService(): UserService {
    return this.userService;
  }

  getMemberService(): MemberService {
    return this.memberService;
  }

  getClubService(): ClubService {
    return this.clubService;
  }
}

// ============================================
// Convenience exports (간편 접근 함수)
// ============================================

const appComposition = AppComposition.getInstance();

export const getUserService = () => appComposition.getUserService();
export const getMemberService = () => appComposition.getMemberService();
export const getClubService = () => appComposition.getClubService();

// Adapters
export const getAuthAdapter = () => appComposition.getAuthAdapter();
export const getUserRepository = () => appComposition.getUserRepository();
export const getMemberRepository = () => appComposition.getMemberRepository();
export const getClubRepository = () => appComposition.getClubRepository();
export const getStatisticsAdapter = () => appComposition.getStatisticsAdapter();
export const getAuditAdapter = () => appComposition.getAuditAdapter();
export const getNotificationAdapter = () => appComposition.getNotificationAdapter();
export const getStorageAdapter = () => appComposition.getStorageAdapter();
export const getSearchAdapter = () => appComposition.getSearchAdapter();

// ============================================
// Mock Adapters for Client-side
// ============================================

class MockAuthAdapter implements AuthPort {
  async getCurrentUser(): Promise<UserProfile | null> {
    throw new Error('Auth operations not available on client-side. Use useUser() hook instead.');
  }
  async verifyIdToken(token: string): Promise<UserProfile | null> {
    throw new Error('Token verification not available on client-side.');
  }
  async createUser(userData: {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
  }): Promise<ApiResponse<UserProfile>> {
    throw new Error('User creation not available on client-side. Use API endpoints.');
  }
  async updateUserRole(userId: string, role: UserRole): Promise<ApiResponse<UserProfile>> {
    throw new Error('Role update not available on client-side. Use API endpoints.');
  }
  async signOut(): Promise<void> {
    throw new Error('SignOut not available through adapter. Use Firebase client SDK.');
  }
}

class MockUserRepositoryAdapter implements UserRepositoryPort {
  async findById(id: string): Promise<UserProfile | null> {
    throw new Error('User operations not available on client-side. Use API endpoints.');
  }
  async findByEmail(email: string): Promise<UserProfile | null> {
    throw new Error('User operations not available on client-side. Use API endpoints.');
  }
  async save(user: UserProfile): Promise<ApiResponse<UserProfile>> {
    throw new Error('User operations not available on client-side. Use API endpoints.');
  }
  async update(id: string, data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    throw new Error('User operations not available on client-side. Use API endpoints.');
  }
  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    throw new Error('User operations not available on client-side. Use API endpoints.');
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
    throw new Error('User operations not available on client-side. Use API endpoints.');
  }
}

class MockMemberRepositoryAdapter implements MemberRepositoryPort {
  async findById(id: string): Promise<Member | null> {
    throw new Error('Member operations not available on client-side. Use API endpoints.');
  }
  async findByUserId(userId: string): Promise<Member[]> {
    throw new Error('Member operations not available on client-side. Use API endpoints.');
  }
  async save(member: Member): Promise<ApiResponse<Member>> {
    throw new Error('Member operations not available on client-side. Use API endpoints.');
  }
  async update(id: string, data: Partial<Member>): Promise<ApiResponse<Member>> {
    throw new Error('Member operations not available on client-side. Use API endpoints.');
  }
  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    throw new Error('Member operations not available on client-side. Use API endpoints.');
  }
  async findByClub(clubId: string): Promise<ApiResponse<Member[]>> {
    throw new Error('Member operations not available on client-side. Use API endpoints.');
  }
  async findAll(options?: {
    page?: number;
    pageSize?: number;
    filters?: Record<string, any>;
  }): Promise<ApiResponse<PaginatedResponse<Member>>> {
    throw new Error('Member operations not available on client-side. Use API endpoints.');
  }
}

class MockClubRepositoryAdapter implements ClubRepositoryPort {
  async findById(id: string): Promise<Club | null> {
    throw new Error('Club operations not available on client-side. Use API endpoints.');
  }
  async save(club: Club): Promise<ApiResponse<Club>> {
    throw new Error('Club operations not available on client-side. Use API endpoints.');
  }
  async update(id: string, data: Partial<Club>): Promise<ApiResponse<Club>> {
    throw new Error('Club operations not available on client-side. Use API endpoints.');
  }
  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    throw new Error('Club operations not available on client-side. Use API endpoints.');
  }
  async findAll(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Club>>> {
    throw new Error('Club operations not available on client-side. Use API endpoints.');
  }
}

class MockStatisticsAdapter implements StatisticsPort {
  async getUserStatistics(): Promise<ApiResponse<{
    total: number;
    byRole: Record<UserRole, number>;
    byStatus: Record<string, number>;
    recentlyActive: number;
  }>> {
    throw new Error('Statistics operations not available on client-side. Use API endpoints.');
  }
  async getMemberStatistics(clubId?: string): Promise<ApiResponse<{
    total: number;
    active: number;
    inactive: number;
    byAgeGroup: Record<string, number>;
  }>> {
    throw new Error('Statistics operations not available on client-side. Use API endpoints.');
  }
}

class MockAuditAdapter implements AuditPort {
  async logEvent(event: {
    action: string;
    userId?: string;
    resourceId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    throw new Error('Audit operations not available on client-side. Use API endpoints.');
  }
  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ApiResponse<any[]>> {
    throw new Error('Audit operations not available on client-side. Use API endpoints.');
  }
}

class MockNotificationAdapter implements NotificationPort {
  async sendEmail(to: string, subject: string, content: string): Promise<ApiResponse<{ sent: boolean }>> {
    throw new Error('Email operations not available on client-side. Use API endpoints.');
  }
  async sendPushNotification(userId: string, title: string, body: string): Promise<ApiResponse<{ sent: boolean }>> {
    throw new Error('Push notification operations not available on client-side. Use API endpoints.');
  }
  async createNotification(data: {
    userId: string;
    title: string;
    body: string;
    type?: string;
  }): Promise<ApiResponse<any>> {
    throw new Error('Notification operations not available on client-side. Use API endpoints.');
  }
}

class MockStorageAdapter implements StoragePort {
  async uploadFile(path: string, file: Buffer | File): Promise<ApiResponse<{ url: string }>> {
    throw new Error('Storage operations not available on client-side. Use API endpoints or client SDK.');
  }
  async downloadFile(path: string): Promise<ApiResponse<Buffer>> {
    throw new Error('Storage operations not available on client-side. Use API endpoints or client SDK.');
  }
  async deleteFile(path: string): Promise<ApiResponse<{ deleted: boolean }>> {
    throw new Error('Storage operations not available on client-side. Use API endpoints or client SDK.');
  }
  getPublicUrl(path: string): string {
    throw new Error('Storage operations not available on client-side. Use API endpoints or client SDK.');
  }
}

class MockSearchAdapter implements SearchPort {
  async searchUsers(query: string, filters?: {
    role?: UserRole;
    clubId?: string;
  }): Promise<ApiResponse<UserProfile[]>> {
    throw new Error('Search operations not available on client-side. Use API endpoints.');
  }
  async searchMembers(query: string, clubId?: string): Promise<ApiResponse<Member[]>> {
    throw new Error('Search operations not available on client-side. Use API endpoints.');
  }
  async searchClubs(query: string): Promise<ApiResponse<Club[]>> {
    throw new Error('Search operations not available on client-side. Use API endpoints.');
  }
}

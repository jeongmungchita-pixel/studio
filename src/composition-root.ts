/**
 * Composition Root (의존성 결선 중앙화)
 * - 모든 의존성 주입은 이곳에서만 발생
 * - 인프라 싱글톤 + 도메인 DI 혼합 전략
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

// Adapters
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

// Infrastructure
import { 
  authSingleton, 
  firestoreSingleton,
  resetFirebaseSingletons 
} from '@/infra/bootstrap';

/**
 * 애플리케이션 의존성 구성
 */
export class AppComposition {
  private static instance: AppComposition;
  
  // Adapters (Infrastructure)
  private authAdapter: AuthPort;
  private userRepoAdapter: UserRepositoryPort;
  private memberRepoAdapter: MemberRepositoryPort;
  private clubRepoAdapter: ClubRepositoryPort;
  private statisticsAdapter: StatisticsPort;
  private auditAdapter: AuditPort;
  private notificationAdapter: NotificationPort;
  private storageAdapter: StoragePort;
  private searchAdapter: SearchPort;

  // Domain Services
  private userService: UserService;
  private memberService: MemberService;
  private clubService: ClubService;

  private constructor() {
    this.initializeAdapters();
    this.initializeServices();
  }

  static getInstance(): AppComposition {
    if (!AppComposition.instance) {
      AppComposition.instance = new AppComposition();
    }
    return AppComposition.instance;
  }

  /**
   * 인프라 어댑터 초기화 (싱글톤 인스턴스 주입)
   */
  private initializeAdapters(): void {
    // Firebase 인프라 싱글톤을 어댑터에 주입
    this.authAdapter = new FirebaseAuthAdapter();
    this.userRepoAdapter = new FirebaseUserRepositoryAdapter();
    this.memberRepoAdapter = new FirebaseMemberRepositoryAdapter();
    this.clubRepoAdapter = new FirebaseClubRepositoryAdapter();
    this.statisticsAdapter = new FirebaseStatisticsAdapter();
    this.auditAdapter = new FirebaseAuditAdapter();
    this.notificationAdapter = new FirebaseNotificationAdapter();
    this.storageAdapter = new FirebaseStorageAdapter();
    this.searchAdapter = new FirebaseSearchAdapter();
  }

  /**
   * 도메인 서비스 초기화 (포트 주입)
   */
  private initializeServices(): void {
    // 포트를 도메인 서비스에 주입
    this.userService = new UserService(
      this.authAdapter,
      this.userRepoAdapter,
      this.statisticsAdapter
    );

    this.memberService = new MemberService(
      this.memberRepoAdapter,
      this.auditAdapter
    );

    this.clubService = new ClubService(
      this.clubRepoAdapter,
      this.memberRepoAdapter,
      this.auditAdapter
    );
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

  // Domain Services
  getUserService(): UserService {
    return this.userService;
  }

  getMemberService(): MemberService {
    return this.memberService;
  }

  getClubService(): ClubService {
    return this.clubService;
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * 테스트용 의존성 재설정
   */
  static reset(): void {
    AppComposition.instance = null as any;
    resetFirebaseSingletons();
  }

  /**
   * 개별 어댑터 교체 (테스트용)
   */
  replaceAuthAdapter(adapter: AuthPort): void {
    this.authAdapter = adapter;
    this.userService = new UserService(
      this.authAdapter,
      this.userRepoAdapter,
      this.statisticsAdapter
    );
  }

  replaceUserRepository(adapter: UserRepositoryPort): void {
    this.userRepoAdapter = adapter;
    this.userService = new UserService(
      this.authAdapter,
      this.userRepoAdapter,
      this.statisticsAdapter
    );
  }
}

/**
 * 전역 Composition Root 인스턴스
 */
export const appComposition = AppComposition.getInstance();

/**
 * 편의 함수들
 */
export const getUserService = () => appComposition.getUserService();
export const getMemberService = () => appComposition.getMemberService();
export const getClubService = () => appComposition.getClubService();
export const getAuthAdapter = () => appComposition.getAuthAdapter();
export const getUserRepository = () => appComposition.getUserRepository();
export const getMemberRepository = () => appComposition.getMemberRepository();
export const getClubRepository = () => appComposition.getClubRepository();
export const getStatisticsAdapter = () => appComposition.getStatisticsAdapter();
export const getAuditAdapter = () => appComposition.getAuditAdapter();
export const getNotificationAdapter = () => appComposition.getNotificationAdapter();
export const getStorageAdapter = () => appComposition.getStorageAdapter();
export const getSearchAdapter = () => appComposition.getSearchAdapter();

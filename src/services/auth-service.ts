import { User } from 'firebase/auth';
import { Firestore, doc, getDoc, collection, query, where, getDocs, setDoc, DocumentData } from 'firebase/firestore';
import { UserProfile, UserRole } from '@/types';
interface CachedProfile {
  profile: UserProfile & { clubId?: string };
  timestamp: number;
}
/**
 * AuthService: 통합 인증 서비스
 * - 프로필 캐싱으로 Firebase 읽기 요청 최소화
 * - 병렬 쿼리 처리로 성능 최적화
 * - 역할별 리다이렉트 URL 중앙 관리
 */
export class AuthService {
  private static instance: AuthService;
  private profileCache: Map<string, CachedProfile> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5분
  private constructor() {}
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
  /**
   * 사용자 프로필 가져오기 (캐싱 포함)
   */
  async getUserProfile(
    firebaseUser: User,
    firestore: Firestore
  ): Promise<(UserProfile & { clubId?: string }) | null> {
    try {
      // 1. 캐시 확인
      const cached = this.getCachedProfile(firebaseUser.uid);
      if (cached) return cached;
      // 2. Firestore에서 프로필 조회
      const userRef = doc(firestore, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile & { clubId?: string };
        // 클럽 ID 확인 (클럽 관련 역할인 경우)
        if (profile.clubName && this.isClubRole(profile.role)) {
          const clubId = await this.getClubId(firestore, profile.clubName);
          if (clubId) {
            profile.clubId = clubId;
          }
        }
        this.cacheProfile(firebaseUser.uid, profile);
        return profile;
      }
      // 3. 프로필이 없으면 승인된 요청 확인 (병렬 처리)
      const approvedProfile = await this.checkApprovedRequests(firebaseUser, firestore);
      if (approvedProfile) {
        // Firestore에 프로필 저장
        await setDoc(userRef, approvedProfile);
        this.cacheProfile(firebaseUser.uid, approvedProfile);
        return approvedProfile;
      }
      return null;
    } catch (error: unknown) {
      return null;
    }
  }
  /**
   * 승인된 요청 확인 (병렬 처리)
   */
  private async checkApprovedRequests(
    firebaseUser: User,
    firestore: Firestore
  ): Promise<UserProfile | null> {
    const [clubOwnerResult, superAdminResult, memberResult] = await Promise.allSettled([
      this.checkRequest(firestore, 'clubOwnerRequests', firebaseUser.email!),
      this.checkRequest(firestore, 'superAdminRequests', firebaseUser.email!),
      this.checkRequest(firestore, 'memberRegistrationRequests', firebaseUser.email!)
    ]);
    // 우선순위에 따라 프로필 생성
    if (clubOwnerResult.status === 'fulfilled' && clubOwnerResult.value) {
      return this.createProfileFromRequest(firebaseUser, clubOwnerResult.value, 'clubOwner', firestore);
    }
    if (superAdminResult.status === 'fulfilled' && superAdminResult.value) {
      return this.createProfileFromRequest(firebaseUser, superAdminResult.value, 'superAdmin', firestore);
    }
    if (memberResult.status === 'fulfilled' && memberResult.value) {
      return this.createProfileFromRequest(firebaseUser, memberResult.value, 'member', firestore);
    }
    // 승인된 요청이 없으면 기본 프로필 생성
    return this.createDefaultProfile(firebaseUser);
  }
  /**
   * 특정 컬렉션에서 승인된 요청 확인
   */
  private async checkRequest(
    firestore: Firestore,
    collectionName: string,
    email: string
  ): Promise<any | null> {
    try {
      const requestsRef = collection(firestore, collectionName);
      const q = query(
        requestsRef,
        where('email', '==', email),
        where('status', '==', 'approved')
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty ? querySnapshot.docs[0].data() : null;
    } catch {
      return null;
    }
  }
  /**
   * 승인된 요청으로부터 프로필 생성
   */
  private async createProfileFromRequest(
    firebaseUser: User,
    request: DocumentData,
    requestType: 'clubOwner' | 'superAdmin' | 'member',
    firestore: Firestore
  ): Promise<UserProfile> {
    const baseProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: request.name || firebaseUser.displayName || firebaseUser.email!.split('@')[0],
      phoneNumber: request.phoneNumber || firebaseUser.phoneNumber,
      photoURL: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/40/40`,
      provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    switch (requestType) {
      case 'clubOwner': {
        const clubId = await this.getClubId(firestore, request.clubName);
        return {
          ...baseProfile,
          role: UserRole.CLUB_OWNER,
          clubId: clubId || undefined,
          clubName: request.clubName,
        } as UserProfile;
      }
      case 'superAdmin':
        return {
          ...baseProfile,
          role: UserRole.SUPER_ADMIN,
        } as UserProfile;
      case 'member':
        return {
          ...baseProfile,
          role: UserRole.MEMBER,
          clubId: request.clubId,
          clubName: request.clubName,
        } as UserProfile;
      default:
        return {
          ...baseProfile,
          role: UserRole.MEMBER,
        } as UserProfile;
    }
  }
  /**
   * 기본 프로필 생성
   */
  private createDefaultProfile(firebaseUser: User): UserProfile {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
      photoURL: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/40/40`,
      role: UserRole.MEMBER,
      provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
  }
  /**
   * 클럽 ID 가져오기
   */
  private async getClubId(firestore: Firestore, clubName: string): Promise<string | null> {
    try {
      const clubsRef = collection(firestore, 'clubs');
      const q = query(clubsRef, where('name', '==', clubName));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty ? querySnapshot.docs[0].id : null;
    } catch {
      return null;
    }
  }
  /**
   * 역할별 리다이렉트 URL 가져오기
   */
  getRedirectUrlByRole(role: UserRole, status?: string): string {
    // 승인 대기 중인 경우
    if (status === 'pending') {
      return '/pending-approval';
    }
    // 역할별 리다이렉트
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return '/super-admin';
      case UserRole.FEDERATION_ADMIN:
        return '/admin';
      case UserRole.CLUB_OWNER:
      case UserRole.CLUB_MANAGER:
      case UserRole.HEAD_COACH:
      case UserRole.ASSISTANT_COACH:
        return '/club-dashboard';
      case UserRole.COMMITTEE_CHAIR:
      case UserRole.COMMITTEE_MEMBER:
        return '/committees';
      default:
        return '/my-profile';
    }
  }
  /**
   * 역할별 접근 권한 확인
   */
  canAccessRoute(userRole: UserRole, route: string): boolean {
    const adminRoutes = ['/admin', '/super-admin', '/system'];
    const clubRoutes = ['/club-dashboard'];
    const memberRoutes = ['/my-profile', '/events', '/competitions'];
    const publicRoutes = ['/login', '/register', '/'];
    // 공개 라우트는 모두 접근 가능
    if (publicRoutes.some(r => route.startsWith(r))) return true;
    // SUPER_ADMIN은 모든 라우트 접근 가능
    if (userRole === UserRole.SUPER_ADMIN) return true;
    // FEDERATION_ADMIN은 관리자 라우트 접근 가능
    if (userRole === UserRole.FEDERATION_ADMIN) {
      return adminRoutes.some(r => route.startsWith(r)) ||
             memberRoutes.some(r => route.startsWith(r));
    }
    // 클럽 관련 역할
    if (this.isClubRole(userRole)) {
      return clubRoutes.some(r => route.startsWith(r)) ||
             memberRoutes.some(r => route.startsWith(r));
    }
    // 일반 회원
    return memberRoutes.some(r => route.startsWith(r));
  }
  /**
   * 클럽 관련 역할인지 확인
   */
  private isClubRole(role: UserRole): boolean {
    return [
      UserRole.CLUB_OWNER,
      UserRole.CLUB_MANAGER,
      UserRole.CLUB_STAFF,
      UserRole.HEAD_COACH,
      UserRole.ASSISTANT_COACH,
      UserRole.MEDIA_MANAGER
    ].includes(role);
  }
  /**
   * 캐시된 프로필 가져오기
   */
  private getCachedProfile(uid: string): (UserProfile & { clubId?: string }) | null {
    const cached = this.profileCache.get(uid);
    if (!cached) return null;
    // 캐시 유효성 확인
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.profileCache.delete(uid);
      return null;
    }
    return cached.profile;
  }
  /**
   * 프로필 캐싱
   */
  private cacheProfile(uid: string, profile: UserProfile & { clubId?: string }): void {
    this.profileCache.set(uid, {
      profile,
      timestamp: Date.now()
    });
  }
  /**
   * 캐시 초기화
   */
  clearCache(uid?: string): void {
    if (uid) {
      this.profileCache.delete(uid);
    } else {
      this.profileCache.clear();
    }
  }
}
// 싱글톤 인스턴스 export
export const authService = AuthService.getInstance();

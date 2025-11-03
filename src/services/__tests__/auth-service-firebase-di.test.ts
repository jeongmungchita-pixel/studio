import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '../auth-service';
import { FirebaseMockFactory, FirebaseTestHelpers, mockDoc, mockGetDoc, mockCollection, mockQuery, mockWhere, mockGetDocs, mockSetDoc, mockUpdateDoc, mockDeleteDoc } from '@/lib/di/firebase-mock-factory';
import type { IAuthService } from '@/lib/di/interfaces';

// Firebase 모듈 Mock
vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  getDoc: mockGetDoc,
  collection: mockCollection,
  query: mockQuery,
  where: mockWhere,
  getDocs: mockGetDocs,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  Firestore: vi.fn(),
}));

describe('AuthService Firebase DI Testing', () => {
  let authService: IAuthService;
  let mockFirestore: any;
  let mockFirebase: any;

  beforeEach(() => {
    // Firebase Mock 생성
    const firebaseMock = FirebaseMockFactory.createMockFirestore();
    mockFirestore = firebaseMock.firestore;
    mockFirebase = {
      ...firebaseMock,
      createMockUser: FirebaseMockFactory.createMockUser,
    };

    // DI로 AuthService 인스턴스 생성
    authService = AuthService.createWithDI();
    
    // Mock 타이머 설정
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Mock 타이머 정리
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('사용자 프로필 관리', () => {
    it('should get user profile from cache', async () => {
      const mockUser = FirebaseMockFactory.createMockUser();
      const mockProfile = FirebaseMockFactory.createMockUserProfile({ uid: mockUser.uid });

      // Firestore 조회 설정
      FirebaseTestHelpers.setupDocumentGetChain(
        mockFirebase.mockDoc,
        mockFirebase.mockGetDoc,
        mockProfile
      );

      // 첫 번째 호출
      const result1 = await authService.getUserProfile(mockUser, mockFirestore);
      expect(result1).toEqual(mockProfile);
      expect(mockFirebase.mockGetDoc).toHaveBeenCalledTimes(1);

      // 두 번째 호출 (캐시에서 가져와야 함)
      const result2 = await authService.getUserProfile(mockUser, mockFirestore);
      expect(result2).toEqual(mockProfile);
      expect(mockFirebase.mockGetDoc).toHaveBeenCalledTimes(1); // 호출 횟수 증가하지 않음
    });

    it('should return null when user profile does not exist', async () => {
      const mockUser = FirebaseMockFactory.createMockUser();

      // Firestore 조회 설정 (존재하지 않는 문서)
      FirebaseTestHelpers.setupDocumentGetChain(
        mockFirebase.mockDoc,
        mockFirebase.mockGetDoc,
        null
      );

      const result = await authService.getUserProfile(mockUser, mockFirestore);
      expect(result).toBeNull();
    });

    it('should handle Firestore errors gracefully', async () => {
      const mockUser = FirebaseMockFactory.createMockUser();

      // Firestore 에러 설정
      mockFirebase.mockGetDoc.mockRejectedValue(new Error('Firestore error'));

      const result = await authService.getUserProfile(mockUser, mockFirestore);
      expect(result).toBeNull();
    });

    it('should check for pending requests', async () => {
      const userId = 'test-user-123';
      const mockRequest = FirebaseMockFactory.createMockApprovalRequest({
        userId,
        status: 'pending',
      });

      // Firestore 쿼리 설정
      FirebaseTestHelpers.setupFirestoreQueryChain(
        mockFirebase.mockCollection,
        mockFirebase.mockQuery,
        mockFirebase.mockWhere,
        mockFirebase.mockGetDocs,
        [mockRequest]
      );

      const result = await authService.hasPendingRequests(userId, mockFirestore);
      expect(result).toBe(true);
    });

    it('should return false when no pending requests exist', async () => {
      const userId = 'test-user-123';

      // Firestore 쿼리 설정 (빈 결과)
      FirebaseTestHelpers.setupFirestoreQueryChain(
        mockFirebase.mockCollection,
        mockFirebase.mockQuery,
        mockFirebase.mockWhere,
        mockFirebase.mockGetDocs,
        []
      );

      const result = await authService.hasPendingRequests(userId, mockFirestore);
      expect(result).toBe(false);
    });
  });

  describe('사용자 프로필 생성', () => {
    it('should create user profile successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        displayName: 'New User',
        role: 'MEMBER',
      };

      // Document 생성 설정
      FirebaseTestHelpers.setupDocumentSetChain(
        mockFirebase.mockDoc,
        mockFirebase.mockSetDoc,
        mockFirebase.mockUpdateDoc
      );

      const result = await authService.createUserProfile(userData, mockFirestore);
      expect(typeof result).toBe('string');
      expect(mockFirebase.mockSetDoc).toHaveBeenCalled();
    });

    it('should handle profile creation errors', async () => {
      const userData = {
        email: 'newuser@example.com',
        displayName: 'New User',
      };

      // Firestore 에러 설정
      mockFirebase.mockSetDoc.mockRejectedValue(new Error('Creation failed'));

      await expect(authService.createUserProfile(userData, mockFirestore))
        .rejects.toThrow('Creation failed');
    });
  });

  describe('사용자 프로필 업데이트', () => {
    it('should update user profile successfully', async () => {
      const userId = 'test-user-123';
      const updates = {
        displayName: 'Updated Name',
        role: 'CLUB_MANAGER',
      };

      // Document 업데이트 설정
      FirebaseTestHelpers.setupDocumentSetChain(
        mockFirebase.mockDoc,
        mockFirebase.mockSetDoc,
        mockFirebase.mockUpdateDoc
      );

      await expect(authService.updateUserProfile(userId, updates, mockFirestore))
        .resolves.not.toThrow();
      expect(mockFirebase.mockUpdateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        updates
      );
    });

    it('should handle profile update errors', async () => {
      const userId = 'test-user-123';
      const updates = { displayName: 'Updated Name' };

      // Firestore 에러 설정
      mockFirebase.mockUpdateDoc.mockRejectedValue(new Error('Update failed'));

      await expect(authService.updateUserProfile(userId, updates, mockFirestore))
        .rejects.toThrow('Update failed');
    });
  });

  describe('사용자 프로필 삭제', () => {
    it('should delete user profile successfully', async () => {
      const userId = 'test-user-123';

      // Document 삭제 설정
      mockFirebase.mockDoc.mockReturnValue('mock-doc-ref');
      mockFirebase.mockDeleteDoc.mockResolvedValue(undefined);

      await expect(authService.deleteUserProfile(userId, mockFirestore))
        .resolves.not.toThrow();
      expect(mockFirebase.mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref');
    });

    it('should handle profile deletion errors', async () => {
      const userId = 'test-user-123';

      // Firestore 에러 설정
      mockFirebase.mockDeleteDoc.mockRejectedValue(new Error('Deletion failed'));

      await expect(authService.deleteUserProfile(userId, mockFirestore))
        .rejects.toThrow('Deletion failed');
    });
  });

  describe('캐시 관리', () => {
    it('should respect cache TTL', async () => {
      const mockUser = FirebaseMockFactory.createMockUser();
      const mockProfile = FirebaseMockFactory.createMockUserProfile({ uid: mockUser.uid });

      // Firestore 조회 설정
      FirebaseTestHelpers.setupDocumentGetChain(
        mockFirebase.mockDoc,
        mockFirebase.mockGetDoc,
        mockProfile
      );

      // 첫 번째 호출
      await authService.getUserProfile(mockUser, mockFirestore);
      expect(mockFirebase.mockGetDoc).toHaveBeenCalledTimes(1);

      // 캐시 TTL 경과 전
      vi.advanceTimersByTime(4 * 60 * 1000); // 4분
      await authService.getUserProfile(mockUser, mockFirestore);
      expect(mockFirebase.mockGetDoc).toHaveBeenCalledTimes(1); // 여전히 캐시에서 가져옴

      // 캐시 TTL 경과 후
      vi.advanceTimersByTime(2 * 60 * 1000); // 추가 2분 (총 6분)
      await authService.getUserProfile(mockUser, mockFirestore);
      expect(mockFirebase.mockGetDoc).toHaveBeenCalledTimes(2); // 새로 조회
    });
  });

  describe('클럽 관련 기능', () => {
    it('should handle club role profiles', async () => {
      const mockUser = FirebaseMockFactory.createMockUser();
      const mockProfile = FirebaseMockFactory.createMockUserProfile({
        uid: mockUser.uid,
        role: 'CLUB_OWNER',
        clubName: 'Test Club',
      });

      // Firestore 조회 설정
      FirebaseTestHelpers.setupDocumentGetChain(
        mockFirebase.mockDoc,
        mockFirebase.mockGetDoc,
        mockProfile
      );

      // 클럽 ID 조회 설정
      FirebaseTestHelpers.setupFirestoreQueryChain(
        mockFirebase.mockCollection,
        mockFirebase.mockQuery,
        mockFirebase.mockWhere,
        mockFirebase.mockGetDocs,
        [{ id: 'club-123', name: 'Test Club' }]
      );

      const result = await authService.getUserProfile(mockUser, mockFirestore);
      expect(result?.clubId).toBe('club-123');
    });
  });

  describe('에러 처리', () => {
    it('should handle invalid user data gracefully', async () => {
      const invalidUser = FirebaseMockFactory.createMockUser({ uid: '' });

      const result = await authService.getUserProfile(invalidUser, mockFirestore);
      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      const mockUser = FirebaseMockFactory.createMockUser();

      // 네트워크 에러 설정
      mockFirebase.mockGetDoc.mockRejectedValue(new Error('Network error'));

      const result = await authService.getUserProfile(mockUser, mockFirestore);
      expect(result).toBeNull();
    });
  });
});

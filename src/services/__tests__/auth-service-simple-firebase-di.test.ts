import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../auth-service';

// Firebase Mock Factory - 간단한 버전
const createMockFirestore = () => {
  const mockDoc = vi.fn();
  const mockGetDoc = vi.fn();
  const mockCollection = vi.fn();
  const mockQuery = vi.fn();
  const mockWhere = vi.fn();
  const mockGetDocs = vi.fn();
  const mockSetDoc = vi.fn();
  const mockUpdateDoc = vi.fn();
  const mockDeleteDoc = vi.fn();

  return {
    doc: mockDoc,
    getDoc: mockGetDoc,
    collection: mockCollection,
    query: mockQuery,
    where: mockWhere,
    getDocs: mockGetDocs,
    setDoc: mockSetDoc,
    updateDoc: mockUpdateDoc,
    deleteDoc: mockDeleteDoc,
  };
};

const createMockUser = (overrides = {}) => ({
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  ...overrides,
});

describe('AuthService Simple Firebase DI Testing', () => {
  let authService: AuthService;
  let mockFirestore: any;

  beforeEach(() => {
    // Mock Firestore 생성
    mockFirestore = createMockFirestore();
    
    // DI로 AuthService 인스턴스 생성
    authService = AuthService.createWithDI();
    
    // Mock 타이머 설정
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('기본 기능 테스트', () => {
    it('should create AuthService instance with DI', () => {
      expect(authService).toBeInstanceOf(AuthService);
    });

    it('should handle getUserProfile with mock data', async () => {
      const mockUser = createMockUser();
      const mockProfile = {
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName,
        role: 'MEMBER',
        status: 'active',
      };

      // Mock 설정
      mockFirestore.doc.mockReturnValue('mock-doc-ref');
      mockFirestore.getDoc.mockResolvedValue({
        exists: true,
        id: mockUser.uid,
        data: () => mockProfile,
      });

      const result = await authService.getUserProfile(mockUser, mockFirestore);
      
      expect(result).toEqual(mockProfile);
      expect(mockFirestore.doc).toHaveBeenCalledWith('users', mockUser.uid);
      expect(mockFirestore.getDoc).toHaveBeenCalledWith('mock-doc-ref');
    });

    it('should return null when user does not exist', async () => {
      const mockUser = createMockUser();

      // Mock 설정 (존재하지 않는 사용자)
      mockFirestore.doc.mockReturnValue('mock-doc-ref');
      mockFirestore.getDoc.mockResolvedValue({
        exists: false,
        data: () => null,
      });

      const result = await authService.getUserProfile(mockUser, mockFirestore);
      
      expect(result).toBeNull();
    });

    it('should check pending requests correctly', async () => {
      const userId = 'test-user-123';
      const mockRequest = {
        id: 'request-123',
        userId,
        status: 'pending',
      };

      // Mock 설정
      mockFirestore.collection.mockReturnValue('mock-collection-ref');
      mockFirestore.query.mockReturnValue('mock-query');
      mockFirestore.where.mockReturnValue('mock-where');
      mockFirestore.getDocs.mockResolvedValue({
        empty: false,
        docs: [{
          data: () => mockRequest,
        }],
      });

      const result = await authService.hasPendingRequests(userId, mockFirestore);
      
      expect(result).toBe(true);
      expect(mockFirestore.collection).toHaveBeenCalledWith('approval_requests');
    });

    it('should return false when no pending requests', async () => {
      const userId = 'test-user-123';

      // Mock 설정 (빈 결과)
      mockFirestore.collection.mockReturnValue('mock-collection-ref');
      mockFirestore.query.mockReturnValue('mock-query');
      mockFirestore.where.mockReturnValue('mock-where');
      mockFirestore.getDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await authService.hasPendingRequests(userId, mockFirestore);
      
      expect(result).toBe(false);
    });
  });

  describe('프로필 CRUD 작업', () => {
    it('should create user profile', async () => {
      const userData = {
        email: 'newuser@example.com',
        displayName: 'New User',
        role: 'MEMBER',
      };

      // Mock 설정
      mockFirestore.doc.mockReturnValue('mock-doc-ref');
      mockFirestore.setDoc.mockResolvedValue(undefined);

      const result = await authService.createUserProfile(userData, mockFirestore);
      
      expect(typeof result).toBe('string');
      expect(mockFirestore.setDoc).toHaveBeenCalledWith('mock-doc-ref', expect.objectContaining({
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        status: 'pending',
        uid: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }));
    });

    it('should update user profile', async () => {
      const userId = 'test-user-123';
      const updates = {
        displayName: 'Updated Name',
        role: 'CLUB_MANAGER',
      };

      // Mock 설정
      mockFirestore.doc.mockReturnValue('mock-doc-ref');
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      await authService.updateUserProfile(userId, updates, mockFirestore);
      
      expect(mockFirestore.updateDoc).toHaveBeenCalledWith('mock-doc-ref', expect.objectContaining({
        displayName: updates.displayName,
        role: updates.role,
        updatedAt: expect.any(String),
      }));
    });

    it('should delete user profile', async () => {
      const userId = 'test-user-123';

      // Mock 설정
      mockFirestore.doc.mockReturnValue('mock-doc-ref');
      mockFirestore.deleteDoc.mockResolvedValue(undefined);

      await authService.deleteUserProfile(userId, mockFirestore);
      
      expect(mockFirestore.deleteDoc).toHaveBeenCalledWith('mock-doc-ref');
    });
  });

  describe('에러 처리', () => {
    it('should handle Firestore errors gracefully', async () => {
      const mockUser = createMockUser();

      // Mock 에러 설정
      mockFirestore.doc.mockReturnValue('mock-doc-ref');
      mockFirestore.getDoc.mockRejectedValue(new Error('Firestore error'));

      const result = await authService.getUserProfile(mockUser, mockFirestore);
      
      expect(result).toBeNull();
    });

    it('should handle network errors in CRUD operations', async () => {
      const userData = { email: 'test@example.com' };

      // Mock 에러 설정
      mockFirestore.doc.mockReturnValue('mock-doc-ref');
      mockFirestore.setDoc.mockRejectedValue(new Error('Network error'));

      await expect(authService.createUserProfile(userData, mockFirestore))
        .rejects.toThrow('Network error');
    });
  });

  describe('유틸리티 기능', () => {
    it('should return correct redirect URLs', () => {
      expect(authService.getRedirectUrl('SUPER_ADMIN')).toBe('/admin/dashboard');
      expect(authService.getRedirectUrl('CLUB_OWNER')).toBe('/club-dashboard');
      expect(authService.getRedirectUrl('HEAD_COACH')).toBe('/coach-dashboard');
      expect(authService.getRedirectUrl('MEMBER')).toBe('/dashboard');
    });
  });
});

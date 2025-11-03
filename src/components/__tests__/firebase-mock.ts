import { vi } from 'vitest';

// Firebase Mock 완전 정복용 유틸리티
export function createFirebaseMocks() {
  // Firestore Mock
  const mockDoc = vi.fn();
  const mockCollection = vi.fn();
  const mockGetDoc = vi.fn();
  const mockGetDocs = vi.fn();
  const mockSetDoc = vi.fn();
  const mockUpdateDoc = vi.fn();
  const mockDeleteDoc = vi.fn();
  const mockRunTransaction = vi.fn();

  const mockDocRef = {
    get: mockGetDoc,
    set: mockSetDoc,
    update: mockUpdateDoc,
    delete: mockDeleteDoc,
  };

  const mockCollectionRef = {
    doc: mockDoc,
    get: mockGetDocs,
  };

  const mockFirestore = {
    doc: mockDoc,
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  };

  // Auth Mock
  const mockSignOut = vi.fn();
  const mockCurrentUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockAuth = {
    currentUser: mockCurrentUser,
    signOut: mockSignOut,
  };

  // Setup mock chain
  mockDoc.mockReturnValue(mockDocRef);
  mockCollection.mockReturnValue(mockCollectionRef);

  return {
    firestore: mockFirestore,
    auth: mockAuth,
    doc: mockDoc,
    collection: mockCollection,
    getDoc: mockGetDoc,
    getDocs: mockGetDocs,
    setDoc: mockSetDoc,
    updateDoc: mockUpdateDoc,
    deleteDoc: mockDeleteDoc,
    runTransaction: mockRunTransaction,
    docRef: mockDocRef,
    collectionRef: mockCollectionRef,
  };
}

// Firebase 모듈 Mock 설정
export function setupFirebaseMocks() {
  const firebaseMocks = createFirebaseMocks();
  
  vi.doMock('firebase/firestore', () => ({
    doc: firebaseMocks.doc,
    collection: firebaseMocks.collection,
    getDoc: firebaseMocks.getDoc,
    getDocs: firebaseMocks.getDocs,
    setDoc: firebaseMocks.setDoc,
    updateDoc: firebaseMocks.updateDoc,
    deleteDoc: firebaseMocks.deleteDoc,
    runTransaction: firebaseMocks.runTransaction,
  }));

  vi.doMock('firebase/auth', () => ({
    signOut: firebaseMocks.auth.signOut,
  }));

  return firebaseMocks;
}

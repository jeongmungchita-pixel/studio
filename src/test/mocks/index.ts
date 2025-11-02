import { vi } from 'vitest';

// Initialize all mocks at the top level to avoid circular dependencies
const mockForwardRef = vi.fn((render: any) => {
  const MockComponent = (props: any) => {
    return render(props, null);
  };
  MockComponent.displayName = `forwardRef(${render.displayName || render.name || 'Component'})`;
  return MockComponent;
});

// React forwardRef Mock - Define first
export const mockReact = {
  forwardRef: mockForwardRef,
};

// Firebase Admin Mock
export const mockFirebaseAdmin = {
  getAdminFirestore: vi.fn(() => ({
    collection: vi.fn((collectionName: string) => ({
      doc: vi.fn((docId?: string) => ({
        id: docId || 'generated-id',
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ 
            uid: docId || 'user-123',
            status: 'pending',
            email: 'test@example.com',
            displayName: 'Test User'
          }),
        }),
        update: vi.fn(),
        set: vi.fn(),
      })),
      add: vi.fn().mockResolvedValue({ id: 'audit-log-id' }),
      where: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ empty: true }),
      })),
    })),
    runTransaction: vi.fn((callback) => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ clubId: 'club-1' }),
        }),
        update: vi.fn(),
        set: vi.fn(),
      };
      return callback(mockTransaction);
    }),
  })),
};

// Firebase Client Mock
export const mockFirebase = {
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
  },
  firestore: {
    collection: vi.fn(),
    doc: vi.fn(),
  },
};

// Next.js Router Mock
export const mockNextRouter = {
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
};

// APIError Mock
export const mockAPIError = {
  fromError: vi.fn((err) => ({
    message: err?.message || 'API Error',
    code: 'API_ERROR',
    status: 500
  }))
};

// Common test data
export const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'MEMBER',
  status: 'active',
};

export const mockProps = {
  user: mockUser,
  isLoading: false,
  error: null,
};

// Setup function to apply all mocks
export function setupTestMocks() {
  vi.mock('@/lib/firebase-admin', () => mockFirebaseAdmin);
  vi.mock('@/firebase', () => mockFirebase);
  vi.mock('next/navigation', () => mockNextRouter);
  vi.mock('react', async () => {
    const actual = await vi.importActual('react');
    return {
      ...actual,
      ...mockReact,
    };
  });
  vi.mock('@/utils/error/api-error', () => mockAPIError);
}

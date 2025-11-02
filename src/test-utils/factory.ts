import { UserRole, UserProfile } from '@/types/auth';

export function createMockUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    role: (overrides as any).role ?? (UserRole as any)?.MEMBER ?? 'MEMBER',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as UserProfile;
}

export function createPendingUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return createMockUser({ status: 'pending', ...overrides });
}

export function freeze<T>(obj: T): Readonly<T> {
  return Object.freeze({ ...obj });
}

import { describe, it, expect } from 'vitest';
import {
  isApiError,
  isApiResponse,
  safeJsonParse,
  hasMinimumRole,
  isClubStaff,
  isAdmin,
  getErrorMessage,
} from '../type-guards';
import { UserRole } from '@/types/auth';

describe('type-guards (more)', () => {
  it('isApiError: true for structured api error', () => {
    expect(
      isApiError({ code: 'X', message: 'm', statusCode: 400 })
    ).toBe(true);
  });

  it('isApiError: false for partial or wrong types', () => {
    expect(isApiError({ code: 'X', message: 'm' })).toBe(false);
    expect(isApiError({ code: 1, message: 'm', statusCode: 400 })).toBe(false as any);
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
  });

  it('isApiResponse: true/false on basic shape only', () => {
    expect(isApiResponse({ success: true, timestamp: new Date().toISOString() })).toBe(true);
    expect(isApiResponse({ success: 'yes', timestamp: '' })).toBe(false as any);
    expect(isApiResponse(null)).toBe(false);
  });

  it('safeJsonParse: returns parsed or fallback on error', () => {
    const obj = { a: 1 };
    expect(safeJsonParse(JSON.stringify(obj), { b: 2 })).toEqual(obj);
    expect(safeJsonParse('{invalid', { b: 2 } as any)).toEqual({ b: 2 });
  });

  it('hasMinimumRole: respects role hierarchy and handles undefined', () => {
    expect(hasMinimumRole(UserRole.CLUB_MANAGER, UserRole.CLUB_STAFF)).toBe(true);
    expect(hasMinimumRole(UserRole.CLUB_STAFF, UserRole.CLUB_MANAGER)).toBe(false);
    expect(hasMinimumRole(undefined, UserRole.MEMBER)).toBe(false);
  });

  it('isClubStaff / isAdmin: roles evaluated correctly', () => {
    expect(isClubStaff(UserRole.CLUB_OWNER)).toBe(true);
    expect(isClubStaff(UserRole.MEMBER)).toBe(false);
    expect(isAdmin(UserRole.SUPER_ADMIN)).toBe(true);
    expect(isAdmin(UserRole.FEDERATION_ADMIN)).toBe(true);
    expect(isAdmin(UserRole.MEMBER)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it('getErrorMessage: normalizes various error inputs', () => {
    expect(getErrorMessage({ code: 'E', message: 'api', statusCode: 400 } as any)).toBe('api');
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
    expect(getErrorMessage('text')).toBe('text');
    expect(getErrorMessage(123 as any)).toBe('Unknown error occurred');
  });
});

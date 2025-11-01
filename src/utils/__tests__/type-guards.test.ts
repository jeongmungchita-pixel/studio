import { describe, it, expect } from 'vitest';
import { 
  isUserProfile,
  isMember,
  isApiError,
  isApiResponse,
  isFirebaseError,
  isDocumentData,
  isArray,
  isNotNull,
  isDefined,
  isPresent,
  isString,
  isNumber,
  isBoolean,
  isDate,
  hasMinimumRole,
  isClubStaff,
  isAdmin,
  getErrorMessage,
  safeJsonParse,
  hasProperty,
  objectKeys,
  objectValues,
  objectEntries,
} from '../type-guards';
import { UserRole } from '@/types/auth';

describe('Type Guards', () => {
  describe('isUserProfile', () => {
    it('should return true for valid UserProfile', () => {
      const validProfile = {
        uid: '123',
        email: 'test@example.com',
        displayName: 'Test User',
        status: 'active',
        role: UserRole.MEMBER,
        provider: 'email',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(isUserProfile(validProfile)).toBe(true);
    });

    it('should return false for invalid UserProfile', () => {
      expect(isUserProfile(null)).toBe(false);
      expect(isUserProfile(undefined)).toBe(false);
      expect(isUserProfile({})).toBe(false);
      expect(isUserProfile({ uid: '123' })).toBe(false);
      expect(isUserProfile({ 
        uid: '123', 
        email: 'test@example.com',
        displayName: 'Test',
        status: 'invalid-status',
        role: 'INVALID_ROLE'
      })).toBe(false);
    });
  });

  describe('isMember', () => {
    it('should return true for valid Member', () => {
      const validMember = {
        id: '123',
        name: 'Test Member',
        clubId: 'club-123',
        memberCategory: 'adult',
        memberType: 'individual',
      };
      expect(isMember(validMember)).toBe(true);
    });

    it('should return false for invalid Member', () => {
      expect(isMember(null)).toBe(false);
      expect(isMember(undefined)).toBe(false);
      expect(isMember({})).toBe(false);
      expect(isMember({
        id: '123',
        name: 'Test',
        clubId: 'club-123',
        memberCategory: 'invalid',
        memberType: 'individual',
      })).toBe(false);
    });
  });

  describe('isApiError', () => {
    it('should return true for valid ApiError', () => {
      const validError = {
        code: 'ERROR_CODE',
        message: 'Error message',
        statusCode: 400,
      };
      expect(isApiError(validError)).toBe(true);
    });

    it('should return false for invalid ApiError', () => {
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
      expect(isApiError({})).toBe(false);
      expect(isApiError(new Error('Test'))).toBe(false);
      expect(isApiError({
        message: 'Error',
        statusCode: 400,
      })).toBe(false);
    });
  });

  describe('isApiResponse', () => {
    it('should return true for valid ApiResponse', () => {
      const validResponse = {
        success: true,
        timestamp: '2024-01-01T00:00:00.000Z',
        data: { test: 'data' },
      };
      expect(isApiResponse(validResponse)).toBe(true);
    });

    it('should return false for invalid ApiResponse', () => {
      expect(isApiResponse(null)).toBe(false);
      expect(isApiResponse(undefined)).toBe(false);
      expect(isApiResponse({})).toBe(false);
      expect(isApiResponse({
        success: true,
      })).toBe(false);
    });
  });

  describe('isFirebaseError', () => {
    it('should return true for valid FirebaseError', () => {
      const validError = {
        code: 'auth/invalid-email',
        message: 'Invalid email',
        name: 'FirebaseError',
      };
      expect(isFirebaseError(validError)).toBe(true);
    });

    it('should return false for invalid FirebaseError', () => {
      expect(isFirebaseError(null)).toBe(false);
      expect(isFirebaseError(undefined)).toBe(false);
      expect(isFirebaseError(new Error('Test'))).toBe(false);
      expect(isFirebaseError({
        code: 'error',
        message: 'Error',
        name: 'Error',
      })).toBe(false);
    });
  });

  describe('isDocumentData', () => {
    it('should return true for valid DocumentData', () => {
      expect(isDocumentData({})).toBe(true);
      expect(isDocumentData({ field: 'value' })).toBe(true);
      expect(isDocumentData({ nested: { data: true } })).toBe(true);
    });

    it('should return false for invalid DocumentData', () => {
      expect(isDocumentData(null)).toBe(false);
      expect(isDocumentData(undefined)).toBe(false);
      expect(isDocumentData([])).toBe(false);
      expect(isDocumentData('string')).toBe(false);
      expect(isDocumentData(123)).toBe(false);
    });
  });

  describe('isArray', () => {
    it('should return true for valid arrays', () => {
      expect(isArray([1, 2, 3], isNumber)).toBe(true);
      expect(isArray(['a', 'b', 'c'], isString)).toBe(true);
      expect(isArray([], isNumber)).toBe(true);
    });

    it('should return false for invalid arrays', () => {
      expect(isArray([1, 'two', 3], isNumber)).toBe(false);
      expect(isArray('not an array', isNumber)).toBe(false);
      expect(isArray(null, isNumber)).toBe(false);
    });
  });

  describe('Null/Undefined checks', () => {
    it('isNotNull should work correctly', () => {
      expect(isNotNull('value')).toBe(true);
      expect(isNotNull(0)).toBe(true);
      expect(isNotNull('')).toBe(true);
      expect(isNotNull(null)).toBe(false);
    });

    it('isDefined should work correctly', () => {
      expect(isDefined('value')).toBe(true);
      expect(isDefined(0)).toBe(true);
      expect(isDefined(null)).toBe(true);
      expect(isDefined(undefined)).toBe(false);
    });

    it('isPresent should work correctly', () => {
      expect(isPresent('value')).toBe(true);
      expect(isPresent(0)).toBe(true);
      expect(isPresent('')).toBe(true);
      expect(isPresent(null)).toBe(false);
      expect(isPresent(undefined)).toBe(false);
    });
  });

  describe('Primitive type checks', () => {
    it('isString should work correctly', () => {
      expect(isString('test')).toBe(true);
      expect(isString('')).toBe(true);
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
    });

    it('isNumber should work correctly', () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-123)).toBe(true);
      expect(isNumber(123.45)).toBe(true);
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber('123')).toBe(false);
    });

    it('isBoolean should work correctly', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean('true')).toBe(false);
    });

    it('isDate should work correctly', () => {
      expect(isDate(new Date())).toBe(true);
      expect(isDate(new Date('2024-01-01'))).toBe(true);
      expect(isDate(new Date('invalid'))).toBe(false);
      expect(isDate('2024-01-01')).toBe(false);
      expect(isDate(Date.now())).toBe(false);
    });
  });

  describe('Role checks', () => {
    it('hasMinimumRole should work correctly', () => {
      expect(hasMinimumRole(UserRole.SUPER_ADMIN, UserRole.MEMBER)).toBe(true);
      expect(hasMinimumRole(UserRole.CLUB_OWNER, UserRole.CLUB_OWNER)).toBe(true);
      expect(hasMinimumRole(UserRole.MEMBER, UserRole.SUPER_ADMIN)).toBe(false);
      expect(hasMinimumRole(undefined, UserRole.MEMBER)).toBe(false);
    });

    it('isClubStaff should work correctly', () => {
      expect(isClubStaff(UserRole.CLUB_OWNER)).toBe(true);
      expect(isClubStaff(UserRole.CLUB_MANAGER)).toBe(true);
      expect(isClubStaff(UserRole.CLUB_STAFF)).toBe(true);
      expect(isClubStaff(UserRole.HEAD_COACH)).toBe(true);
      expect(isClubStaff(UserRole.ASSISTANT_COACH)).toBe(true);
      expect(isClubStaff(UserRole.MEMBER)).toBe(false);
      expect(isClubStaff(UserRole.PARENT)).toBe(false);
      expect(isClubStaff(undefined)).toBe(false);
    });

    it('isAdmin should work correctly', () => {
      expect(isAdmin(UserRole.SUPER_ADMIN)).toBe(true);
      expect(isAdmin(UserRole.FEDERATION_ADMIN)).toBe(true);
      expect(isAdmin(UserRole.CLUB_OWNER)).toBe(false);
      expect(isAdmin(UserRole.MEMBER)).toBe(false);
      expect(isAdmin(undefined)).toBe(false);
    });
  });

  describe('Error message extraction', () => {
    it('should extract error message correctly', () => {
      expect(getErrorMessage({ 
        code: 'ERROR', 
        message: 'Api error', 
        statusCode: 400 
      })).toBe('Api error');
      
      expect(getErrorMessage({ 
        code: 'auth/invalid', 
        message: 'Firebase error', 
        name: 'FirebaseError' 
      })).toBe('Firebase error');
      
      expect(getErrorMessage(new Error('Standard error'))).toBe('Standard error');
      expect(getErrorMessage('String error')).toBe('String error');
      expect(getErrorMessage(null)).toBe('Unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('Unknown error occurred');
      expect(getErrorMessage({})).toBe('Unknown error occurred');
    });
  });

  describe('Safe JSON parse', () => {
    it('should parse valid JSON', () => {
      expect(safeJsonParse('{"key":"value"}', null)).toEqual({ key: 'value' });
      expect(safeJsonParse('[1,2,3]', [])).toEqual([1, 2, 3]);
      expect(safeJsonParse('null', 'default')).toBe(null);
    });

    it('should return fallback for invalid JSON', () => {
      expect(safeJsonParse('invalid json', 'fallback')).toBe('fallback');
      expect(safeJsonParse('{incomplete', {})).toEqual({});
      expect(safeJsonParse('', [])).toEqual([]);
    });
  });

  describe('Object utilities', () => {
    it('hasProperty should work correctly', () => {
      const obj = { key: 'value', nested: { prop: true } };
      expect(hasProperty(obj, 'key')).toBe(true);
      expect(hasProperty(obj, 'nested')).toBe(true);
      expect(hasProperty(obj, 'missing')).toBe(false);
      expect(hasProperty(null, 'key')).toBe(false);
      expect(hasProperty(undefined, 'key')).toBe(false);
    });

    it('objectKeys should work correctly', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(objectKeys(obj)).toEqual(['a', 'b', 'c']);
      expect(objectKeys({})).toEqual([]);
    });

    it('objectValues should work correctly', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(objectValues(obj)).toEqual([1, 2, 3]);
      expect(objectValues({})).toEqual([]);
    });

    it('objectEntries should work correctly', () => {
      const obj = { a: 1, b: 2 };
      expect(objectEntries(obj)).toEqual([['a', 1], ['b', 2]]);
      expect(objectEntries({})).toEqual([]);
    });
  });
});

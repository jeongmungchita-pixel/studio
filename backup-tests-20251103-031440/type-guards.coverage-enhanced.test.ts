import { describe, it, expect } from 'vitest';
import { 
  isUserProfile, 
  isMember, 
  isApiError, 
  isApiResponse, 
  isFirebaseError, 
  isDocumentData,
  hasMinimumRole,
  isClubStaff,
  isAdmin,
  getErrorMessage,
  safeJsonParse
} from '../type-guards';
import { UserRole } from '@/types/auth';
import { ApiError, ApiResponse } from '@/types/api';
import { FirebaseError } from 'firebase/app';

describe('Type Guards Coverage Enhancement', () => {
  describe('isUserProfile', () => {
    it('should return true for valid UserProfile', () => {
      const validUser = {
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        status: 'active',
        role: UserRole.MEMBER
      };
      expect(isUserProfile(validUser)).toBe(true);
    });

    it('should return false for invalid UserProfile', () => {
      const invalidUsers = [
        null,
        undefined,
        'string',
        123,
        {},
        { uid: '123' }, // missing required fields
        { uid: '123', email: 'test@example.com' }, // missing fields
        { uid: 123, email: 'test@example.com', displayName: 'Test', status: 'active', role: UserRole.MEMBER }, // wrong type
        { uid: '123', email: 'test@example.com', displayName: 'Test', status: 'active', role: 'INVALID_ROLE' } // invalid role
      ];

      invalidUsers.forEach(user => {
        expect(isUserProfile(user)).toBe(false);
      });
    });

    it('should handle all UserRole values', () => {
      Object.values(UserRole).forEach(role => {
        const user = {
          uid: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          status: 'active',
          role
        };
        expect(isUserProfile(user)).toBe(true);
      });
    });
  });

  describe('isMember', () => {
    it('should return true for valid Member', () => {
      const validMember = {
        id: 'member-123',
        name: 'John Doe',
        clubId: 'club-123',
        memberCategory: 'adult' as const,
        memberType: 'individual' as const
      };
      expect(isMember(validMember)).toBe(true);
    });

    it('should return false for invalid Member', () => {
      const invalidMembers = [
        null,
        undefined,
        {},
        { id: '123' }, // missing fields
        { id: 123, name: 'John', clubId: 'club', memberCategory: 'adult', memberType: 'individual' }, // wrong type
        { id: '123', name: 'John', clubId: 'club', memberCategory: 'invalid', memberType: 'individual' }, // invalid category
        { id: '123', name: 'John', clubId: 'club', memberCategory: 'adult', memberType: 'invalid' } // invalid type
      ];

      invalidMembers.forEach(member => {
        expect(isMember(member)).toBe(false);
      });
    });

    it('should handle all valid combinations', () => {
      const categories = ['adult', 'child'] as const;
      const types = ['individual', 'family'] as const;

      categories.forEach(category => {
        types.forEach(type => {
          const member = {
            id: 'member-123',
            name: 'John Doe',
            clubId: 'club-123',
            memberCategory: category,
            memberType: type
          };
          expect(isMember(member)).toBe(true);
        });
      });
    });
  });

  describe('isApiError', () => {
    it('should return true for valid ApiError', () => {
      const validError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'email' }
      };
      expect(isApiError(validError)).toBe(true);
    });

    it('should return false for invalid ApiError', () => {
      const invalidErrors = [
        null,
        undefined,
        'string',
        {},
        { code: 123 }, // wrong type
        { message: 'error' } // missing code
      ];

      invalidErrors.forEach(error => {
        expect(isApiError(error)).toBe(false);
      });
    });
  });

  describe('isApiResponse', () => {
    it('should return true for valid ApiResponse', () => {
      const validResponse = {
        success: true,
        data: { id: '123' },
        message: 'Operation successful'
      };
      expect(isApiResponse(validResponse)).toBe(true);
    });

    it('should return false for invalid ApiResponse', () => {
      const invalidResponses = [
        null,
        undefined,
        {},
        { success: 'true' }, // wrong type
        { data: 'test' } // missing success
      ];

      invalidResponses.forEach(response => {
        expect(isApiResponse(response)).toBe(false);
      });
    });
  });

  describe('isFirebaseError', () => {
    it('should return true for FirebaseError', () => {
      const firebaseError = new Error('Firebase error') as FirebaseError;
      firebaseError.code = 'auth/user-not-found';
      expect(isFirebaseError(firebaseError)).toBe(true);
    });

    it('should return false for non-Firebase errors', () => {
      const nonFirebaseErrors = [
        null,
        undefined,
        'string',
        new Error('Regular error'),
        { code: '123' } // missing name
      ];

      nonFirebaseErrors.forEach(error => {
        expect(isFirebaseError(error)).toBe(false);
      });
    });
  });

  describe('isDocumentData', () => {
    it('should return true for valid DocumentData', () => {
      const validData = {
        field1: 'value1',
        field2: 123,
        field3: true,
        field4: { nested: 'data' },
        field5: ['array', 'data']
      };
      expect(isDocumentData(validData)).toBe(true);
    });

    it('should return false for invalid DocumentData', () => {
      const invalidData = [
        null,
        undefined,
        'string',
        123,
        true,
        new Date(),
        Symbol('test')
      ];

      invalidData.forEach(data => {
        expect(isDocumentData(data)).toBe(false);
      });
    });
  });

  describe('hasMinimumRole', () => {
    it('should correctly check minimum role requirements', () => {
      expect(hasMinimumRole(UserRole.SUPER_ADMIN, UserRole.MEMBER)).toBe(true);
      expect(hasMinimumRole(UserRole.MEMBER, UserRole.SUPER_ADMIN)).toBe(false);
      expect(hasMinimumRole(UserRole.CLUB_OWNER, UserRole.MEMBER)).toBe(true);
      expect(hasMinimumRole(UserRole.MEMBER, UserRole.MEMBER)).toBe(true);
    });

    it('should handle invalid roles', () => {
      expect(hasMinimumRole('INVALID' as UserRole, UserRole.MEMBER)).toBe(false);
      expect(hasMinimumRole(UserRole.MEMBER, 'INVALID' as UserRole)).toBe(false);
    });
  });

  describe('isClubStaff', () => {
    it('should identify club staff roles', () => {
      const staffRoles = [
        UserRole.CLUB_OWNER,
        UserRole.CLUB_MANAGER,
        UserRole.CLUB_STAFF
      ];

      staffRoles.forEach(role => {
        expect(isClubStaff(role)).toBe(true);
      });
    });

    it('should reject non-staff roles', () => {
      const nonStaffRoles = [
        UserRole.MEMBER,
        UserRole.PARENT,
        UserRole.SUPER_ADMIN
      ];

      nonStaffRoles.forEach(role => {
        expect(isClubStaff(role)).toBe(false);
      });
    });
  });

  describe('isAdmin', () => {
    it('should identify admin roles', () => {
      const adminRoles = [
        UserRole.SUPER_ADMIN,
        UserRole.FEDERATION_ADMIN
      ];

      adminRoles.forEach(role => {
        expect(isAdmin(role)).toBe(true);
      });
    });

    it('should reject non-admin roles', () => {
      const nonAdminRoles = [
        UserRole.MEMBER,
        UserRole.CLUB_OWNER,
        UserRole.PARENT
      ];

      nonAdminRoles.forEach(role => {
        expect(isAdmin(role)).toBe(false);
      });
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error objects', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('should handle string errors', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should handle ApiError objects', () => {
      const apiError = {
        code: 'VALIDATION_ERROR',
        message: 'API validation failed',
        details: { field: 'email' }
      };
      expect(getErrorMessage(apiError)).toBe('API validation failed');
    });

    it('should return default message for unknown errors', () => {
      expect(getErrorMessage(null)).toBe('Unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('Unknown error occurred');
      expect(getErrorMessage(123)).toBe('Unknown error occurred');
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON strings', () => {
      const validJson = '{"key": "value", "number": 123}';
      const defaultValue = { error: true };
      const result = safeJsonParse(validJson, defaultValue);
      
      expect(result).toEqual({ key: 'value', number: 123 });
    });

    it('should handle invalid JSON strings', () => {
      const invalidJson = '{key: value}'; // invalid JSON
      const defaultValue = { error: true };
      const result = safeJsonParse(invalidJson, defaultValue);
      
      expect(result).toBe(defaultValue);
    });

    it('should handle null/undefined input', () => {
      const defaultValue = { error: true };
      expect(safeJsonParse(null as any, defaultValue)).toBe(defaultValue);
      expect(safeJsonParse(undefined as any, defaultValue)).toBe(defaultValue);
    });

    it('should handle non-string input', () => {
      const defaultValue = { error: true };
      expect(safeJsonParse(123 as any, defaultValue)).toBe(defaultValue);
      expect(safeJsonParse({} as any, defaultValue)).toBe(defaultValue);
    });

    it('should provide default value on parse failure', () => {
      const invalidJson = 'invalid json';
      const defaultValue = { default: true };
      const result = safeJsonParse(invalidJson, defaultValue);
      
      expect(result).toBe(defaultValue);
    });

    it('should work with different types', () => {
      const jsonString = '["item1", "item2"]';
      const defaultValue: string[] = [];
      const result = safeJsonParse(jsonString, defaultValue);
      
      expect(result).toEqual(['item1', 'item2']);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateAge,
  filterMembers,
  sortMembers,
  validateMember,
  getMemberStats,
  getMemberCategory,
  getMemberCategoryLabel,
  getMemberCategoryColor,
  getMemberStatusLabel,
  getMemberStatusColor,
  calculateMemberStats,
  formatMemberName,
  isValidEmail,
  isValidPhoneNumber,
} from '../index';
import { Member } from '@/types/member';

const createMockMember = (overrides?: Partial<Member>): Member => ({
  id: 'mem1',
  name: 'John Doe',
  email: 'john@example.com',
  phoneNumber: '010-1234-5678',
  dateOfBirth: '1990-01-01',
  gender: 'male',
  status: 'active',
  memberCategory: 'adult',
  clubId: 'club1',
  clubName: 'Club A',
  createdAt: '2024-01-01',
  ...overrides,
});

describe('Member Domain Utils', () => {
  describe('calculateAge', () => {
    it('should calculate age correctly', () => {
      const today = new Date();
      const tenYearsAgo = `${today.getFullYear() - 10}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(calculateAge(tenYearsAgo)).toBe(10);
    });

    it('should handle birthday not yet occurred this year', () => {
      const today = new Date();
      const tenYearsAgo = new Date(today);
      tenYearsAgo.setFullYear(today.getFullYear() - 10);
      // Set to next month to ensure birthday hasn't occurred yet this year
      tenYearsAgo.setMonth((today.getMonth() + 1) % 12);
      const dateOfBirth = `${tenYearsAgo.getFullYear()}-${String(tenYearsAgo.getMonth() + 1).padStart(2, '0')}-15`;
      expect(calculateAge(dateOfBirth)).toBe(9); // Should be 9 since birthday hasn't occurred
    });
  });

  describe('filterMembers', () => {
    const members: Member[] = [
      createMockMember({ id: 'm1', name: 'Alice', gender: 'female', status: 'active' }),
      createMockMember({ id: 'm2', name: 'Bob', gender: 'male', status: 'pending' }),
      createMockMember({ id: 'm3', name: 'Charlie', gender: 'male', status: 'active', memberCategory: 'child' }),
    ];

    it('should filter by text search', () => {
      const filtered = filterMembers(members, 'alice');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Alice');
    });

    it('should filter by status', () => {
      const filtered = filterMembers(members, { status: 'active' });
      expect(filtered).toHaveLength(2);
      expect(filtered.every(m => m.status === 'active')).toBe(true);
    });

    it('should filter by gender', () => {
      const filtered = filterMembers(members, { gender: 'male' });
      expect(filtered).toHaveLength(2);
      expect(filtered.every(m => m.gender === 'male')).toBe(true);
    });

    it('should filter by category', () => {
      const filtered = filterMembers(members, { memberCategory: 'child' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].memberCategory).toBe('child');
    });

    it('should return all members when empty search', () => {
      const filtered = filterMembers(members, '');
      expect(filtered).toHaveLength(3);
    });
  });

  describe('sortMembers', () => {
    const members: Member[] = [
      createMockMember({ name: 'Charlie', createdAt: '2024-01-03', dateOfBirth: '2000-01-01' }),
      createMockMember({ name: 'Alice', createdAt: '2024-01-01', dateOfBirth: '1990-01-01' }),
      createMockMember({ name: 'Bob', createdAt: '2024-01-02', dateOfBirth: '1995-01-01' }),
    ];

    it('should sort by name ascending', () => {
      const sorted = sortMembers(members, 'name', 'asc');
      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBe('Charlie');
    });

    it('should sort by name descending', () => {
      const sorted = sortMembers(members, 'name', 'desc');
      expect(sorted[0].name).toBe('Charlie');
      expect(sorted[2].name).toBe('Alice');
    });

    it('should sort by createdAt', () => {
      const sorted = sortMembers(members, 'createdAt', 'asc');
      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
    });

    it('should sort by age', () => {
      const sorted = sortMembers(members, 'age', 'desc');
      expect(sorted[0].name).toBe('Alice'); // Oldest
      expect(sorted[2].name).toBe('Charlie'); // Youngest
    });
  });

  describe('validateMember', () => {
    it('should validate valid member', () => {
      const member = createMockMember();
      const result = validateMember(member);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should detect missing name', () => {
      const result = validateMember({ email: 'test@example.com', phoneNumber: '010-1234-5678' });
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeDefined();
    });

    it('should detect invalid email', () => {
      const result = validateMember({ name: 'Test', email: 'invalid', phoneNumber: '010-1234-5678' });
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeDefined();
    });

    it('should detect invalid phone', () => {
      const result = validateMember({ name: 'Test', email: 'test@test.com', phoneNumber: '123' });
      expect(result.isValid).toBe(false);
      expect(result.errors.phoneNumber).toBeDefined();
    });
  });

  describe('getMemberStats', () => {
    it('should calculate member statistics', () => {
      const members: Member[] = [
        createMockMember({ status: 'active', gender: 'male', memberCategory: 'adult' }),
        createMockMember({ status: 'active', gender: 'female', memberCategory: 'child' }),
        createMockMember({ status: 'inactive', gender: 'male', memberCategory: 'adult' }),
      ];

      const stats = getMemberStats(members);
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.inactive).toBe(1);
      expect(stats.byGender.male).toBe(2);
      expect(stats.byGender.female).toBe(1);
      expect(stats.byCategory.adult).toBe(2);
      expect(stats.byCategory.child).toBe(1);
    });
  });

  describe('getMemberCategory', () => {
    it('should return existing category', () => {
      expect(getMemberCategory(createMockMember({ memberCategory: 'child' }))).toBe('child');
    });

    it('should determine adult from age', () => {
      const member = createMockMember({ memberCategory: undefined, dateOfBirth: '1990-01-01' });
      expect(getMemberCategory(member)).toBe('adult');
    });

    it('should determine child from age', () => {
      const today = new Date();
      const childBirth = `${today.getFullYear() - 10}-01-01`;
      const member = createMockMember({ memberCategory: undefined, dateOfBirth: childBirth });
      expect(getMemberCategory(member)).toBe('child');
    });

    it('should default to adult when no data', () => {
      const member = createMockMember({ memberCategory: undefined, dateOfBirth: undefined });
      expect(getMemberCategory(member)).toBe('adult');
    });
  });

  describe('Label and Color utils', () => {
    it('should get category labels', () => {
      expect(getMemberCategoryLabel('adult')).toBe('성인');
      expect(getMemberCategoryLabel('child')).toBe('아동');
    });

    it('should get category colors', () => {
      const adultColors = getMemberCategoryColor('adult');
      expect(adultColors.badge).toContain('blue');
      
      const childColors = getMemberCategoryColor('child');
      expect(childColors.badge).toContain('purple');
    });

    it('should get status labels', () => {
      expect(getMemberStatusLabel('active')).toBe('활동중');
      expect(getMemberStatusLabel('pending')).toBe('승인대기');
      expect(getMemberStatusLabel('inactive')).toBe('비활동');
    });

    it('should get status colors', () => {
      const activeColors = getMemberStatusColor('active');
      expect(activeColors.badge).toContain('green');
      
      const pendingColors = getMemberStatusColor('pending');
      expect(pendingColors.badge).toContain('yellow');
    });
  });

  describe('calculateMemberStats', () => {
    it('should calculate comprehensive statistics', () => {
      const members: Member[] = [
        createMockMember({ status: 'active', dateOfBirth: '2010-01-01' }), // 14-15 years
        createMockMember({ status: 'pending', dateOfBirth: '1990-01-01' }), // 34-35 years
        createMockMember({ status: 'inactive', dateOfBirth: '1975-01-01' }), // 49-50 years
      ];

      const stats = calculateMemberStats(members);
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.inactive).toBe(1);
      expect(stats.activeRate).toBe(33);
      
      // Age distribution
      const dist = stats.ageDistribution;
      expect(dist).toHaveLength(6);
      expect(dist.find(d => d.group === '10-19')?.count).toBe(1);
      expect(dist.find(d => d.group === '30-39')?.count).toBe(1);
    });

    it('should handle empty members', () => {
      const stats = calculateMemberStats([]);
      expect(stats.total).toBe(0);
      expect(stats.activeRate).toBe(0);
      expect(stats.ageDistribution.every(d => d.count === 0)).toBe(true);
    });
  });

  describe('formatMemberName', () => {
    it('should format member name with details', () => {
      const member = createMockMember({ name: 'John', gender: 'male', memberCategory: 'adult' });
      expect(formatMemberName(member)).toBe('John (남성, 성인)');
    });

    it('should format female child member', () => {
      const member = createMockMember({ name: 'Jane', gender: 'female', memberCategory: 'child' });
      expect(formatMemberName(member)).toBe('Jane (여성, 아동)');
    });
  });

  describe('Validation helpers', () => {
    describe('isValidEmail', () => {
      it('should validate correct emails', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name@domain.co.kr')).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(isValidEmail('invalid')).toBe(false);
        expect(isValidEmail('@example.com')).toBe(false);
        expect(isValidEmail('test@')).toBe(false);
        expect(isValidEmail('test@.com')).toBe(false);
      });
    });

    describe('isValidPhoneNumber', () => {
      it('should validate Korean phone numbers', () => {
        expect(isValidPhoneNumber('010-1234-5678')).toBe(true);
        expect(isValidPhoneNumber('01012345678')).toBe(true);
        expect(isValidPhoneNumber('010 1234 5678')).toBe(true);
        expect(isValidPhoneNumber('02-123-4567')).toBe(true);
        expect(isValidPhoneNumber('031-123-4567')).toBe(true);
      });

      it('should reject invalid phone numbers', () => {
        expect(isValidPhoneNumber('123-456-7890')).toBe(false);
        expect(isValidPhoneNumber('010-12-5678')).toBe(false);
        expect(isValidPhoneNumber('1234567890')).toBe(false);
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateAge,
  canUsePassTemplate,
  canJoinClass,
  getMemberCategoryLabel,
  getMemberCategoryColor,
  getTargetCategoryLabel
} from '../member-utils';
import type { Member, PassTemplate, GymClass } from '@/types';

describe('member-utils', () => {
  // Mock date for consistent testing
  const mockDate = new Date('2024-01-15');
  
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateAge', () => {
    it('should calculate age correctly for adult', () => {
      const dateOfBirth = '1990-05-20';
      expect(calculateAge(dateOfBirth)).toBe(33);
    });

    it('should calculate age correctly for child', () => {
      const dateOfBirth = '2010-01-20';
      expect(calculateAge(dateOfBirth)).toBe(13);
    });

    it('should handle birthday that has not occurred this year', () => {
      const dateOfBirth = '1990-12-25'; // Birthday is later in the year
      expect(calculateAge(dateOfBirth)).toBe(33);
    });

    it('should handle birthday that has occurred this year', () => {
      const dateOfBirth = '1990-01-10'; // Birthday already passed
      expect(calculateAge(dateOfBirth)).toBe(34);
    });

    it('should handle exact birthday', () => {
      const dateOfBirth = '1990-01-15'; // Same as mock date
      expect(calculateAge(dateOfBirth)).toBe(34);
    });

    it('should return 0 for undefined dateOfBirth', () => {
      expect(calculateAge(undefined)).toBe(0);
    });

    it('should return 0 for empty string', () => {
      expect(calculateAge('')).toBe(0);
    });
  });

  describe('canUsePassTemplate', () => {
    const adultMember: Member = {
      id: '1',
      name: '홍길동',
      dateOfBirth: '1990-01-01',
      memberCategory: 'adult',
      status: 'active',
      clubId: 'club1',
      email: 'test@example.com',
      phoneNumber: '010-1234-5678',
      createdAt: '2024-01-01'
    };

    const childMember: Member = {
      id: '2',
      name: '김철수',
      dateOfBirth: '2010-01-01',
      memberCategory: 'child',
      status: 'active',
      clubId: 'club1',
      email: 'child@example.com',
      phoneNumber: '010-5678-1234',
      createdAt: '2024-01-01'
    };

    const memberWithoutCategory: Member = {
      ...adultMember,
      memberCategory: undefined
    };

    it('should allow all members for template without targetCategory', () => {
      const template: PassTemplate = {
        id: '1',
        name: '기본 이용권',
        clubId: 'club1',
        clubName: 'Test Club',
        price: 50000,
        duration: 30,
        sessionCount: 30,
        type: 'monthly',
        currency: 'KRW',
        validDays: [1, 2, 3, 4, 5],
        targetCategory: undefined as any,
        benefits: [],
        status: 'active',
        createdAt: '2024-01-01',
        createdBy: 'admin'
      };

      expect(canUsePassTemplate(adultMember, template)).toBe(true);
      expect(canUsePassTemplate(childMember, template)).toBe(true);
    });

    it('should allow all members for template with targetCategory "all"', () => {
      const template: PassTemplate = {
        id: '1',
        name: '전체 이용권',
        clubId: 'club1',
        clubName: 'Test Club',
        price: 50000,
        duration: 30,
        sessionCount: 30,
        type: 'monthly',
        currency: 'KRW',
        validDays: [1, 2, 3, 4, 5],
        targetCategory: 'all',
        benefits: [],
        status: 'active',
        createdAt: '2024-01-01',
        createdBy: 'admin'
      };

      expect(canUsePassTemplate(adultMember, template)).toBe(true);
      expect(canUsePassTemplate(childMember, template)).toBe(true);
    });

    it('should check memberCategory for specific targetCategory', () => {
      const adultTemplate: PassTemplate = {
        id: '1',
        name: '성인 이용권',
        clubId: 'club1',
        clubName: 'Test Club',
        price: 70000,
        duration: 30,
        sessionCount: 30,
        type: 'monthly',
        currency: 'KRW',
        validDays: [1, 2, 3, 4, 5],
        targetCategory: 'adult',
        benefits: [],
        status: 'active',
        createdAt: '2024-01-01',
        createdBy: 'admin'
      };

      expect(canUsePassTemplate(adultMember, adultTemplate)).toBe(true);
      expect(canUsePassTemplate(childMember, adultTemplate)).toBe(false);
    });

    it('should infer category from age when memberCategory is missing', () => {
      const childTemplate: PassTemplate = {
        id: '1',
        name: '주니어 이용권',
        clubId: 'club1',
        clubName: 'Test Club',
        price: 40000,
        duration: 30,
        sessionCount: 30,
        type: 'monthly',
        currency: 'KRW',
        validDays: [1, 2, 3, 4, 5],
        targetCategory: 'child',
        benefits: [],
        status: 'active',
        createdAt: '2024-01-01',
        createdBy: 'admin'
      };

      const youngMember: Member = {
        ...memberWithoutCategory,
        dateOfBirth: '2010-01-01' // 14 years old
      };

      expect(canUsePassTemplate(memberWithoutCategory, childTemplate)).toBe(false); // Adult age
      expect(canUsePassTemplate(youngMember, childTemplate)).toBe(true); // Child age
    });
  });

  describe('canJoinClass', () => {
    const adultMember: Member = {
      id: '1',
      name: '성인회원',
      dateOfBirth: '1990-01-01',
      memberCategory: 'adult',
      status: 'active',
      clubId: 'club1',
      email: 'adult@example.com',
      phoneNumber: '010-1111-2222',
      createdAt: '2024-01-01'
    };

    const childMember: Member = {
      id: '2',
      name: '주니어회원',
      dateOfBirth: '2010-01-01',
      memberCategory: 'child',
      status: 'active',
      clubId: 'club1',
      email: 'child@example.com',
      phoneNumber: '010-3333-4444',
      createdAt: '2024-01-01'
    };

    it('should allow all members for class without restrictions', () => {
      const openClass: GymClass = {
        id: '1',
        name: '오픈 클래스',
        clubId: 'club1',
        clubName: 'Test Club',
        level: 'intermediate',
        ageGroup: '전체',
        maxCapacity: 20,
        currentEnrollment: 10,
        schedule: [
          { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }
        ],
        coachId: 'coach1',
        coachName: '코치',
        monthlyFee: 100000,
        status: 'active',
        createdAt: '2024-01-01',
        startDate: '2024-01-01'
      };

      expect(canJoinClass(adultMember, openClass)).toBe(true);
      expect(canJoinClass(childMember, openClass)).toBe(true);
    });

    it('should check targetCategory', () => {
      const adultOnlyClass: GymClass = {
        id: '1',
        name: '성인 전용 클래스',
        clubId: 'club1',
        clubName: 'Test Club',
        level: 'intermediate',
        ageGroup: '성인',
        maxCapacity: 20,
        currentEnrollment: 10,
        schedule: [
          { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }
        ],
        coachId: 'coach1',
        coachName: '코치',
        monthlyFee: 100000,
        status: 'active',
        createdAt: '2024-01-01',
        startDate: '2024-01-01',
        targetCategory: 'adult'
      };

      expect(canJoinClass(adultMember, adultOnlyClass)).toBe(true);
      expect(canJoinClass(childMember, adultOnlyClass)).toBe(false);
    });

    it('should check age range minimum', () => {
      const teenClass: GymClass = {
        id: '1',
        name: '청소년 클래스',
        clubId: 'club1',
        clubName: 'Test Club',
        level: 'intermediate',
        ageGroup: '청소년',
        maxCapacity: 20,
        currentEnrollment: 10,
        schedule: [
          { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }
        ],
        coachId: 'coach1',
        coachName: '코치',
        monthlyFee: 100000,
        status: 'active',
        createdAt: '2024-01-01',
        startDate: '2024-01-01',
        ageRange: { min: 13, max: 18 }
      };

      const youngChild: Member = {
        ...childMember,
        dateOfBirth: '2015-01-01' // 9 years old
      };

      expect(canJoinClass(youngChild, teenClass)).toBe(false);
      expect(canJoinClass(childMember, teenClass)).toBe(true); // 14 years old
    });

    it('should check age range maximum', () => {
      const kidsClass: GymClass = {
        id: '1',
        name: '어린이 클래스',
        clubId: 'club1',
        clubName: 'Test Club',
        level: 'beginner',
        ageGroup: '유아',
        maxCapacity: 20,
        currentEnrollment: 10,
        schedule: [
          { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }
        ],
        coachId: 'coach1',
        coachName: '코치',
        monthlyFee: 80000,
        status: 'active',
        createdAt: '2024-01-01',
        startDate: '2024-01-01',
        ageRange: { min: 5, max: 12 }
      };

      expect(canJoinClass(childMember, kidsClass)).toBe(false); // 14 years old
      expect(canJoinClass(adultMember, kidsClass)).toBe(false);
    });

    it('should infer memberCategory from age when missing', () => {
      const memberWithoutCategory: Member = {
        ...adultMember,
        memberCategory: undefined
      };

      const adultOnlyClass: GymClass = {
        id: '1',
        name: '성인 클래스',
        clubId: 'club1',
        clubName: 'Test Club',
        level: 'intermediate',
        ageGroup: '성인',
        maxCapacity: 20,
        currentEnrollment: 10,
        schedule: [
          { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }
        ],
        coachId: 'coach1',
        coachName: '코치',
        monthlyFee: 100000,
        status: 'active',
        createdAt: '2024-01-01',
        startDate: '2024-01-01',
        targetCategory: 'adult'
      };

      expect(canJoinClass(memberWithoutCategory, adultOnlyClass)).toBe(true);
    });
  });

  describe('getMemberCategoryLabel', () => {
    it('should return correct label for adult', () => {
      expect(getMemberCategoryLabel('adult')).toBe('성인');
    });

    it('should return correct label for child', () => {
      expect(getMemberCategoryLabel('child')).toBe('주니어');
    });

    it('should return default label for undefined', () => {
      expect(getMemberCategoryLabel(undefined)).toBe('미분류');
    });
  });

  describe('getMemberCategoryColor', () => {
    it('should return blue colors for adult', () => {
      const colors = getMemberCategoryColor('adult');
      expect(colors.badge).toBe('bg-blue-100 text-blue-800');
      expect(colors.border).toBe('border-blue-200');
      expect(colors.text).toBe('text-blue-600');
    });

    it('should return green colors for child', () => {
      const colors = getMemberCategoryColor('child');
      expect(colors.badge).toBe('bg-green-100 text-green-800');
      expect(colors.border).toBe('border-green-200');
      expect(colors.text).toBe('text-green-600');
    });

    it('should return gray colors for undefined', () => {
      const colors = getMemberCategoryColor(undefined);
      expect(colors.badge).toBe('bg-gray-100 text-gray-800');
      expect(colors.border).toBe('border-gray-200');
      expect(colors.text).toBe('text-gray-600');
    });
  });

  describe('getTargetCategoryLabel', () => {
    it('should return correct label for adult', () => {
      expect(getTargetCategoryLabel('adult')).toBe('성인 전용');
    });

    it('should return correct label for child', () => {
      expect(getTargetCategoryLabel('child')).toBe('주니어 전용');
    });

    it('should return correct label for all', () => {
      expect(getTargetCategoryLabel('all')).toBe('전체');
    });

    it('should return default label for undefined', () => {
      expect(getTargetCategoryLabel(undefined)).toBe('전체');
    });
  });
});

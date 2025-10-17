'use client';

// ============================================
// 👤 회원 도메인 유틸리티
// ============================================

import { Member, MemberCategory } from '@/types/member';

/**
 * 나이 계산
 */
export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * 회원 필터링
 */
export function filterMembers(
  members: Member[], 
  filters: {
    status?: string;
    gender?: string;
    clubId?: string;
    memberCategory?: string;
  }
): Member[] {
  return members.filter(member => {
    if (filters.status && member.status !== filters.status) return false;
    if (filters.gender && member.gender !== filters.gender) return false;
    if (filters.clubId && member.clubId !== filters.clubId) return false;
    if (filters.memberCategory && member.memberCategory !== filters.memberCategory) return false;
    return true;
  });
}

/**
 * 회원 정렬
 */
export function sortMembers(
  members: Member[], 
  sortBy: 'name' | 'createdAt' | 'status' | 'age',
  direction: 'asc' | 'desc' = 'asc'
): Member[] {
  return [...members].sort((a, b) => {
    let aValue: string | number | Date;
    let bValue: string | number | Date;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'age':
        aValue = a.dateOfBirth ? calculateAge(a.dateOfBirth) : 0;
        bValue = b.dateOfBirth ? calculateAge(b.dateOfBirth) : 0;
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * 회원 검증
 */
export function validateMember(member: Partial<Member>): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  if (!member.name || member.name.trim() === '') {
    errors.name = '이름은 필수입니다.';
  }
  
  if (!member.email || !isValidEmail(member.email)) {
    errors.email = '올바른 이메일 형식이 아닙니다.';
  }
  
  if (!member.phoneNumber || !isValidPhoneNumber(member.phoneNumber)) {
    errors.phoneNumber = '올바른 전화번호 형식이 아닙니다.';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * 회원 통계
 */
export function getMemberStats(members: Member[]) {
  const stats = {
    total: members.length,
    active: 0,
    inactive: 0,
    byGender: { male: 0, female: 0 },
    byCategory: { adult: 0, child: 0 }
  };
  
  members.forEach(member => {
    if (member.status === 'active') stats.active++;
    else stats.inactive++;
    
    if (member.gender === 'male') stats.byGender.male++;
    else if (member.gender === 'female') stats.byGender.female++;
    
    if (member.memberCategory === 'adult') stats.byCategory.adult++;
    else if (member.memberCategory === 'child') stats.byCategory.child++;
  });
  
  return stats;
}

/**
 * 회원 이름 포맷팅
 */
export function formatMemberName(member: Member): string {
  const genderText = member.gender === 'male' ? '남성' : '여성';
  const categoryText = member.memberCategory === 'adult' ? '성인' : '아동';
  return `${member.name} (${genderText}, ${categoryText})`;
}

/**
 * 이메일 유효성 검사
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 전화번호 유효성 검사 (한국 형식)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^(01[016789]|02|0[3-9][0-9])-?[0-9]{3,4}-?[0-9]{4}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

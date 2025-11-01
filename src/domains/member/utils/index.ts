'use client';
// ============================================
// 👤 회원 도메인 유틸리티
// ============================================
import { Member, MemberCategory } from '@/types/member';
/**
 * 나이 계산
 */
export function calculateAge(dateOfBirth: string): number {
  const _today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = _today.getFullYear() - birthDate.getFullYear();
  const monthDiff = _today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && _today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
/**
 * 회원 필터링
 */
export function filterMembers(
  members: Member[],
  filtersOrSearch:
    | {
        status?: string;
        gender?: string;
        clubId?: string;
        memberCategory?: string;
      }
    | string
): Member[] {
  // 문자열이 들어오면 간단한 텍스트 검색 수행
  if (typeof filtersOrSearch === 'string') {
    const term = filtersOrSearch.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) => {
      const haystacks = [
        member.name,
        member.email,
        member.phoneNumber,
        member.clubName,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      return haystacks.some((h) => h.includes(term));
    });
  }
  const filters = filtersOrSearch;
  return members.filter((member) => {
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
// =============================
// 분류/상태 라벨 & 색상 유틸
// =============================
export function getMemberCategory(member: Member): MemberCategory {
  if (member.memberCategory) return member.memberCategory;
  // 생년월일 기반 추정 (만 18세 이상을 성인으로 가정)
  if (member.dateOfBirth) {
    const age = calculateAge(member.dateOfBirth);
    return age >= 18 ? 'adult' : 'child';
  }
  return 'adult';
}
export function getMemberCategoryLabel(category: MemberCategory): string {
  return category === 'adult' ? '성인' : '아동';
}
export function getMemberCategoryColor(category: MemberCategory): {
  badge: string;
  dot: string;
} {
  if (category === 'adult') {
    return { badge: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-600' };
  }
  return { badge: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-600' };
}
export function getMemberStatusLabel(status: Member['status']): string {
  switch (status) {
    case 'active':
      return '활동중';
    case 'pending':
      return '승인대기';
    case 'inactive':
      return '비활동';
    default:
      return String(status);
  }
}
export function getMemberStatusColor(status: Member['status']): {
  badge: string;
  dot: string;
} {
  switch (status) {
    case 'active':
      return { badge: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-600' };
    case 'pending':
      return { badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500' };
    case 'inactive':
      return { badge: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-500' };
    default:
      return { badge: 'bg-secondary text-secondary-foreground', dot: 'bg-secondary' } as any;
  }
}
// =============================
// 통계 계산 유틸 (컴포넌트 기대 형태)
// =============================
export function calculateMemberStats(members: Member[]) {
  const total = members.length;
  const active = members.filter((m) => m.status === 'active').length;
  const pending = members.filter((m) => m.status === 'pending').length;
  const inactive = members.filter((m) => m.status === 'inactive').length;
  const adults = members.filter((m) => getMemberCategory(m) === 'adult').length;
  const children = members.filter((m) => getMemberCategory(m) === 'child').length;
  // 간단한 연령대 분포 (0-9, 10-19, ...)
  const groups = ['0-9', '10-19', '20-29', '30-39', '40-49', '50+'] as const;
  const counts: number[] = new Array(groups.length).fill(0);
  members.forEach((m) => {
    if (!m.dateOfBirth) return;
    const age = calculateAge(m.dateOfBirth);
    let idx = 0;
    if (age < 10) idx = 0;
    else if (age < 20) idx = 1;
    else if (age < 30) idx = 2;
    else if (age < 40) idx = 3;
    else if (age < 50) idx = 4;
    else idx = 5;
    counts[idx]++;
  });
  const ageDistribution = groups.map((group, i) => ({
    group,
    count: counts[i],
    percentage: total > 0 ? Math.round((counts[i] / total) * 100) : 0,
  }));
  return {
    total,
    active,
    pending,
    inactive,
    activeRate: total > 0 ? Math.round((active / total) * 100) : 0,
    adults,
    children,
    ageDistribution,
  };
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

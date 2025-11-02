/**
 * 회원 관리 유틸리티 함수
 */
import { Member, PassTemplate, GymClass } from '@/types';
/**
 * 생년월일로 나이 계산
 */
export function calculateAge(dateOfBirth?: string): number {
  if (!dateOfBirth) return 0;
  const _today = new Date();
  const birth = new Date(dateOfBirth);
  let age = _today.getFullYear() - birth.getFullYear();
  const monthDiff = _today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && _today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
/**
 * 회원이 특정 이용권을 사용할 수 있는지 확인
 */
export function canUsePassTemplate(member: Member, template: PassTemplate): boolean {
  // targetCategory가 없으면 전체 사용 가능 (기존 템플릿 호환)
  if (!template.targetCategory || template.targetCategory === 'all') {
    return true;
  }
  // memberCategory가 없으면 나이로 판단
  if (!member.memberCategory) {
    const age = calculateAge(member.dateOfBirth);
    const inferredCategory = age >= 19 ? 'adult' : 'child';
    return template.targetCategory === inferredCategory;
  }
  return template.targetCategory === member.memberCategory;
}
/**
 * 회원이 특정 수업에 참여할 수 있는지 확인
 */
export function canJoinClass(member: Member, gymClass: GymClass): boolean {
  // 1. 회원 분류 체크
  if (gymClass.targetCategory && gymClass.targetCategory !== 'all') {
    // memberCategory가 없으면 나이로 판단
    const memberCategory = member.memberCategory || 
      (calculateAge(member.dateOfBirth) >= 19 ? 'adult' : 'child');
    if (gymClass.targetCategory !== memberCategory) {
      return false;
    }
  }
  // 2. 연령 범위 체크
  if (gymClass.ageRange) {
    const age = calculateAge(member.dateOfBirth);
    if (gymClass.ageRange.min && age < gymClass.ageRange.min) {
      return false;
    }
    if (gymClass.ageRange.max && age > gymClass.ageRange.max) {
      return false;
    }
  }
  return true;
}
/**
 * 회원 분류 라벨 가져오기
 */
export function getMemberCategoryLabel(category?: 'adult' | 'child'): string {
  if (!category) return '미분류';
  return category === 'adult' ? '성인' : '주니어';
}
/**
 * 회원 분류 색상 가져오기
 */
export function getMemberCategoryColor(category?: 'adult' | 'child') {
  if (!category) return {
    badge: 'bg-gray-100 text-gray-800',
    border: 'border-gray-200',
    text: 'text-gray-600'
  };
  return category === 'adult' ? {
    badge: 'bg-blue-100 text-blue-800',
    border: 'border-blue-200',
    text: 'text-blue-600'
  } : {
    badge: 'bg-green-100 text-green-800',
    border: 'border-green-200',
    text: 'text-green-600'
  };
}
/**
 * 대상 분류 라벨 가져오기
 */
export function getTargetCategoryLabel(category?: 'adult' | 'child' | 'all'): string {
  if (!category || category === 'all') return '전체';
  return category === 'adult' ? '성인 전용' : '주니어 전용';
}

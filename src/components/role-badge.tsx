import { UserRole, roleHierarchy } from '@/types';
import { Badge } from '@/components/ui/badge';

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

// 역할별 한글 이름
const roleNames: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: '최고 관리자',
  [UserRole.FEDERATION_ADMIN]: '연맹 관리자',
  [UserRole.FEDERATION_SECRETARIAT]: '연맹 사무국',
  [UserRole.COMMITTEE_CHAIR]: '위원회 위원장',
  [UserRole.COMMITTEE_MEMBER]: '위원회 위원',
  [UserRole.CLUB_OWNER]: '클럽 소유자',
  [UserRole.CLUB_MANAGER]: '클럽 관리자',
  [UserRole.CLUB_STAFF]: '클럽 직원',
  [UserRole.MEDIA_MANAGER]: '미디어 관리자',
  [UserRole.HEAD_COACH]: '수석 코치',
  [UserRole.ASSISTANT_COACH]: '보조 코치',
  [UserRole.MEMBER]: '회원',
  [UserRole.PARENT]: '학부모',
  [UserRole.VENDOR]: '협력업체',
};

// 역할별 색상 (권한 레벨에 따라)
function getRoleColor(role: UserRole): string {
  const level = roleHierarchy[role];
  
  if (level >= 90) return 'bg-red-500 hover:bg-red-600 text-white'; // 최고 관리자
  if (level >= 70) return 'bg-orange-500 hover:bg-orange-600 text-white'; // 연맹/위원회
  if (level >= 45) return 'bg-blue-500 hover:bg-blue-600 text-white'; // 클럽 관리
  if (level >= 30) return 'bg-green-500 hover:bg-green-600 text-white'; // 코치
  if (level >= 15) return 'bg-gray-500 hover:bg-gray-600 text-white'; // 회원/학부모
  return 'bg-slate-500 hover:bg-slate-600 text-white'; // 기타
}

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const colorClass = getRoleColor(role);
  const roleName = roleNames[role] || role;

  return (
    <Badge className={`${colorClass} ${className}`}>
      {roleName}
    </Badge>
  );
}

// 권한 레벨 표시 배지 (선택적)
export function RoleBadgeWithLevel({ role, className = '' }: RoleBadgeProps) {
  const colorClass = getRoleColor(role);
  const roleName = roleNames[role] || role;
  const level = roleHierarchy[role];

  return (
    <Badge className={`${colorClass} ${className}`}>
      {roleName} <span className="ml-1 text-xs opacity-75">(Lv.{level})</span>
    </Badge>
  );
}

'use client';

import { UserRole, roleHierarchy } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RoleSelectorProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
  maxRole?: UserRole; // 선택 가능한 최대 역할 (관리자가 자기보다 높은 역할 못 주게)
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

// 역할 그룹화
const roleGroups = [
  {
    label: '시스템 관리자',
    roles: [UserRole.SUPER_ADMIN],
  },
  {
    label: '연맹',
    roles: [UserRole.FEDERATION_ADMIN, UserRole.FEDERATION_SECRETARIAT],
  },
  {
    label: '위원회',
    roles: [UserRole.COMMITTEE_CHAIR, UserRole.COMMITTEE_MEMBER],
  },
  {
    label: '클럽 관리',
    roles: [
      UserRole.CLUB_OWNER,
      UserRole.CLUB_MANAGER,
      UserRole.CLUB_STAFF,
      UserRole.MEDIA_MANAGER,
    ],
  },
  {
    label: '코치',
    roles: [UserRole.HEAD_COACH, UserRole.ASSISTANT_COACH],
  },
  {
    label: '회원',
    roles: [UserRole.MEMBER, UserRole.PARENT],
  },
  {
    label: '기타',
    roles: [UserRole.VENDOR],
  },
];

export function RoleSelector({
  value,
  onChange,
  disabled = false,
  maxRole,
  className = '',
}: RoleSelectorProps) {
  const maxLevel = maxRole ? roleHierarchy[maxRole] : 100;

  // 선택 가능한 역할 필터링
  const availableRoles = Object.values(UserRole).filter(role => {
    return roleHierarchy[role] <= maxLevel;
  });

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="역할 선택">
          {roleNames[value] || value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {roleGroups.map(group => {
          const groupRoles = group.roles.filter(role =>
            availableRoles.includes(role)
          );

          if (groupRoles.length === 0) return null;

          return (
            <div key={group.label}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {group.label}
              </div>
              {groupRoles.map(role => (
                <SelectItem key={role} value={role}>
                  <div className="flex items-center justify-between w-full">
                    <span>{roleNames[role]}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      Lv.{roleHierarchy[role]}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </div>
          );
        })}
      </SelectContent>
    </Select>
  );
}

// 간단한 버전 (그룹 없이)
export function SimpleRoleSelector({
  value,
  onChange,
  disabled = false,
  className = '',
}: Omit<RoleSelectorProps, 'maxRole'>) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="역할 선택">
          {roleNames[value] || value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.values(UserRole).map(role => (
          <SelectItem key={role} value={role}>
            {roleNames[role]} (Lv.{roleHierarchy[role]})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

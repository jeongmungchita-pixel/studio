'use client';
import { ReactNode } from 'react';
import { UserRole, hasEqualOrHigherRole } from '@/types';
import { useUser } from '@/hooks/use-user';
interface RequireRoleProps {
  role: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}
/**
 * 특정 역할 이상의 사용자만 children을 볼 수 있게 하는 컴포넌트
 * 
 * @example
 * <RequireRole role={UserRole.CLUB_MANAGER}>
 *   <AdminPanel />
 * </RequireRole>
 */
export function RequireRole({ role, children, fallback = null }: RequireRoleProps) {
  const { _user } = useUser();
  // 사용자가 없거나 로그인하지 않은 경우
  if (!_user) {
    return <>{fallback}</>;
  }
  // 사용자의 역할이 요구되는 역할보다 낮은 경우
  if (!hasEqualOrHigherRole(_user.role as UserRole, role)) {
    return <>{fallback}</>;
  }
  // 권한이 있는 경우 children 표시
  return <>{children}</>;
}
/**
 * 특정 역할들 중 하나라도 있으면 children을 볼 수 있게 하는 컴포넌트
 */
interface RequireAnyRoleProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}
export function RequireAnyRole({ roles, children, fallback = null }: RequireAnyRoleProps) {
  const { _user } = useUser();
  if (!_user) {
    return <>{fallback}</>;
  }
  const hasAnyRole = roles.some(role => 
    hasEqualOrHigherRole(_user.role as UserRole, role)
  );
  if (!hasAnyRole) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
/**
 * 특정 역할만 정확히 일치하는 경우 children을 볼 수 있게 하는 컴포넌트
 */
interface RequireExactRoleProps {
  role: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}
export function RequireExactRole({ role, children, fallback = null }: RequireExactRoleProps) {
  const { _user } = useUser();
  if (!_user || _user.role !== role) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

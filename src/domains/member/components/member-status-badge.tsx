'use client';
import { Badge } from '@/components/ui/badge';
import { Member } from '@/types/member';
import { getMemberStatusLabel, getMemberStatusColor } from '../utils';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
// ============================================
// 🏷️ 회원 상태 배지 컴포넌트
// ============================================
interface MemberStatusBadgeProps {
  status: Member['status'];
  variant?: 'default' | 'dot' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
export function MemberStatusBadge({
  status,
  variant = 'default',
  size = 'md',
  className
}: MemberStatusBadgeProps) {
  const statusColors = getMemberStatusColor(status);
  const statusLabel = getMemberStatusLabel(status);
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };
  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-3 w-3" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'inactive':
        return <XCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };
  if (variant === 'dot') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${statusColors.dot}`} />
        <span className={`${sizeClasses[size]} font-medium`}>
          {statusLabel}
        </span>
      </div>
    );
  }
  if (variant === 'icon') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        <span className={`${sizeClasses[size]} font-medium`}>
          {statusLabel}
        </span>
      </div>
    );
  }
  return (
    <Badge 
      variant="outline" 
      className={`${statusColors.badge} ${sizeClasses[size]} ${className}`}
    >
      {statusLabel}
    </Badge>
  );
}

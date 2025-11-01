import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
interface ApprovalStatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected';
  className?: string;
}
const statusConfig = {
  pending: {
    label: '승인 대기',
    color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
    icon: Clock,
  },
  approved: {
    label: '승인 완료',
    color: 'bg-green-500/10 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  rejected: {
    label: '거부됨',
    color: 'bg-red-500/10 text-red-700 border-red-200',
    icon: XCircle,
  },
};
export function ApprovalStatusBadge({ status, className = '' }: ApprovalStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <Badge className={`${config.color} border ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

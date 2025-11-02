'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleBadge } from '@/components/role-badge';
import { ApprovalStatusBadge } from '@/components/approval-status-badge';
import { ApprovalActions } from '@/components/approval-actions';
import { UserRole } from '@/types';
import { User, Mail, Calendar, Building2, Phone, MapPin } from 'lucide-react';
interface PendingApprovalCardProps {
  userId: string;
  userName: string;
  userEmail: string;
  requestedRole: UserRole;
  clubName?: string;
  phoneNumber?: string;
  clubAddress?: string | { latitude: number; longitude: number; };
  familyType?: 'individual' | 'parent' | 'child';
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}
const familyTypeNames = {
  individual: '개인 회원',
  parent: '부모 회원',
  child: '자녀 회원',
};
export function PendingApprovalCard({
  userName,
  userEmail,
  requestedRole,
  clubName,
  phoneNumber,
  clubAddress,
  familyType,
  requestedAt,
  status,
  onApprove,
  onReject,
}: PendingApprovalCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{userName}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <RoleBadge role={requestedRole} />
                {familyType && (
                  <span className="text-xs text-muted-foreground">
                    ({familyTypeNames[familyType]})
                  </span>
                )}
              </div>
            </div>
          </div>
          <ApprovalStatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{userEmail}</span>
          </div>
          {clubName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{clubName}</span>
            </div>
          )}
          {phoneNumber && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{phoneNumber}</span>
            </div>
          )}
          {clubAddress && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {typeof clubAddress === 'string' 
                  ? clubAddress 
                  : `${clubAddress.latitude}, ${clubAddress.longitude}`
                }
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>신청일: {new Date(requestedAt).toLocaleDateString()}</span>
          </div>
          {status === 'pending' && (
            <div className="pt-3 border-t">
              <ApprovalActions onApprove={onApprove} onReject={onReject} />
            </div>
          )}
          {status === 'approved' && (
            <div className="pt-3 border-t">
              <p className="text-sm text-green-600">
                ✓ 승인 완료되었습니다
              </p>
            </div>
          )}
          {status === 'rejected' && (
            <div className="pt-3 border-t">
              <p className="text-sm text-red-600">
                ✗ 거부되었습니다
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

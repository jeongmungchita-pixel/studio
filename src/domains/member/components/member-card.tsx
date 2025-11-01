'use client';
import { Member } from '@/types/member';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AvatarImage } from '@/components/optimized-image';
import { getMemberCategory, getMemberCategoryLabel, getMemberCategoryColor, getMemberStatusLabel, getMemberStatusColor, calculateAge } from '../utils';
import { Mail, Phone, Calendar, MapPin } from 'lucide-react';
// ============================================
// 👤 회원 카드 컴포넌트
// ============================================
interface MemberCardProps {
  member: Member;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  onViewDetails?: (member: Member) => void;
  onEdit?: (member: Member) => void;
  onStatusChange?: (member: Member, status: Member['status']) => void;
  className?: string;
}
export function MemberCard({
  member,
  variant = 'default',
  showActions = true,
  onViewDetails,
  onEdit,
  onStatusChange,
  className
}: MemberCardProps) {
  const category = getMemberCategory(member);
  const categoryColors = getMemberCategoryColor(category);
  const statusColors = getMemberStatusColor(member.status);
  const age = member.dateOfBirth ? calculateAge(member.dateOfBirth) : null;
  if (variant === 'compact') {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AvatarImage
              src={member.photoURL}
              alt={member.name}
              size={40}
              className="flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{member.name}</h3>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${statusColors.badge}`}
                >
                  {getMemberStatusLabel(member.status)}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {age && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {age}세
                  </span>
                )}
                <Badge className={`text-xs ${categoryColors.badge}`}>
                  {getMemberCategoryLabel(category)}
                </Badge>
              </div>
            </div>
            {showActions && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails?.(member)}
              >
                상세보기
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  if (variant === 'detailed') {
    return (
      <Card className={`hover:shadow-lg transition-shadow ${className}`}>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <AvatarImage
              src={member.photoURL}
              alt={member.name}
              size={80}
              className="flex-shrink-0"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold">{member.name}</h2>
                <Badge className={statusColors.badge}>
                  {getMemberStatusLabel(member.status)}
                </Badge>
                <Badge className={categoryColors.badge}>
                  {getMemberCategoryLabel(category)}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                {member.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{member.email}</span>
                  </div>
                )}
                {member.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{member.phoneNumber}</span>
                  </div>
                )}
                {age && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{age}세</span>
                  </div>
                )}
                {member.clubName && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{member.clubName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {member.notes && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">메모</h4>
              <p className="text-sm text-muted-foreground">{member.notes}</p>
            </div>
          )}
          {member.medicalConditions && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">건강상 주의사항</h4>
              <p className="text-sm text-muted-foreground">{member.medicalConditions}</p>
            </div>
          )}
          {showActions && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails?.(member)}
              >
                상세보기
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit?.(member)}
              >
                수정
              </Button>
              {member.status === 'pending' && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onStatusChange?.(member, 'active')}
                  >
                    승인
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onStatusChange?.(member, 'inactive')}
                  >
                    거절
                  </Button>
                </>
              )}
              {member.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange?.(member, 'inactive')}
                >
                  비활성화
                </Button>
              )}
              {member.status === 'inactive' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onStatusChange?.(member, 'active')}
                >
                  활성화
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  // Default variant
  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <AvatarImage
            src={member.photoURL}
            alt={member.name}
            size={60}
            className="flex-shrink-0"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{member.name}</h3>
              <Badge className={statusColors.badge}>
                {getMemberStatusLabel(member.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
              <Badge className={categoryColors.badge}>
                {getMemberCategoryLabel(category)}
              </Badge>
              {age && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {age}세
                </span>
              )}
              {member.clubName && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {member.clubName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {member.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {member.email}
                </span>
              )}
              {member.phoneNumber && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {member.phoneNumber}
                </span>
              )}
            </div>
          </div>
          {showActions && (
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails?.(member)}
              >
                상세보기
              </Button>
              {member.status === 'pending' && (
                <div className="flex gap-1">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onStatusChange?.(member, 'active')}
                  >
                    승인
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onStatusChange?.(member, 'inactive')}
                  >
                    거절
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

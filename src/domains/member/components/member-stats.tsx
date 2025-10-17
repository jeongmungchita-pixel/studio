'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Member } from '@/types/member';
import { calculateMemberStats } from '../utils';
import { Users, UserCheck, Clock, UserX, TrendingUp, PieChart } from 'lucide-react';

// ============================================
// 📊 회원 통계 컴포넌트
// ============================================

interface MemberStatsProps {
  members: Member[];
  variant?: 'cards' | 'compact' | 'detailed';
  showAgeDistribution?: boolean;
  className?: string;
}

export function MemberStats({
  members,
  variant = 'cards',
  showAgeDistribution = true,
  className
}: MemberStatsProps) {
  const stats = calculateMemberStats(members);

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-4 p-4 bg-muted/50 rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">총 {stats.total}명</span>
        </div>
        
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-green-600" />
          <span className="text-sm">활동 {stats.active}명</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-600" />
          <span className="text-sm">대기 {stats.pending}명</span>
        </div>
        
        <div className="flex items-center gap-2">
          <UserX className="h-4 w-4 text-gray-600" />
          <span className="text-sm">비활동 {stats.inactive}명</span>
        </div>
        
        <Badge variant="outline" className="ml-auto">
          활성률 {stats.activeRate}%
        </Badge>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* 기본 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">총 회원</p>
                  <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">활동 회원</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">활성률 {stats.activeRate}%</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">승인 대기</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending.toLocaleString()}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">비활동</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.inactive.toLocaleString()}</p>
                </div>
                <UserX className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 카테고리별 분포 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                카테고리별 분포
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">성인</span>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={stats.total > 0 ? (stats.adults / stats.total) * 100 : 0} 
                      className="w-20" 
                    />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {stats.adults}명
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">아동</span>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={stats.total > 0 ? (stats.children / stats.total) * 100 : 0} 
                      className="w-20" 
                    />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {stats.children}명
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 연령대별 분포 */}
          {showAgeDistribution && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  연령대별 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.ageDistribution.map((age, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{age.group}</span>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={age.percentage} 
                          className="w-16" 
                        />
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {age.count}
                        </span>
                        <Badge variant="outline" className="text-xs px-1">
                          {age.percentage}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 상태별 상세 분석 */}
        <Card>
          <CardHeader>
            <CardTitle>상태별 분석</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {stats.activeRate}%
                </div>
                <div className="text-sm text-muted-foreground">활성률</div>
                <Progress value={stats.activeRate} className="mt-2" />
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 mb-2">
                  {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">대기율</div>
                <Progress 
                  value={stats.total > 0 ? (stats.pending / stats.total) * 100 : 0} 
                  className="mt-2" 
                />
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-600 mb-2">
                  {stats.total > 0 ? Math.round((stats.inactive / stats.total) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">비활성률</div>
                <Progress 
                  value={stats.total > 0 ? (stats.inactive / stats.total) * 100 : 0} 
                  className="mt-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default cards variant
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 회원</p>
              <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">활동 회원</p>
              <p className="text-2xl font-bold text-green-600">{stats.active.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">활성률 {stats.activeRate}%</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">승인 대기</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">성인/아동</p>
              <p className="text-2xl font-bold">{stats.adults}/{stats.children}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
              <PieChart className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

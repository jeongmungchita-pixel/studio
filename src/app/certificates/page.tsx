'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { UserRole } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Download, Eye, Settings, Users, FileText, Plus, Search, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ServiceContainer } from '@/services/container';
import type { IFirebaseService } from '@/lib/di/interfaces';

export default function CertificatesPage() {
  const { _user, isUserLoading } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  // 로딩 상태 처리
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 인증서 관리자 UI (연맹 관리자, 슈퍼 관리자)
  if (_user?.role === UserRole.FEDERATION_ADMIN || _user?.role === UserRole.SUPER_ADMIN) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">인증서 관리</h1>
            <p className="text-muted-foreground">모든 회원의 인증서를 발급하고 관리합니다</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            인증서 발급
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="issued">발급된 인증서</TabsTrigger>
            <TabsTrigger value="pending">발급 대기</TabsTrigger>
            <TabsTrigger value="templates">템플릿 관리</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 발급 인증서</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,234</div>
                  <p className="text-xs text-muted-foreground">+12% 지난달 대비</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">이번 달 발급</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">89</div>
                  <p className="text-xs text-muted-foreground">+5% 지난달 대비</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">발급 대기</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">23</div>
                  <p className="text-xs text-muted-foreground">처리 필요</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">템플릿 수</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">5</div>
                  <p className="text-xs text-muted-foreground">활성 템플릿</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="issued" className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="인증서 검색..."
                  className="pl-8 w-full h-10 border rounded-md px-3 py-2"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                필터
              </Button>
            </div>
            
            <div className="border rounded-lg">
              <div className="grid grid-cols-6 gap-4 p-4 border-b bg-muted/50">
                <div className="font-medium">인증서 ID</div>
                <div className="font-medium">수령인</div>
                <div className="font-medium">종류</div>
                <div className="font-medium">발급일</div>
                <div className="font-medium">상태</div>
                <div className="font-medium">작업</div>
              </div>
              {/* 데이터 행 */}
              <div className="grid grid-cols-6 gap-4 p-4 border-b">
                <div>CERT-001</div>
                <div>김철수</div>
                <div>레벨테스트</div>
                <div>2024-11-01</div>
                <div><Badge variant="default">발급됨</Badge></div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>발급 대기 목록</CardTitle>
                <CardDescription>승인을 기다리는 인증서 요청입니다</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  현재 대기 중인 인증서가 없습니다
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>레벨테스트 인증서</CardTitle>
                  <CardDescription>레벨테스트 통과 증명서</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">편집</Button>
                    <Button variant="outline" size="sm">미리보기</Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>대회 참가 인증서</CardTitle>
                  <CardDescription>대회 참가 증명서</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">편집</Button>
                    <Button variant="outline" size="sm">미리보기</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // 일반 회원 UI (조회 전용)
  if (_user?.role === UserRole.MEMBER || _user?.role === UserRole.PARENT) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">내 인증서</h1>
          <p className="text-muted-foreground">받으신 인증서를 조회하고 다운로드할 수 있습니다</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-certificates">내 인증서</TabsTrigger>
            <TabsTrigger value="family">가족 인증서</TabsTrigger>
          </TabsList>

          <TabsContent value="my-certificates" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Award className="h-8 w-8 text-blue-600" />
                    <Badge variant="default">유효</Badge>
                  </div>
                  <CardTitle>레벨 5 통과 인증서</CardTitle>
                  <CardDescription>2024년 10월 15일 발급</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="mr-2 h-4 w-4" />
                      보기
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      다운로드
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Award className="h-8 w-8 text-green-600" />
                    <Badge variant="default">유효</Badge>
                  </div>
                  <CardTitle>대회 참가 인증서</CardTitle>
                  <CardDescription>2024년 9월 20일 발급</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="mr-2 h-4 w-4" />
                      보기
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      다운로드
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="family" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>가족 인증서</CardTitle>
                <CardDescription>자녀의 인증서를 조회할 수 있습니다</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  등록된 자녀가 없습니다
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // 권한 없는 사용자
  return (
    <div className="flex-1 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>접근 권한 없음</CardTitle>
          <CardDescription>이 페이지에 접근할 권한이 없습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            대시보드로 돌아가기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

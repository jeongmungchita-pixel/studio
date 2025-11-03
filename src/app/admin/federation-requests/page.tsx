'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Plus, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock,
  Shield,
  AlertCircle
} from 'lucide-react';
import { ServiceContainer } from '@/services/container';
import type { IFirebaseService } from '@/lib/di/interfaces';

export default function FederationRequestsPage() {
  const { _user } = useUser();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // SUPER_ADMIN 권한 확인
  if (!_user || _user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Shield className="h-5 w-5" />
              접근 권한 없음
            </CardTitle>
            <CardDescription>
              이 페이지는 슈퍼 관리자만 접근할 수 있습니다
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // 요청 목록 조회 (실제로는 API 호출)
  useEffect(() => {
    // TODO: API로 요청 목록 가져오기
    setLoading(false);
  }, []);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />대기중</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />승인됨</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />거부됨</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      // TODO: API 호출로 승인 처리
      console.log('승인 처리:', requestId);
    } catch (error) {
      console.error('승인 오류:', error);
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      // TODO: API 호출로 거부 처리
      console.log('거부 처리:', requestId, reason);
    } catch (error) {
      console.error('거부 오류:', error);
    }
  };

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            연맹 관리자 임명 관리
          </h1>
          <p className="text-muted-foreground">연맹 관리자 임명 요청을 생성하고 관리합니다</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              임명 요청 생성
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>연맹 관리자 임명 요청</DialogTitle>
              <DialogDescription>
                연맹 관리자로 임명할 사용자를 선택하고 사유를 입력하세요
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="user">사용자 선택</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="임명할 사용자를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* TODO: 사용자 목록 동적 로드 */}
                    <SelectItem value="user1">김철수 (kim@example.com)</SelectItem>
                    <SelectItem value="user2">이영희 (lee@example.com)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">임명 사유</Label>
                <Textarea
                  id="reason"
                  placeholder="연맹 관리자로 임명하는 사유를 상세히 입력하세요"
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                취소
              </Button>
              <Button onClick={() => {
                // TODO: 요청 생성 API 호출
                setShowCreateDialog(false);
              }}>
                요청 생성
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>검색 및 필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름 또는 이메일 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="approved">승인됨</SelectItem>
                <SelectItem value="rejected">거부됨</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 요청 목록 */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {requests.length === 0 ? '등록된 요청이 없습니다' : '검색 결과가 없습니다'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(request.status)}
                      <Badge variant="outline">연맹 관리자</Badge>
                    </div>
                    <CardTitle className="text-xl">{request.name}</CardTitle>
                    <CardDescription className="space-y-1">
                      <div>{request.email}</div>
                      {request.phoneNumber && <div>{request.phoneNumber}</div>}
                    </CardDescription>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>요청일: {new Date(request.requestedAt).toLocaleDateString()}</div>
                    <div>제안자: {request.proposedByName}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">임명 사유</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      {request.reason}
                    </p>
                  </div>
                  
                  {request.rejectionReason && (
                    <div>
                      <h4 className="font-medium mb-1 text-red-600">거부 사유</h4>
                      <p className="text-sm text-red-600 bg-red-50 p-3 rounded">
                        {request.rejectionReason}
                      </p>
                    </div>
                  )}
                  
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleApprove(request.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        승인
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => {
                          // TODO: 거부 사유 입력 다이얼로그
                          const reason = prompt('거부 사유를 입력하세요:');
                          if (reason) {
                            handleReject(request.id, reason);
                          }
                        }}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        거부
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}

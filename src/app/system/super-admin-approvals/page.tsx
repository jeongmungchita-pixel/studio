'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApprovalActions } from '@/components/approval-actions';
import { Shield, User, Mail, Phone, Building2, Briefcase, FileText, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

// 임시 데이터
const mockSuperAdminRequests = [
  {
    id: '1',
    name: '김최고',
    email: 'super@example.com',
    phoneNumber: '010-1111-2222',
    organization: '대한체조협회',
    position: '사무총장',
    reason: '전국 체조 클럽 통합 관리 및 연맹 시스템 운영을 위해 최고 관리자 권한이 필요합니다.',
    secretCode: '****',
    requestedAt: new Date().toISOString(),
    status: 'pending' as const,
  },
  {
    id: '2',
    name: '이시스템',
    email: 'system@example.com',
    phoneNumber: '010-3333-4444',
    organization: '체조연맹 본부',
    position: '시스템 관리자',
    reason: '시스템 전반 관리 및 보안 설정을 위한 최고 권한이 필요합니다.',
    secretCode: '****',
    requestedAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'pending' as const,
  },
];

export default function SuperAdminApprovalsPage() {
  const [requests, setRequests] = useState(mockSuperAdminRequests);

  const handleApprove = async (id: string) => {
    console.log('최고관리자 승인:', id);
    // TODO: Firestore 업데이트
    setRequests(prev => prev.map(req =>
      req.id === id ? { ...req, status: 'approved' as const } : req
    ));
    alert('최고 관리자로 승인되었습니다!');
  };

  const handleReject = async (id: string, reason: string) => {
    console.log('최고관리자 거부:', id, reason);
    // TODO: Firestore 업데이트
    setRequests(prev => prev.map(req =>
      req.id === id ? { ...req, status: 'rejected' as const } : req
    ));
    alert('신청이 거부되었습니다.');
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <main className="flex-1 p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-red-600" />
            최고 관리자 승인
          </h1>
          <p className="text-muted-foreground mt-1">
            시스템 최고 권한 신청을 검토하고 승인합니다
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="bg-red-500 text-white px-4 py-2 rounded-full font-bold">
            {pendingCount}건 대기 중
          </div>
        )}
      </div>

      {/* 경고 메시지 */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong>중요:</strong> 최고 관리자는 시스템의 모든 권한을 가집니다. 
              신청자의 신원과 사유를 철저히 검토한 후 승인하세요.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대기 중</CardTitle>
            <Shield className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {requests.filter(r => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">승인됨</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {requests.filter(r => r.status === 'approved').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">거부됨</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {requests.filter(r => r.status === 'rejected').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 신청 목록 */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">신청 목록</h2>
        
        {requests.length > 0 ? (
          <div className="grid gap-4">
            {requests.map((request) => (
              <Card key={request.id} className={
                request.status === 'pending' ? 'border-red-200' :
                request.status === 'approved' ? 'border-green-200' :
                'border-gray-200'
              }>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{request.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {request.organization} • {request.position}
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      request.status === 'pending' ? 'bg-yellow-500' :
                      request.status === 'approved' ? 'bg-green-500' :
                      'bg-red-500'
                    }>
                      {request.status === 'pending' ? '대기 중' :
                       request.status === 'approved' ? '승인됨' : '거부됨'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 연락처 정보 */}
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{request.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{request.phoneNumber}</span>
                      </div>
                    </div>

                    {/* 소속 정보 */}
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{request.organization}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>{request.position}</span>
                      </div>
                    </div>

                    {/* 신청 사유 */}
                    <div className="border-t pt-3">
                      <div className="flex items-start gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-sm font-semibold">신청 사유:</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">
                        {request.reason}
                      </p>
                    </div>

                    {/* 신청 날짜 */}
                    <div className="text-xs text-muted-foreground">
                      신청일: {new Date(request.requestedAt).toLocaleString()}
                    </div>

                    {/* 승인/거부 버튼 */}
                    {request.status === 'pending' && (
                      <div className="pt-3 border-t">
                        <ApprovalActions
                          onApprove={() => handleApprove(request.id)}
                          onReject={(reason) => handleReject(request.id, reason)}
                        />
                      </div>
                    )}

                    {request.status === 'approved' && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-green-600 font-semibold">
                          ✓ 최고 관리자로 승인되었습니다
                        </p>
                      </div>
                    )}

                    {request.status === 'rejected' && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-red-600 font-semibold">
                          ✗ 신청이 거부되었습니다
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">신청 내역이 없습니다</h3>
              <p className="text-muted-foreground text-center">
                최고 관리자 신청이 들어오면 여기에 표시됩니다
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

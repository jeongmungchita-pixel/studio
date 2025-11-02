'use client';
import { useState, useEffect } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Judge, JudgeAssignment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Star,
  Award,
  CheckCircle,
  XCircle,
  Calendar,
  Mail,
  Phone,
  Building,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function JudgeManagementPage() {
  const { _user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 심사위원 목록 조회
  const judgesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'judges'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore]);
  const { data: judges, isLoading: isJudgesLoading } = useCollection<Judge>(judgesQuery);

  // 심사위원 배정 목록 조회
  const assignmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'judge_assignments'),
      orderBy('assignedAt', 'desc')
    );
  }, [firestore]);
  const { data: assignments } = useCollection<JudgeAssignment>(assignmentsQuery);

  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    licenseType: 'national' as 'national' | 'international' | 'regional',
    licenseExpiryDate: '',
    specializations: [] as string[],
    level: 'senior' as 'junior' | 'senior' | 'master',
    organization: '',
    region: '',
    status: 'active' as 'active' | 'inactive' | 'suspended'
  });

  // 심사위원 생성
  const handleCreateJudge = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: 'Firestore가 초기화되지 않았습니다.'
      });
      return;
    }

    setIsLoading(true);
    try {
      const judgeRef = doc(collection(firestore, 'judges'));
      const judge: Judge = {
        id: judgeRef.id,
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: _user?.uid || ''
      };

      await setDoc(judgeRef, judge);
      
      toast({
        title: '심사위원 등록 완료',
        description: `${judge.name}님이 등록되었습니다.`
      });
      
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '등록 실패',
        description: '심사위원 등록 중 오류가 발생했습니다.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 심사위원 수정
  const handleUpdateJudge = async () => {
    if (!selectedJudge) return;
    
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: 'Firestore가 초기화되지 않았습니다.'
      });
      return;
    }

    setIsLoading(true);
    try {
      const judgeRef = doc(firestore, 'judges', selectedJudge.id);
      const updatedJudge: Judge = {
        ...selectedJudge,
        ...formData,
        updatedAt: new Date().toISOString()
      };

      // id 필드를 제외하고 업데이트
      const { id, ...updateData } = updatedJudge;
      await updateDoc(judgeRef, updateData);
      
      toast({
        title: '심사위원 정보 수정 완료',
        description: `${updatedJudge.name}님의 정보가 수정되었습니다.`
      });
      
      setIsEditDialogOpen(false);
      setSelectedJudge(null);
      resetForm();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '수정 실패',
        description: '심사위원 정보 수정 중 오류가 발생했습니다.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 심사위원 삭제
  const handleDeleteJudge = async (judgeId: string) => {
    if (!confirm('정말로 이 심사위원을 삭제하시겠습니까?')) return;

    if (!firestore) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: 'Firestore가 초기화되지 않았습니다.'
      });
      return;
    }

    try {
      await deleteDoc(doc(firestore, 'judges', judgeId));
      
      toast({
        title: '삭제 완료',
        description: '심사위원이 삭제되었습니다.'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: '심사위원 삭제 중 오류가 발생했습니다.'
      });
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      licenseNumber: '',
      licenseType: 'national',
      licenseExpiryDate: '',
      specializations: [],
      level: 'senior',
      organization: '',
      region: '',
      status: 'active'
    });
  };

  // 수정 다이얼로그 열기
  const openEditDialog = (judge: Judge) => {
    setSelectedJudge(judge);
    setFormData({
      name: judge.name,
      email: judge.email,
      phone: judge.phone || '',
      licenseNumber: judge.licenseNumber,
      licenseType: judge.licenseType,
      licenseExpiryDate: judge.licenseExpiryDate,
      specializations: judge.specializations,
      level: judge.level,
      organization: judge.organization,
      region: judge.region,
      status: judge.status
    });
    setIsEditDialogOpen(true);
  };

  // 레벨 배지
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'master': return <Badge className="bg-purple-100 text-purple-800">마스터</Badge>;
      case 'senior': return <Badge className="bg-blue-100 text-blue-800">시니어</Badge>;
      case 'junior': return <Badge className="bg-green-100 text-green-800">주니어</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
  };

  // 상태 배지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800">활동</Badge>;
      case 'inactive': return <Badge className="bg-gray-100 text-gray-800">비활동</Badge>;
      case 'suspended': return <Badge className="bg-red-100 text-red-800">정지</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 라이선스 타입 라벨
  const getLicenseTypeLabel = (type: string) => {
    switch (type) {
      case 'international': return '국제 심판';
      case 'national': return '국가 심판';
      case 'regional': return '지역 심판';
      default: return type;
    }
  };

  if (isJudgesLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">심사위원 관리</h1>
          <p className="text-muted-foreground mt-1">심사위원 정보를 관리하고 배정하세요</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          심사위원 등록
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 심사위원</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{judges?.length || 0}</div>
            <p className="text-xs text-muted-foreground">명 등록됨</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활동 심사위원</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {judges?.filter(j => j.status === 'active').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">명 활동중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">마스터 심판</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {judges?.filter(j => j.level === 'master').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">명 보유</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">배정된 심사위원</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignments?.filter(a => a.status === 'assigned').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">명 배정됨</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="judges" className="w-full">
        <TabsList>
          <TabsTrigger value="judges">심사위원 목록</TabsTrigger>
          <TabsTrigger value="assignments">배정 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="judges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>심사위원 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <div className="grid grid-cols-8 bg-muted p-3 text-sm font-semibold">
                  <div>이름</div>
                  <div>자격</div>
                  <div>레벨</div>
                  <div>소속</div>
                  <div>지역</div>
                  <div>상태</div>
                  <div>연락처</div>
                  <div>관리</div>
                </div>
                {judges?.map((judge) => (
                  <div key={judge.id} className="grid grid-cols-8 p-3 items-center border-t">
                    <div className="font-medium">{judge.name}</div>
                    <div>
                      <Badge variant="outline">
                        {getLicenseTypeLabel(judge.licenseType)}
                      </Badge>
                    </div>
                    <div>{getLevelBadge(judge.level)}</div>
                    <div className="text-sm">{judge.organization}</div>
                    <div className="text-sm">{judge.region}</div>
                    <div>{getStatusBadge(judge.status)}</div>
                    <div className="text-sm">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-20">{judge.email}</span>
                      </div>
                      {judge.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span className="truncate max-w-20">{judge.phone}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(judge)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteJudge(judge.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>배정 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold">심사위원 배정</p>
                <p className="text-muted-foreground">시합별 심사위원을 배정하고 관리합니다</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 생성 다이얼로그 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>심사위원 등록</DialogTitle>
            <DialogDescription>
              새로운 심사위원을 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="심사위원 이름"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="이메일 주소"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">연락처</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="전화번호"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">자격 번호 *</Label>
              <Input
                id="licenseNumber"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                placeholder="심판 자격 번호"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseType">자격 종류 *</Label>
              <Select value={formData.licenseType} onValueChange={(value) => setFormData({ ...formData, licenseType: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="international">국제 심판</SelectItem>
                  <SelectItem value="national">국가 심판</SelectItem>
                  <SelectItem value="regional">지역 심판</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseExpiryDate">자격 만료일 *</Label>
              <Input
                id="licenseExpiryDate"
                type="date"
                value={formData.licenseExpiryDate}
                onChange={(e) => setFormData({ ...formData, licenseExpiryDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">레벨 *</Label>
              <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior">주니어</SelectItem>
                  <SelectItem value="senior">시니어</SelectItem>
                  <SelectItem value="master">마스터</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">상태 *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">활동</SelectItem>
                  <SelectItem value="inactive">비활동</SelectItem>
                  <SelectItem value="suspended">정지</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="organization">소속 기관 *</Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="소속 기관명"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="region">지역 *</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="활동 지역"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreateJudge} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>심사위원 정보 수정</DialogTitle>
            <DialogDescription>
              심사위원 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* 생성 다이얼로그와 동일한 필드들 */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">이름 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="심사위원 이름"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">이메일 *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="이메일 주소"
              />
            </div>
            {/* 나머지 필드들도 동일하게 추가 */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleUpdateJudge} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              수정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

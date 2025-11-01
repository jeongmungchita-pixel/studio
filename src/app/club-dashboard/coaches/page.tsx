'use client';
import { useState } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, where, addDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, UserPlus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/types';
import { UserRole } from '@/types';
export default function CoachesPage() {
  const { _user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    phoneNumber: '',
    role: UserRole.ASSISTANT_COACH,
  });
  const emailRegex = /[^@\s]+@[^@\s]+\.[^@\s]+/;
  const isFormValid =
    formData.displayName.trim().length > 0 &&
    emailRegex.test(formData.email) &&
    !!formData.role;
  // Fetch coaches for this club
  const coachesQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.clubId) return null;
    return query(
      collection(firestore, 'users'),
      where('clubId', '==', _user.clubId),
      where('role', 'in', [UserRole.HEAD_COACH, UserRole.ASSISTANT_COACH])
    );
  }, [firestore, _user?.clubId]);
  const { data: coaches, isLoading: areCoachesLoading } = useCollection<UserProfile>(coachesQuery);
  const sortedCoaches = (coaches || []).slice().sort((a, b) => {
    // HEAD_COACH 먼저, 그 다음 이름순
    const roleRank = (u: UserProfile) => (u.role === UserRole.HEAD_COACH ? 0 : 1);
    const rdiff = roleRank(a) - roleRank(b);
    if (rdiff !== 0) return rdiff;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !_user?.clubId) return;
    if (!isFormValid) {
      toast({ variant: 'destructive', title: '입력 확인', description: '이름과 유효한 이메일을 입력하세요.' });
      return;
    }
    setIsSubmitting(true);
    try {
      // Prevent duplicate pending request
      const pendingQ = query(
        collection(firestore, 'coach_requests'),
        where('clubId', '==', _user.clubId),
        where('email', '==', formData.email),
        where('status', '==', 'pending')
      );
      const pendingSnap = await getDocs(pendingQ);
      if (!pendingSnap.empty) {
        toast({ variant: 'destructive', title: '중복 요청', description: '해당 이메일로 대기 중인 코치 요청이 있습니다.' });
        return;
      }
      // Prevent creating if already a coach exists
      const existingCoachQ = query(
        collection(firestore, 'users'),
        where('clubId', '==', _user.clubId),
        where('email', '==', formData.email),
        where('role', 'in', [UserRole.HEAD_COACH, UserRole.ASSISTANT_COACH])
      );
      const existingCoachSnap = await getDocs(existingCoachQ);
      if (!existingCoachSnap.empty) {
        toast({ variant: 'destructive', title: '이미 등록됨', description: '해당 이메일은 이미 코치로 등록되어 있습니다.' });
        return;
      }
      // Create coach account request
      await addDoc(collection(firestore, 'coach_requests'), {
        ...formData,
        clubId: _user.clubId,
        clubName: _user.clubName || '',
        requestedBy: _user.uid,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      });
      toast({
        title: '코치 계정 요청 완료',
        description: '최고 관리자의 승인 후 계정이 생성됩니다.',
      });
      setIsDialogOpen(false);
      setFormData({
        email: '',
        displayName: '',
        phoneNumber: '',
        role: UserRole.ASSISTANT_COACH,
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '코치 계정 요청 중 오류가 발생했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDelete = async (coachId: string) => {
    if (!firestore || !confirm('정말 이 코치 계정을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(firestore, 'users', coachId));
      toast({
        title: '삭제 완료',
        description: '코치 계정이 삭제되었습니다.',
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '코치 계정 삭제 중 오류가 발생했습니다.',
      });
    }
  };
  if (isUserLoading || areCoachesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  const getRoleName = (role: UserRole) => {
    return role === UserRole.HEAD_COACH ? '수석 코치' : '보조 코치';
  };
  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">코치 계정 관리</h1>
          <p className="text-slate-600 mt-1">클럽의 코치 계정을 관리합니다</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              코치 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>코치 계정 추가</DialogTitle>
              <DialogDescription>
                새로운 코치 계정을 요청합니다. 최고 관리자의 승인이 필요합니다.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">이름</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">전화번호</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">역할</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.HEAD_COACH}>수석 코치</SelectItem>
                      <SelectItem value={UserRole.ASSISTANT_COACH}>보조 코치</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={!isFormValid || isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  요청
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>코치 목록</CardTitle>
          <CardDescription>현재 등록된 코치 계정입니다</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedCoaches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>전화번호</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCoaches.map((coach) => (
                  <TableRow key={coach.uid}>
                    <TableCell className="font-medium">{coach.displayName}</TableCell>
                    <TableCell>{coach.email}</TableCell>
                    <TableCell>{coach.phoneNumber || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getRoleName(coach.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        coach.status === 'active' ? 'default' :
                        coach.status === 'pending' ? 'secondary' : 'outline'
                      }>
                        {coach.status === 'active' ? '활성' : coach.status === 'pending' ? '대기중' : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {(_user?.role === UserRole.SUPER_ADMIN || _user?.role === UserRole.FEDERATION_ADMIN) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(coach.uid)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 space-y-4">
              <p className="text-slate-500">등록된 코치가 없습니다</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> 코치 추가 요청
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

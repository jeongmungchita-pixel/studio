'use client';

import { useState } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, where, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, UserPlus, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types';
import { UserRole } from '@/types';

export default function CoachesPage() {
  const { user, isUserLoading } = useUser();
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

  // Fetch coaches for this club
  const coachesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'users'),
      where('clubId', '==', user.clubId),
      where('role', 'in', [UserRole.HEAD_COACH, UserRole.ASSISTANT_COACH])
    );
  }, [firestore, user?.clubId]);

  const { data: coaches, isLoading: areCoachesLoading } = useCollection<UserProfile>(coachesQuery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user?.clubId) return;

    setIsSubmitting(true);
    try {
      // Create coach account request
      await addDoc(collection(firestore, 'coachRequests'), {
        ...formData,
        clubId: user.clubId,
        clubName: user.clubName || '',
        requestedBy: user.uid,
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
    } catch (error) {
      console.error('Error creating coach request:', error);
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
    } catch (error) {
      console.error('Error deleting coach:', error);
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
                <Button type="submit" disabled={isSubmitting}>
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
          {coaches && coaches.length > 0 ? (
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
                {coaches.map((coach) => (
                  <TableRow key={coach.uid}>
                    <TableCell className="font-medium">{coach.displayName}</TableCell>
                    <TableCell>{coach.email}</TableCell>
                    <TableCell>{coach.phoneNumber || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getRoleName(coach.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={coach.status === 'approved' ? 'default' : 'secondary'}>
                        {coach.status === 'approved' ? '활성' : '대기중'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(coach.uid)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500">등록된 코치가 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

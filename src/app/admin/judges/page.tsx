'use client';

import { useState } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, Edit, Trash2, Gavel } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// 심판 타입 정의
interface Judge {
  id: string;
  name: string;
  email: string;
  phone: string;
  level: 'D' | 'E' | 'both'; // D심판, E심판, 둘 다
  certification: string; // 자격증 번호
  experience: string; // 경력 (년)
  specialization: string[]; // 전문 종목 (FX, PH, SR, VT, PB, HB, UB, BB)
  status: 'active' | 'inactive';
  createdAt: string;
}

const judgeTypeLabels = {
  D: 'D심판 (난이도)',
  E: 'E심판 (실시)',
  both: 'D/E 겸임',
};

const apparatusLabels: Record<string, string> = {
  FX: '마루',
  PH: '안마',
  SR: '링',
  VT: '도마',
  PB: '평행봉',
  HB: '철봉',
  UB: '이단평행봉',
  BB: '평균대',
};

export default function JudgesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    level: 'E' as 'D' | 'E' | 'both',
    certification: '',
    experience: '',
    specialization: [] as string[],
  });

  const judgesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'judges') : null),
    [firestore]
  );
  const { data: judges, isLoading } = useCollection<Judge>(judgesCollection);

  const handleSubmit = async () => {
    if (!firestore) return;

    try {
      if (editingJudge) {
        // 수정
        await updateDoc(doc(firestore, 'judges', editingJudge.id), {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
        toast({ title: '심판 정보 수정 완료' });
      } else {
        // 신규 등록
        await addDoc(collection(firestore, 'judges'), {
          ...formData,
          status: 'active',
          createdAt: new Date().toISOString(),
        });
        toast({ title: '심판 등록 완료' });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving judge:', error);
      toast({ variant: 'destructive', title: '오류 발생', description: '심판 정보 저장에 실패했습니다.' });
    }
  };

  const handleDelete = async (judgeId: string) => {
    if (!firestore || !confirm('정말 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(doc(firestore, 'judges', judgeId));
      toast({ title: '심판 삭제 완료' });
    } catch (error) {
      console.error('Error deleting judge:', error);
      toast({ variant: 'destructive', title: '오류 발생', description: '심판 삭제에 실패했습니다.' });
    }
  };

  const handleEdit = (judge: Judge) => {
    setEditingJudge(judge);
    setFormData({
      name: judge.name,
      email: judge.email,
      phone: judge.phone,
      level: judge.level,
      certification: judge.certification,
      experience: judge.experience,
      specialization: judge.specialization,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingJudge(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      level: 'E',
      certification: '',
      experience: '',
      specialization: [],
    });
  };

  const toggleSpecialization = (apparatus: string) => {
    setFormData(prev => ({
      ...prev,
      specialization: prev.specialization.includes(apparatus)
        ? prev.specialization.filter(a => a !== apparatus)
        : [...prev.specialization, apparatus],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">심판 관리</h1>
          <p className="mt-1 text-sm text-slate-600">기계체조 심판 등록 및 관리</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          심판 등록
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>등록된 심판 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>구분</TableHead>
                <TableHead>자격증</TableHead>
                <TableHead>경력</TableHead>
                <TableHead>전문 종목</TableHead>
                <TableHead>연락처</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {judges && judges.length > 0 ? (
                judges.map((judge) => (
                  <TableRow key={judge.id}>
                    <TableCell className="font-medium">{judge.name}</TableCell>
                    <TableCell>
                      <Badge variant={judge.level === 'both' ? 'default' : 'secondary'}>
                        {judgeTypeLabels[judge.level]}
                      </Badge>
                    </TableCell>
                    <TableCell>{judge.certification}</TableCell>
                    <TableCell>{judge.experience}년</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {judge.specialization.map((app) => (
                          <Badge key={app} variant="outline" className="text-xs">
                            {apparatusLabels[app]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{judge.phone}</div>
                        <div className="text-slate-500">{judge.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={judge.status === 'active' ? 'default' : 'secondary'}>
                        {judge.status === 'active' ? '활동중' : '비활동'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(judge)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(judge.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-slate-500">
                    등록된 심판이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 심판 등록/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                {editingJudge ? '심판 정보 수정' : '심판 등록'}
              </div>
            </DialogTitle>
            <DialogDescription>
              기계체조 심판의 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="홍길동"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">심판 구분 *</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value: 'D' | 'E' | 'both') =>
                    setFormData({ ...formData, level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="D">D심판 (난이도)</SelectItem>
                    <SelectItem value="E">E심판 (실시)</SelectItem>
                    <SelectItem value="both">D/E 겸임</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="judge@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">전화번호 *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="010-1234-5678"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="certification">자격증 번호</Label>
                <Input
                  id="certification"
                  value={formData.certification}
                  onChange={(e) => setFormData({ ...formData, certification: e.target.value })}
                  placeholder="KGF-2024-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">경력 (년)</Label>
                <Input
                  id="experience"
                  type="number"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  placeholder="5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>전문 종목</Label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(apparatusLabels).map(([code, label]) => (
                  <Button
                    key={code}
                    type="button"
                    variant={formData.specialization.includes(code) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleSpecialization(code)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.email}>
              {editingJudge ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

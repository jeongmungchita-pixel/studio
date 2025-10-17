'use client';

export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Announcement } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, Pin, Bell } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const typeLabels = {
  general: '일반',
  important: '중요',
  event: '이벤트',
  emergency: '긴급',
};

const typeColors = {
  general: 'default',
  important: 'secondary',
  event: 'outline',
  emergency: 'destructive',
} as const;

const audienceLabels = {
  all: '전체',
  members: '회원',
  parents: '학부모',
  staff: '스태프',
};

export default function AnnouncementsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<Announcement['type']>('general');
  const [targetAudience, setTargetAudience] = useState<Announcement['targetAudience']>('all');
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch announcements
  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'announcements'),
      where('clubId', '==', user.clubId),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.clubId]);
  const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

  const handleCreate = () => {
    setEditingAnnouncement(null);
    setTitle('');
    setContent('');
    setType('general');
    setTargetAudience('all');
    setIsPinned(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setContent(announcement.content);
    setType(announcement.type);
    setTargetAudience(announcement.targetAudience);
    setIsPinned(announcement.isPinned);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!firestore || !user || !title || !content) return;

    setIsSubmitting(true);
    try {
      if (editingAnnouncement) {
        await updateDoc(doc(firestore, 'announcements', editingAnnouncement.id), {
          title,
          content,
          type,
          targetAudience,
          isPinned,
          updatedAt: new Date().toISOString(),
        });
        toast({ title: '공지사항 수정 완료' });
      } else {
        const announcementRef = doc(collection(firestore, 'announcements'));
        const announcementData: Announcement = {
          id: announcementRef.id,
          clubId: user.clubId,
          title,
          content,
          type,
          targetAudience,
          isPinned,
          createdBy: user.uid,
          createdByName: user.displayName || user.email || '관리자',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(announcementRef, announcementData);
        toast({ title: '공지사항 등록 완료' });
      }

      setIsDialogOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: '저장 실패' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(firestore, 'announcements', id));
      toast({ title: '공지사항 삭제 완료' });
    } catch (error) {
      toast({ variant: 'destructive', title: '삭제 실패' });
    }
  };

  const togglePin = async (announcement: Announcement) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'announcements', announcement.id), {
        isPinned: !announcement.isPinned,
        updatedAt: new Date().toISOString(),
      });
      toast({ title: announcement.isPinned ? '고정 해제' : '상단 고정' });
    } catch (error) {
      toast({ variant: 'destructive', title: '변경 실패' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const pinnedAnnouncements = announcements?.filter(a => a.isPinned) || [];
  const regularAnnouncements = announcements?.filter(a => !a.isPinned) || [];

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">공지사항</h1>
          <p className="text-muted-foreground mt-1">회원들에게 소식을 전하세요</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          새 공지사항
        </Button>
      </div>

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Pin className="h-5 w-5" />
            고정된 공지
          </h2>
          {pinnedAnnouncements.map((announcement) => (
            <Card key={announcement.id} className="border-2 border-blue-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={typeColors[announcement.type]}>
                        {typeLabels[announcement.type]}
                      </Badge>
                      <Badge variant="outline">
                        {audienceLabels[announcement.targetAudience]}
                      </Badge>
                      <Pin className="h-4 w-4 text-blue-500" />
                    </div>
                    <CardTitle className="text-xl">{announcement.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {announcement.createdByName} · {format(new Date(announcement.createdAt), 'PPP', { locale: ko })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => togglePin(announcement)}>
                      <Pin className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(announcement)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(announcement.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{announcement.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Regular Announcements */}
      <div className="space-y-3">
        {pinnedAnnouncements.length > 0 && (
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            일반 공지
          </h2>
        )}
        {regularAnnouncements.map((announcement) => (
          <Card key={announcement.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={typeColors[announcement.type]}>
                      {typeLabels[announcement.type]}
                    </Badge>
                    <Badge variant="outline">
                      {audienceLabels[announcement.targetAudience]}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{announcement.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {announcement.createdByName} · {format(new Date(announcement.createdAt), 'PPP', { locale: ko })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => togglePin(announcement)}>
                    <Pin className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(announcement)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(announcement.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{announcement.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!announcements || announcements.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Bell className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">등록된 공지사항이 없습니다</p>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              첫 공지사항 작성하기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? '공지사항 수정' : '새 공지사항'}</DialogTitle>
            <DialogDescription>
              회원들에게 전달할 소식을 작성하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">제목</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="공지사항 제목"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">유형</label>
                <Select value={type} onValueChange={(v) => setType(v as Announcement['type'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">일반</SelectItem>
                    <SelectItem value="important">중요</SelectItem>
                    <SelectItem value="event">이벤트</SelectItem>
                    <SelectItem value="emergency">긴급</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">대상</label>
                <Select value={targetAudience} onValueChange={(v) => setTargetAudience(v as Announcement['targetAudience'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="members">회원</SelectItem>
                    <SelectItem value="parents">학부모</SelectItem>
                    <SelectItem value="staff">스태프</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">내용</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="공지사항 내용을 입력하세요..."
                rows={10}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pinned"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="pinned" className="text-sm font-medium cursor-pointer">
                상단에 고정
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !title || !content}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                editingAnnouncement ? '수정' : '등록'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

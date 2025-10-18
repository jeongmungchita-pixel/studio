'use client';

export const dynamic = 'force-dynamic';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Announcement, AnnouncementType, Member } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Loader2, Pin, Bell, AlertCircle, type LucideIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

const typeLabels: Record<AnnouncementType, string> = {
  general: '일반',
  important: '중요',
  event: '이벤트',
  emergency: '긴급',
};

const typeColors: Record<AnnouncementType, BadgeVariant> = {
  general: 'default',
  important: 'secondary',
  event: 'outline',
  emergency: 'destructive',
};

const typeIcons: Record<AnnouncementType, LucideIcon> = {
  general: Bell,
  important: AlertCircle,
  event: Bell,
  emergency: AlertCircle,
};

export default function MemberAnnouncementsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Fetch member info
  const memberQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'members'),
      where('userId', '==', user.uid)
    );
  }, [firestore, user?.uid]);
  const { data: members } = useCollection<Member>(memberQuery);
  const member = members?.[0];

  // Fetch announcements
  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore || !member?.clubId) return null;
    return query(
      collection(firestore, 'announcements'),
      where('clubId', '==', member.clubId),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, member?.clubId]);
  const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">공지사항</h1>
        <p className="text-muted-foreground mt-1">클럽의 새로운 소식을 확인하세요</p>
      </div>

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Pin className="h-5 w-5 text-blue-500" />
            고정된 공지
          </h2>
          {pinnedAnnouncements.map((announcement) => {
            const announcementType = announcement.type ?? 'general';
            const Icon = typeIcons[announcementType];
            return (
              <Card key={announcement.id} className="border-2 border-blue-500 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      announcementType === 'emergency' ? 'bg-red-100' :
                      announcementType === 'important' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        announcementType === 'emergency' ? 'text-red-600' :
                        announcementType === 'important' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={typeColors[announcementType]}>
                          {typeLabels[announcementType]}
                        </Badge>
                        <Pin className="h-4 w-4 text-blue-500" />
                      </div>
                      <CardTitle className="text-xl">{announcement.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(announcement.createdAt), 'PPP', { locale: ko })}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-base leading-relaxed">{announcement.content}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Regular Announcements */}
      <div className="space-y-3">
        {pinnedAnnouncements.length > 0 && regularAnnouncements.length > 0 && (
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            일반 공지
          </h2>
        )}
        {regularAnnouncements.map((announcement) => {
          const announcementType = announcement.type ?? 'general';
          const Icon = typeIcons[announcementType];
          return (
            <Card key={announcement.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    announcementType === 'emergency' ? 'bg-red-100' :
                    announcementType === 'important' ? 'bg-yellow-100' :
                    'bg-gray-100'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      announcementType === 'emergency' ? 'text-red-600' :
                      announcementType === 'important' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={typeColors[announcementType]}>
                        {typeLabels[announcementType]}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(announcement.createdAt), 'PPP', { locale: ko })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap leading-relaxed">{announcement.content}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!announcements || announcements.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Bell className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">등록된 공지사항이 없습니다</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

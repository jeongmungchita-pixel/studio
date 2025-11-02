'use client';
import { useState, useEffect, useRef } from 'react';
import { useUser, useCollection, useDoc, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Notification, NotificationSettings } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  BellOff, 
  Check, 
  Settings, 
  Trophy, 
  Calendar,
  Award,
  FileText,
  X,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';

interface NotificationDropdownProps {
  trigger?: React.ReactNode;
}

export default function NotificationDropdown({ trigger }: NotificationDropdownProps) {
  const { _user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 알림 조회
  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.uid) return null;
    return query(
      collection(firestore, 'notifications'),
      where('userId', '==', _user.uid),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, _user?.uid]);
  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  // 알림 설정 조회
  const settingsQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.uid) return null;
    return doc(firestore, 'notification_settings', _user.uid);
  }, [firestore, _user?.uid]);
  const { data: settingsData } = useDoc<any>(settingsQuery);
  const [settings, setSettings] = useState<NotificationSettings>({
    userId: _user?.uid || '',
    pushEnabled: true,
    competitionStart: true,
    myTurn: true,
    resultAnnounced: true,
    certificateIssued: true,
    general: true,
    emailEnabled: false,
    emailCompetitionStart: false,
    emailResultAnnounced: false,
    emailCertificateIssued: false,
    updatedAt: new Date().toISOString()
  });

  // 설정 데이터 동기화
  useEffect(() => {
    if (settingsData) {
      setSettings({
        ...settings,
        ...settingsData
      });
    }
  }, [settingsData]);

  // 알림 아이콘
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'competition_start': return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'my_turn': return <Trophy className="h-4 w-4 text-green-500" />;
      case 'result_announced': return <Award className="h-4 w-4 text-yellow-500" />;
      case 'certificate_issued': return <FileText className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  // 알림 읽음 처리
  const handleMarkAsRead = async (notificationId: string) => {
    if (!firestore) return;
    
    try {
      const notificationRef = doc(firestore, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: new Date().toISOString()
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '알림 읽음 처리 중 오류가 발생했습니다.'
      });
    }
  };

  // 전체 읽음 처리
  const handleMarkAllAsRead = async () => {
    setIsMarkingAllRead(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markAllAsRead: true
        })
      });

      if (response.ok) {
        toast({
          title: '완료',
          description: '모든 알림을 읽음 처리했습니다.'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '전체 읽음 처리 중 오류가 발생했습니다.'
      });
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  // 설정 업데이트
  const handleUpdateSettings = async (newSettings: Partial<NotificationSettings>) => {
    setIsUpdatingSettings(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...settings,
          ...newSettings
        })
      });

      if (response.ok) {
        setSettings({
          ...settings,
          ...newSettings
        });
        toast({
          title: '완료',
          description: '알림 설정이 업데이트되었습니다.'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '설정 업데이트 중 오류가 발생했습니다.'
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // 알림 클릭 처리
  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id);
    
    // 액션 URL이 있으면 이동
    if (notification.data?.actionUrl) {
      window.location.href = notification.data.actionUrl;
    }
    
    setIsOpen(false);
  };

  const unreadCount = notifications?.length || 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96 p-0" ref={dropdownRef}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <DropdownMenuLabel className="text-base font-semibold">
            알림
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </DropdownMenuLabel>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllRead}
              >
                {isMarkingAllRead ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Settings */}
        {showSettings && (
          <div className="p-4 border-b bg-muted/30">
            <h4 className="font-semibold mb-3">알림 설정</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm">푸시 알림</label>
                <Switch
                  checked={settings.pushEnabled}
                  onCheckedChange={(checked) => handleUpdateSettings({ pushEnabled: checked })}
                  disabled={isUpdatingSettings}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm">시합 시작 알림</label>
                <Switch
                  checked={settings.competitionStart}
                  onCheckedChange={(checked) => handleUpdateSettings({ competitionStart: checked })}
                  disabled={isUpdatingSettings}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm">내 차례 알림</label>
                <Switch
                  checked={settings.myTurn}
                  onCheckedChange={(checked) => handleUpdateSettings({ myTurn: checked })}
                  disabled={isUpdatingSettings}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm">결과 발표 알림</label>
                <Switch
                  checked={settings.resultAnnounced}
                  onCheckedChange={(checked) => handleUpdateSettings({ resultAnnounced: checked })}
                  disabled={isUpdatingSettings}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm">인증서 발급 알림</label>
                <Switch
                  checked={settings.certificateIssued}
                  onCheckedChange={(checked) => handleUpdateSettings({ certificateIssued: checked })}
                  disabled={isUpdatingSettings}
                />
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : notifications && notifications.length > 0 ? (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="p-4 cursor-pointer hover:bg-accent"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3 w-full">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { 
                        addSuffix: true, 
                        locale: ko 
                      })}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="text-center py-8">
              <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">새 알림이 없습니다</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t">
          <DropdownMenuItem asChild>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <a href="/notifications" className="w-full">
                모든 알림 보기
              </a>
            </Button>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

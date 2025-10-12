'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Member, MessageHistory, MessageTemplate } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, MessageSquare, Users, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function MessagesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [messageType, setMessageType] = useState<'sms' | 'lms' | 'kakao'>('sms');
  const [content, setContent] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Fetch members
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'members'),
      where('clubId', '==', user.clubId)
    );
  }, [firestore, user?.clubId]);
  const { data: members } = useCollection<Member>(membersQuery);

  // Fetch message history
  const historyQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'message_history'),
      where('clubId', '==', user.clubId),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.clubId]);
  const { data: messageHistory } = useCollection<MessageHistory>(historyQuery);

  const handleSelectAll = () => {
    if (selectedMembers.length === members?.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members?.map(m => m.id) || []);
    }
  };

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSend = async () => {
    if (!firestore || !user || !content || selectedMembers.length === 0) {
      toast({ variant: 'destructive', title: '내용과 수신자를 선택하세요' });
      return;
    }

    // SMS는 90자, LMS는 2000자 제한
    if (messageType === 'sms' && content.length > 90) {
      toast({ variant: 'destructive', title: 'SMS는 90자까지 입력 가능합니다' });
      return;
    }

    setIsSending(true);
    try {
      const recipients = members
        ?.filter(m => selectedMembers.includes(m.id))
        .map(m => ({
          memberId: m.id,
          memberName: m.name,
          phone: m.phone,
          status: 'pending' as const,
        })) || [];

      const historyRef = doc(collection(firestore, 'message_history'));
      const historyData: MessageHistory = {
        id: historyRef.id,
        clubId: user.clubId!,
        type: messageType,
        recipients,
        content,
        totalCount: recipients.length,
        successCount: 0,
        failCount: 0,
        sentBy: user.uid,
        sentByName: user.displayName || user.email || '관리자',
        createdAt: new Date().toISOString(),
      };

      await setDoc(historyRef, historyData);

      // TODO: 실제 네이버 클라우드 API 호출은 서버 사이드에서 처리
      // Firebase Functions 또는 Next.js API Route 사용

      toast({
        title: '발송 요청 완료',
        description: `${recipients.length}명에게 ${messageType.toUpperCase()} 발송을 요청했습니다.`,
      });

      setContent('');
      setSelectedMembers([]);
    } catch (error) {
      console.error('Message send error:', error);
      toast({ variant: 'destructive', title: '발송 실패' });
    } finally {
      setIsSending(false);
    }
  };

  const getCharCount = () => {
    const max = messageType === 'sms' ? 90 : 2000;
    return `${content.length} / ${max}`;
  };

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">단체 문자 발송</h1>
        <p className="text-muted-foreground mt-1">회원들에게 문자를 발송하세요</p>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send">문자 발송</TabsTrigger>
          <TabsTrigger value="history">발송 내역</TabsTrigger>
        </TabsList>

        {/* Send Tab */}
        <TabsContent value="send" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>메시지 작성</CardTitle>
              <CardDescription>
                발송할 메시지 유형과 내용을 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Message Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">메시지 유형</label>
                <div className="flex gap-2">
                  <Button
                    variant={messageType === 'sms' ? 'default' : 'outline'}
                    onClick={() => setMessageType('sms')}
                  >
                    SMS (90자)
                  </Button>
                  <Button
                    variant={messageType === 'lms' ? 'default' : 'outline'}
                    onClick={() => setMessageType('lms')}
                  >
                    LMS (2000자)
                  </Button>
                  <Button
                    variant={messageType === 'kakao' ? 'default' : 'outline'}
                    onClick={() => setMessageType('kakao')}
                  >
                    알림톡
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">메시지 내용</label>
                  <span className="text-sm text-muted-foreground">{getCharCount()}</span>
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="메시지 내용을 입력하세요..."
                  rows={messageType === 'sms' ? 4 : 10}
                  maxLength={messageType === 'sms' ? 90 : 2000}
                />
              </div>
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>수신자 선택</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {selectedMembers.length}명 선택
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Checkbox
                  checked={selectedMembers.length === members?.length}
                  onCheckedChange={handleSelectAll}
                />
                <label className="font-semibold cursor-pointer" onClick={handleSelectAll}>
                  전체 선택 ({members?.length || 0}명)
                </label>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {members?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => handleToggleMember(member.id)}
                  >
                    <Checkbox
                      checked={selectedMembers.includes(member.id)}
                      onCheckedChange={() => handleToggleMember(member.id)}
                    />
                    <div className="flex-1">
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.phone}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSend}
                disabled={isSending || !content || selectedMembers.length === 0}
                className="w-full"
                size="lg"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    발송 중...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {selectedMembers.length}명에게 발송
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-3">
          {messageHistory?.map((history) => (
            <Card key={history.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>{history.type.toUpperCase()}</Badge>
                      <Badge variant="outline">
                        {history.totalCount}명 발송
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {history.sentByName} · {format(new Date(history.createdAt), 'PPP p', { locale: ko })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-600 font-semibold">
                      성공: {history.successCount}
                    </p>
                    {history.failCount > 0 && (
                      <p className="text-sm text-red-600 font-semibold">
                        실패: {history.failCount}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{history.content}</p>
              </CardContent>
            </Card>
          ))}

          {(!messageHistory || messageHistory.length === 0) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">발송 내역이 없습니다</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}

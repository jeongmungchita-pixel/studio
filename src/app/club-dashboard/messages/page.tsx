'use client';

export const dynamic = 'force-dynamic';
import { useUser } from '@/hooks/use-user';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Member } from '@/types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useState } from 'react';
import { MessageHistory } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, MessageSquare } from 'lucide-react';
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
          phone: m.phoneNumber || '',
          status: 'pending' as const,
        })) || [];

      const historyRef = doc(collection(firestore, 'message_history'));
      const mappedType: MessageHistory['type'] = messageType === 'kakao' ? 'in-app' : 'sms';
      const historyData: MessageHistory = {
        id: historyRef.id,
        clubId: user.clubId!,
        type: mappedType,
        content,
        recipientType: 'specific',
        recipientIds: recipients.map(r => r.memberId),
        recipientCount: recipients.length,
        sentBy: user.uid,
        sentByName: user.displayName || user.email || '관리자',
        sentAt: new Date().toISOString(),
        status: 'sent',
        createdAt: new Date().toISOString(),
      };

      await setDoc(historyRef, historyData);

      // TODO: SMS 발송 기능은 나중에 구현 예정
      // Firebase Functions를 통한 실제 SMS 발송은 외부 API 연동 및 비용이 발생하므로 보류
      // 현재는 발송 기록만 저장됨
      toast({
        title: '발송 기록 저장 완료',
        description: `${recipients.length}명에게 ${messageType.toUpperCase()} 발송 기록이 저장되었습니다. (실제 발송 기능은 추후 구현 예정)`,
      });
      
      // 향후 구현 시 아래 코드 활성화
      // try {
      //   const functions = getFunctions();
      //   const sendBulkSMS = httpsCallable(functions, 'sendBulkSMS');
      //   
      //   await sendBulkSMS({
      //     recipients: recipients.map(r => ({
      //       phone: r.phone,
      //       name: r.memberName,
      //     })),
      //     message: content,
      //     type: messageType,
      //   });
      //
      //   toast({
      //     title: '발송 완료',
      //     description: `${recipients.length}명에게 ${messageType.toUpperCase()} 발송이 완료되었습니다.`,
      //   });
      // } catch (error) {
      //   console.error('SMS send error:', error);
      //   toast({
      //     title: '발송 실패',
      //     description: 'SMS 발송 중 오류가 발생했습니다.',
      //     variant: 'destructive',
      //   });
      // }

      setContent('');
      setSelectedMembers([]);
    } catch (error) {
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

      {/* 개발 중 알림 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>알림:</strong> 실제 SMS 발송 기능은 추후 구현 예정입니다. 현재는 발송 기록만 저장됩니다.
        </p>
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
                      <p className="text-sm text-muted-foreground">{member.phoneNumber || '전화번호 없음'}</p>
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
                      <Badge variant="outline">{history.recipientCount || 0}명 발송</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {history.sentByName} · {format(new Date(history.sentAt || history.createdAt), 'PPP p', { locale: ko })}
                    </p>
                  </div>
                  <div className="text-right">
                    {typeof history.deliveredCount === 'number' && (
                      <p className="text-sm text-green-600 font-semibold">성공: {history.deliveredCount}</p>
                    )}
                    {typeof history.readCount === 'number' && (
                      <p className="text-sm text-blue-600 font-semibold">열람: {history.readCount}</p>
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

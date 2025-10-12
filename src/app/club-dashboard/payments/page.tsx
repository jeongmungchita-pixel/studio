'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, updateDoc, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Payment, ClubBankAccount } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, Clock, DollarSign, CreditCard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const statusLabels = {
  pending: '입금 대기',
  completed: '입금 완료',
  failed: '실패',
  refunded: '환불',
};

const statusColors = {
  pending: 'secondary',
  completed: 'default',
  failed: 'destructive',
  refunded: 'outline',
} as const;

const typeLabels = {
  pass: '이용권',
  event: '이벤트',
  competition: '시합',
  level_test: '레벨테스트',
  other: '기타',
};

export default function PaymentsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch bank account
  const bankAccountQuery = useMemoFirebase(
    () => (firestore && user?.clubId ? doc(firestore, 'club_bank_accounts', user.clubId) : null),
    [firestore, user?.clubId]
  );

  // Fetch payments
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'payments'),
      where('clubId', '==', user.clubId),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.clubId]);
  const { data: payments, isLoading } = useCollection<Payment>(paymentsQuery);

  const handleVerify = async (payment: Payment, approved: boolean) => {
    if (!firestore || !user) return;

    setIsProcessing(true);
    try {
      await updateDoc(doc(firestore, 'payments', payment.id), {
        status: approved ? 'completed' : 'failed',
        verifiedBy: user.uid,
        verifiedAt: new Date().toISOString(),
        paidAt: approved ? new Date().toISOString() : undefined,
      });

      // TODO: 승인 시 이용권 갱신 로직 추가
      if (approved && payment.type === 'pass' && payment.relatedId) {
        // Update member pass status
        await updateDoc(doc(firestore, 'member_passes', payment.relatedId), {
          status: 'active',
          updatedAt: new Date().toISOString(),
        });
      }

      toast({
        title: approved ? '입금 확인 완료' : '입금 거부',
        description: approved
          ? '이용권이 갱신되었습니다.'
          : '입금이 거부되었습니다.',
      });

      setSelectedPayment(null);
    } catch (error) {
      console.error('Payment verify error:', error);
      toast({ variant: 'destructive', title: '처리 실패' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const pendingPayments = payments?.filter(p => p.status === 'pending') || [];
  const completedPayments = payments?.filter(p => p.status === 'completed') || [];

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">결제 관리</h1>
        <p className="text-muted-foreground mt-1">입금 확인 및 결제 내역 관리</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">입금 대기</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments.length}건</div>
            <p className="text-xs text-muted-foreground mt-1">
              확인 필요
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 입금</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedPayments.length}건</div>
            <p className="text-xs text-muted-foreground mt-1">
              완료된 결제
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 금액</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}원
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              이번 달 수익
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            입금 대기 중
          </h2>
          {pendingPayments.map((payment) => (
            <Card key={payment.id} className="border-2 border-orange-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={statusColors[payment.status]}>
                        {statusLabels[payment.status]}
                      </Badge>
                      <Badge variant="outline">
                        {typeLabels[payment.type]}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{payment.memberName}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(payment.createdAt), 'PPP p', { locale: ko })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">
                      {payment.amount.toLocaleString()}원
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {payment.bankTransferInfo && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-semibold mb-1">입금 정보</p>
                    <p className="text-sm">입금자: {payment.bankTransferInfo.depositorName}</p>
                    <p className="text-sm">입금일: {format(new Date(payment.bankTransferInfo.depositDate), 'PPP', { locale: ko })}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleVerify(payment, true)}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    입금 확인
                  </Button>
                  <Button
                    onClick={() => handleVerify(payment, false)}
                    disabled={isProcessing}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    거부
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completed Payments */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          완료된 결제
        </h2>
        {completedPayments.map((payment) => (
          <Card key={payment.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={statusColors[payment.status]}>
                      {statusLabels[payment.status]}
                    </Badge>
                    <Badge variant="outline">
                      {typeLabels[payment.type]}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{payment.memberName}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(payment.createdAt), 'PPP p', { locale: ko })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    {payment.amount.toLocaleString()}원
                  </p>
                  {payment.paidAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      입금 완료: {format(new Date(payment.paidAt), 'M/d')}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {(!payments || payments.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <CreditCard className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">결제 내역이 없습니다</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

'use client';

export const dynamic = 'force-dynamic';
import { useState, useMemo, useCallback } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, updateDoc, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Payment, Member, FinancialTransaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, Clock, DollarSign, CreditCard, User, Baby, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { calculateAge } from '@/lib/member-utils';

const statusLabels = {
  pending: '입금 대기',
  completed: '입금 완료',
  failed: '실패',
  refunded: '환불',
  cancelled: '취소',
};

const statusColors = {
  pending: 'secondary',
  completed: 'default',
  failed: 'destructive',
  refunded: 'outline',
  cancelled: 'outline',
} as const;

const typeLabels = {
  pass: '이용권',
  event: '이벤트',
  class: '수업',
  merchandise: '용품',
  other: '기타',
};

export default function PaymentsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'adult' | 'child'>('all');
  
  // Transaction dialogs
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);

  type TransactionTypeLocal = 'income' | 'expense';
  type TransactionCategoryLocal =
    | 'membership_fee'
    | 'event_fee'
    | 'competition_fee'
    | 'sponsorship'
    | 'other_income'
    | 'facility_rent'
    | 'equipment'
    | 'salary'
    | 'utility'
    | 'marketing'
    | 'maintenance'
    | 'other_expense';

  // Transaction form
  const [transactionType, setTransactionType] = useState<TransactionTypeLocal>('income');
  const [transactionCategory, setTransactionCategory] = useState<TransactionCategoryLocal>('other_income');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  

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

  // Fetch members to get category info
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(collection(firestore, 'members'), where('clubId', '==', user.clubId));
  }, [firestore, user?.clubId]);
  const { data: members } = useCollection<Member>(membersQuery);

  // Fetch financial transactions
  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'financial_transactions'),
      where('clubId', '==', user.clubId),
      where('isCancelled', '==', false),
      orderBy('date', 'desc')
    );
  }, [firestore, user?.clubId]);
  const { data: transactions } = useCollection<FinancialTransaction>(transactionsQuery);

  // Create member map for quick lookup
  const memberMap = useMemo(() => {
    if (!members) return new Map();
    return new Map(members.map(m => [m.id, m]));
  }, [members]);

  // Get member category
  const getMemberCategory = useCallback((memberId?: string): 'adult' | 'child' | null => {
    if (!memberId) return null;
    const member = memberMap.get(memberId);
    if (!member) return null;
    return member.memberCategory || (calculateAge(member.dateOfBirth) >= 19 ? 'adult' : 'child');
  }, [memberMap]);

  // Filter payments by category
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    if (categoryFilter === 'all') return payments;
    return payments.filter(p => getMemberCategory(p.memberId) === categoryFilter);
  }, [payments, categoryFilter, getMemberCategory]);

  const handleVerify = async (payment: Payment, approved: boolean) => {
    if (!firestore || !user) return;

    setIsProcessing(true);
    try {
      await updateDoc(doc(firestore, 'payments', payment.id), {
        status: approved ? 'completed' : 'failed',
        verifiedBy: user.uid,
        verifiedAt: new Date().toISOString(),
        paymentDate: approved ? new Date().toISOString() : undefined,
      });

      // 승인 시 이용권 활성화 및 회원 정보 업데이트
      if (approved && payment.targetType === 'pass' && payment.targetId) {
        const now = new Date();
        
        // 이용권 활성화
        await updateDoc(doc(firestore, 'member_passes', payment.targetId), {
          status: 'active',
          startDate: now.toISOString(),
          updatedAt: now.toISOString(),
        });

        // 회원의 activePassId 업데이트
        if (payment.memberId) {
          await updateDoc(doc(firestore, 'members', payment.memberId), {
            activePassId: payment.targetId,
            updatedAt: now.toISOString(),
          });
        }
      }

      toast({
        title: approved ? '입금 확인 완료' : '입금 거부',
        description: approved
          ? '이용권이 갱신되었습니다.'
          : '입금이 거부되었습니다.',
      });

      setSelectedPayment(null);
    } catch (error) {
      toast({ variant: 'destructive', title: '처리 실패' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 거래 추가
  const handleAddTransaction = async () => {
    if (!firestore || !user?.clubId) return;
    
    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: '올바른 금액을 입력하세요' });
      return;
    }

    setIsProcessing(true);
    try {
      const { addDoc } = await import('firebase/firestore');
      
      const transactionData: Omit<FinancialTransaction, 'id'> = {
        clubId: user.clubId,
        type: transactionType,
        category: transactionCategory,
        amount,
        currency: 'KRW',
        description: transactionDescription,
        date: transactionDate,
        status: 'completed',
        isCancelled: false,
        createdAt: new Date().toISOString(),
        recordedBy: user.uid,
        recordedByName: user.displayName || user.email || '관리자',
      };

      await addDoc(collection(firestore, 'financial_transactions'), transactionData);

      toast({
        title: '등록 완료',
        description: `${transactionType === 'income' ? '수입' : '지출'}이 등록되었습니다.`,
      });

      // Reset form
      setTransactionAmount('');
      setTransactionDescription('');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setIsAddTransactionOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: '등록 실패' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 분할 기능 제거됨

  // Statistics by category
  const stats = useMemo(() => {
    if (!payments) return { all: { pending: 0, completed: 0, total: 0 }, adult: { pending: 0, completed: 0, total: 0 }, child: { pending: 0, completed: 0, total: 0 } };
    
    const result = {
      all: { pending: 0, completed: 0, total: 0 },
      adult: { pending: 0, completed: 0, total: 0 },
      child: { pending: 0, completed: 0, total: 0 },
    };

    payments.forEach(p => {
      const category = getMemberCategory(p.memberId);
      const amount = p.amount;

      // All
      if (p.status === 'pending') result.all.pending++;
      if (p.status === 'completed') {
        result.all.completed++;
        result.all.total += amount;
      }

      // By category
      if (category === 'adult') {
        if (p.status === 'pending') result.adult.pending++;
        if (p.status === 'completed') {
          result.adult.completed++;
          result.adult.total += amount;
        }
      } else if (category === 'child') {
        if (p.status === 'pending') result.child.pending++;
        if (p.status === 'completed') {
          result.child.completed++;
          result.child.total += amount;
        }
      }
    });

    return result;
  }, [payments, getMemberCategory]);

  const pendingPayments = filteredPayments.filter(p => p.status === 'pending');
  const completedPayments = filteredPayments.filter(p => p.status === 'completed');

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // 카테고리 라벨
  const categoryLabels: Record<TransactionCategoryLocal, string> = {
    membership_fee: '회원권',
    event_fee: '이벤트',
    competition_fee: '시합',
    sponsorship: '후원금',
    other_income: '기타 수입',
    facility_rent: '시설 임대료',
    equipment: '장비',
    salary: '급여',
    utility: '공과금',
    marketing: '마케팅',
    maintenance: '유지보수',
    other_expense: '기타 지출',
  };

  const getCategoryLabel = (cat: string): string => {
    return categoryLabels[cat as TransactionCategoryLocal] || '기타';
  };

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">재무 관리</h1>
          <p className="text-muted-foreground mt-1">수입/지출 관리 및 입금 확인</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setTransactionType('income'); setTransactionCategory('other_income'); setIsAddTransactionOpen(true); }} variant="default">
            <TrendingUp className="mr-2 h-4 w-4" />
            수입 추가
          </Button>
          <Button onClick={() => { setTransactionType('expense'); setTransactionCategory('other_expense'); setIsAddTransactionOpen(true); }} variant="outline">
            <TrendingDown className="mr-2 h-4 w-4" />
            지출 추가
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as 'all' | 'adult' | 'child')} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            <Users className="mr-2 h-4 w-4" />
            전체
          </TabsTrigger>
          <TabsTrigger value="adult">
            <User className="mr-2 h-4 w-4" />
            성인
          </TabsTrigger>
          <TabsTrigger value="child">
            <Baby className="mr-2 h-4 w-4" />
            주니어
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* Summary - All */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">입금 대기</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.all.pending}건</div>
                <p className="text-xs text-muted-foreground mt-1">확인 필요</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">완료</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.all.completed}건</div>
                <p className="text-xs text-muted-foreground mt-1">완료된 결제</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 금액</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.all.total.toLocaleString()}원</div>
                <p className="text-xs text-muted-foreground mt-1">이번 달 수익</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="adult" className="space-y-6">
          {/* Summary - Adult */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">입금 대기</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.adult.pending}건</div>
                <p className="text-xs text-muted-foreground mt-1">성인 회원</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">완료</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.adult.completed}건</div>
                <p className="text-xs text-muted-foreground mt-1">완료된 결제</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 금액</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.adult.total.toLocaleString()}원</div>
                <p className="text-xs text-muted-foreground mt-1">성인 수익</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="child" className="space-y-6">
          {/* Summary - Child */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">입금 대기</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.child.pending}건</div>
                <p className="text-xs text-muted-foreground mt-1">주니어 회원</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">완료</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.child.completed}건</div>
                <p className="text-xs text-muted-foreground mt-1">완료된 결제</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 금액</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.child.total.toLocaleString()}원</div>
                <p className="text-xs text-muted-foreground mt-1">주니어 수익</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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
                        {typeLabels[payment.targetType]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{payment.memberName}</CardTitle>
                      {payment.memberId && getMemberCategory(payment.memberId) && (
                        <Badge className={getMemberCategory(payment.memberId) === 'adult' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                          {getMemberCategory(payment.memberId) === 'adult' ? <User className="inline h-3 w-3 mr-1" /> : <Baby className="inline h-3 w-3 mr-1" />}
                          {getMemberCategory(payment.memberId) === 'adult' ? '성인' : '주니어'}
                        </Badge>
                      )}
                    </div>
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
                      {typeLabels[payment.targetType]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{payment.memberName}</CardTitle>
                    {payment.memberId && getMemberCategory(payment.memberId) && (
                      <Badge className={getMemberCategory(payment.memberId) === 'adult' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                        {getMemberCategory(payment.memberId) === 'adult' ? <User className="inline h-3 w-3 mr-1" /> : <Baby className="inline h-3 w-3 mr-1" />}
                        {getMemberCategory(payment.memberId) === 'adult' ? '성인' : '주니어'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(payment.createdAt), 'PPP p', { locale: ko })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    {payment.amount.toLocaleString()}원
                  </p>
                  
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

      {/* Financial Transactions */}
      {transactions && transactions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">수입/지출 내역</h2>
          {transactions.map((transaction) => (
            <Card key={transaction.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                        {transaction.type === 'income' ? <TrendingUp className="inline h-3 w-3 mr-1" /> : <TrendingDown className="inline h-3 w-3 mr-1" />}
                        {transaction.type === 'income' ? '수입' : '지출'}
                      </Badge>
                      <Badge variant="outline">{getCategoryLabel(transaction.category)}</Badge>
                      
                    </div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(transaction.date), 'PPP', { locale: ko })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString()}원
                    </p>
                    
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Add Transaction Dialog */}
      <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{transactionType === 'income' ? '수입' : '지출'} 추가</DialogTitle>
            <DialogDescription>
              {transactionType === 'income' ? '수입' : '지출'} 내역을 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>카테고리</Label>
              <Select value={transactionCategory} onValueChange={(v) => setTransactionCategory(v as TransactionCategoryLocal)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionType === 'income' ? (
                    <>
                      <SelectItem value="membership_fee">회원권</SelectItem>
                      <SelectItem value="event_fee">이벤트</SelectItem>
                      <SelectItem value="competition_fee">시합</SelectItem>
                      <SelectItem value="sponsorship">후원금</SelectItem>
                      <SelectItem value="other_income">기타 수입</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="facility_rent">시설 임대료</SelectItem>
                      <SelectItem value="equipment">장비</SelectItem>
                      <SelectItem value="salary">급여</SelectItem>
                      <SelectItem value="utility">공과금</SelectItem>
                      <SelectItem value="marketing">마케팅</SelectItem>
                      <SelectItem value="maintenance">유지보수</SelectItem>
                      <SelectItem value="other_expense">기타 지출</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>금액</Label>
              <Input
                type="number"
                placeholder="금액 입력"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>설명</Label>
              <Textarea
                placeholder="설명 입력"
                value={transactionDescription}
                onChange={(e) => setTransactionDescription(e.target.value)}
              />
            </div>
            <div>
              <Label>날짜</Label>
              <Input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTransactionOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddTransaction} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Transaction Dialog 제거됨 */}
    </main>
  );
}

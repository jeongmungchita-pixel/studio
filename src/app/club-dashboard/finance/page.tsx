'use client';

export const dynamic = 'force-dynamic';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Payment } from '@/types';

interface IncomeAllocation { month: string; amount: number; allocated: boolean; }
interface IncomeSplitInfo {
  totalAmount: number;
  months: number;
  monthlyAmount: number;
  startMonth: string;
  allocations: IncomeAllocation[];
}
interface Income {
  id: string;
  clubId: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  isRecurring: boolean;
  isSplit: boolean;
  splitInfo?: IncomeSplitInfo | null;
  createdBy: string;
  createdAt: string;
}
interface Expense {
  id: string;
  clubId: string;
  category: keyof typeof expenseCategories | string;
  amount: number;
  description: string;
  date: string;
  isRecurring: boolean;
  createdBy: string;
  createdAt: string;
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Split } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';

const expenseCategories = {
  rent: '월세/임대료',
  salary: '인건비',
  equipment: '장비/기구',
  supplies: '소모품',
  utilities: '공과금',
  marketing: '마케팅',
  maintenance: '유지보수',
  other: '기타',
};

const getExpenseCategoryLabel = (key: string): string => {
  return expenseCategories[key as keyof typeof expenseCategories] || '기타';
};

export default function FinancePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);

  // Income form
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDescription, setIncomeDescription] = useState('');
  const [incomeDate, setIncomeDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [incomeCategory, setIncomeCategory] = useState('other');

  // Expense form
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expenseCategory, setExpenseCategory] = useState<keyof typeof expenseCategories>('other');
  const [isRecurring, setIsRecurring] = useState(false);

  // Split form
  const [splitMonths, setSplitMonths] = useState('');

  // Fetch incomes
  const incomesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'incomes'),
      where('clubId', '==', user.clubId)
    );
  }, [firestore, user?.clubId]);
  const { data: incomes } = useCollection<Income>(incomesQuery);

  // Fetch expenses
  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'expenses'),
      where('clubId', '==', user.clubId)
    );
  }, [firestore, user?.clubId]);
  const { data: expenses } = useCollection<Expense>(expensesQuery);

  // Fetch payments (for auto income)
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.clubId) return null;
    return query(
      collection(firestore, 'payments'),
      where('clubId', '==', user.clubId),
      where('status', '==', 'completed')
    );
  }, [firestore, user?.clubId]);
  const { data: payments } = useCollection<Payment>(paymentsQuery);

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedMonth));
    const monthEnd = endOfMonth(new Date(selectedMonth));

    // Filter incomes for selected month
    const monthIncomes = incomes?.filter((income: Income) => {
      if (income.isSplit && income.splitInfo) {
        // Check if this month has allocation
        return income.splitInfo.allocations.some(
          alloc => alloc.month === selectedMonth && alloc.allocated
        );
      }
      const incomeDate = new Date(income.date);
      return incomeDate >= monthStart && incomeDate <= monthEnd;
    }) || [];

    // Calculate income considering splits
    const totalIncome = monthIncomes.reduce((sum: number, income: Income) => {
      if (income.isSplit && income.splitInfo) {
        const allocation = income.splitInfo.allocations.find((a: IncomeAllocation) => a.month === selectedMonth);
        return sum + (allocation?.amount || 0);
      }
      return sum + income.amount;
    }, 0);

    // Filter expenses for selected month
    const monthExpenses = expenses?.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= monthStart && expenseDate <= monthEnd;
    }) || [];

    const totalExpense = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Category breakdown
    const incomeByCategory: Record<string, number> = {};
    monthIncomes.forEach((income: Income) => {
      const amount = income.isSplit && income.splitInfo
        ? income.splitInfo.allocations.find((a: IncomeAllocation) => a.month === selectedMonth)?.amount || 0
        : income.amount;
      incomeByCategory[income.category] = (incomeByCategory[income.category] || 0) + amount;
    });

    const expenseByCategory: Record<string, number> = {};
    monthExpenses.forEach(expense => {
      expenseByCategory[expense.category] = (expenseByCategory[expense.category] || 0) + expense.amount;
    });

    return {
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
      incomeByCategory,
      expenseByCategory,
      monthIncomes,
      monthExpenses,
    };
  }, [incomes, expenses, selectedMonth]);

  const handleAddIncome = async () => {
    if (!firestore || !user || !incomeAmount || !incomeDescription) return;

    try {
      const incomeRef = doc(collection(firestore, 'incomes'));
      const incomeData: Income = {
        id: incomeRef.id,
        clubId: user.clubId!,
        type: 'other',
        category: incomeCategory,
        amount: parseFloat(incomeAmount),
        description: incomeDescription,
        date: incomeDate,
        isRecurring: false,
        isSplit: false,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      };

      await setDoc(incomeRef, incomeData);

      toast({ title: '수입 등록 완료' });
      setIsIncomeDialogOpen(false);
      setIncomeAmount('');
      setIncomeDescription('');
    } catch (error) {
      toast({ variant: 'destructive', title: '등록 실패' });
    }
  };

  const handleAddExpense = async () => {
    if (!firestore || !user || !expenseAmount || !expenseDescription) return;

    try {
      const expenseRef = doc(collection(firestore, 'expenses'));
      const expenseData: Expense = {
        id: expenseRef.id,
        clubId: user.clubId!,
        category: expenseCategory,
        amount: parseFloat(expenseAmount),
        description: expenseDescription,
        date: expenseDate,
        isRecurring,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      };

      await setDoc(expenseRef, expenseData);

      toast({ title: '지출 등록 완료' });
      setIsExpenseDialogOpen(false);
      setExpenseAmount('');
      setExpenseDescription('');
    } catch (error) {
      toast({ variant: 'destructive', title: '등록 실패' });
    }
  };

  const handleSplitIncome = async () => {
    if (!firestore || !selectedIncome || !splitMonths) return;

    const months = parseInt(splitMonths);
    if (months < 2 || months > 24) {
      toast({ variant: 'destructive', title: '2~24개월 사이로 입력하세요' });
      return;
    }

    try {
      const monthlyAmount = selectedIncome.amount / months;
      const allocations = [];
      const startDate = new Date(selectedIncome.date);

      for (let i = 0; i < months; i++) {
        const month = format(addMonths(startDate, i), 'yyyy-MM');
        allocations.push({
          month,
          amount: monthlyAmount,
          allocated: true,
        });
      }

      await updateDoc(doc(firestore, 'incomes', selectedIncome.id), {
        isSplit: true,
        splitInfo: {
          totalAmount: selectedIncome.amount,
          months,
          monthlyAmount,
          startMonth: format(startDate, 'yyyy-MM'),
          allocations,
        },
      });

      toast({ title: `${months}개월 분할 완료` });
      setIsSplitDialogOpen(false);
      setSelectedIncome(null);
      setSplitMonths('');
    } catch (error) {
      toast({ variant: 'destructive', title: '분할 실패' });
    }
  };

  const handleCancelSplit = async (income: Income) => {
    if (!firestore || !confirm('분할을 취소하시겠습니까?')) return;

    try {
      await updateDoc(doc(firestore, 'incomes', income.id), {
        isSplit: false,
        splitInfo: null,
      });

      toast({ title: '분할 취소 완료' });
    } catch (error) {
      toast({ variant: 'destructive', title: '취소 실패' });
    }
  };

  const handleDeleteIncome = async (id: string) => {
    if (!firestore || !confirm('삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(firestore, 'incomes', id));
      toast({ title: '삭제 완료' });
    } catch (error) {
      toast({ variant: 'destructive', title: '삭제 실패' });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!firestore || !confirm('삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(firestore, 'expenses', id));
      toast({ title: '삭제 완료' });
    } catch (error) {
      toast({ variant: 'destructive', title: '삭제 실패' });
    }
  };

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">재무 관리</h1>
          <p className="text-muted-foreground mt-1">수입/지출 관리 및 재무 분석</p>
        </div>
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-40"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 수입</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {monthlyData.totalIncome.toLocaleString()}원
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 지출</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {monthlyData.totalExpense.toLocaleString()}원
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">순이익</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monthlyData.netIncome >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {monthlyData.netIncome.toLocaleString()}원
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="income">수입</TabsTrigger>
          <TabsTrigger value="expense">지출</TabsTrigger>
          <TabsTrigger value="analysis">분석</TabsTrigger>
        </TabsList>

        {/* Income Tab */}
        <TabsContent value="income" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsIncomeDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              수입 추가
            </Button>
          </div>

          {monthlyData.monthIncomes.map((income) => (
            <Card key={income.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{income.description}</p>
                      {income.isSplit && (
                        <Badge variant="outline">
                          <Split className="h-3 w-3 mr-1" />
                          {income.splitInfo?.months}개월 분할
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(income.date), 'PPP', { locale: ko })} · {income.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">
                        {income.isSplit && income.splitInfo
                          ? income.splitInfo.monthlyAmount.toLocaleString()
                          : income.amount.toLocaleString()}원
                      </p>
                      {income.isSplit && income.splitInfo && (
                        <p className="text-xs text-muted-foreground">
                          (총 {income.splitInfo.totalAmount.toLocaleString()}원)
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!income.isSplit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedIncome(income);
                            setIsSplitDialogOpen(true);
                          }}
                        >
                          <Split className="h-4 w-4" />
                        </Button>
                      )}
                      {income.isSplit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelSplit(income)}
                        >
                          분할 취소
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteIncome(income.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Expense Tab */}
        <TabsContent value="expense" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsExpenseDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              지출 추가
            </Button>
          </div>

          {monthlyData.monthExpenses.map((expense) => (
            <Card key={expense.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold">{expense.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(expense.date), 'PPP', { locale: ko })} · {getExpenseCategoryLabel(expense.category)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-bold text-red-600">
                      {expense.amount.toLocaleString()}원
                    </p>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteExpense(expense.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Income by Category */}
            <Card>
              <CardHeader>
                <CardTitle>수입 카테고리별</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(monthlyData.incomeByCategory).map(([category, amount]) => (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{category}</span>
                      <span className="text-green-600 font-semibold">
                        {amount.toLocaleString()}원 ({((amount / monthlyData.totalIncome) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${(amount / monthlyData.totalIncome) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Expense by Category */}
            <Card>
              <CardHeader>
                <CardTitle>지출 카테고리별</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(monthlyData.expenseByCategory).map(([category, amount]) => (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{expenseCategories[category as keyof typeof expenseCategories]}</span>
                      <span className="text-red-600 font-semibold">
                        {amount.toLocaleString()}원 ({((amount / monthlyData.totalExpense) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full transition-all"
                        style={{ width: `${(amount / monthlyData.totalExpense) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Income Dialog */}
      <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>수입 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">금액</label>
              <Input
                type="number"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                placeholder="1000000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">설명</label>
              <Input
                value={incomeDescription}
                onChange={(e) => setIncomeDescription(e.target.value)}
                placeholder="예: 기타 수입"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">날짜</label>
              <Input
                type="date"
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">카테고리</label>
              <Input
                value={incomeCategory}
                onChange={(e) => setIncomeCategory(e.target.value)}
                placeholder="예: 기타"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIncomeDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddIncome}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>지출 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">금액</label>
              <Input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="500000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">설명</label>
              <Input
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                placeholder="예: 장비 구매"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">날짜</label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">카테고리</label>
              <Select value={expenseCategory} onValueChange={(v) => setExpenseCategory(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(expenseCategories).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddExpense}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Dialog */}
      <Dialog open={isSplitDialogOpen} onOpenChange={setIsSplitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>수입 분할</DialogTitle>
            <DialogDescription>
              {selectedIncome?.amount.toLocaleString()}원을 몇 개월로 분할하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">분할 개월 수 (2~24개월)</label>
              <Input
                type="number"
                min={2}
                max={24}
                value={splitMonths}
                onChange={(e) => setSplitMonths(e.target.value)}
                placeholder="12"
              />
            </div>
            {splitMonths && selectedIncome && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-semibold mb-1">분할 결과</p>
                <p className="text-sm">
                  월 {(selectedIncome.amount / parseInt(splitMonths)).toLocaleString()}원 × {splitMonths}개월
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSplitDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSplitIncome}>분할하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

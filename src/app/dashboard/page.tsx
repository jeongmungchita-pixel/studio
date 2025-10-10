'use client';

import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Users, Building, Trophy, CalendarCheck, Loader2 } from 'lucide-react';
import type { Member, Club, Competition } from '@/types';

const chartData = [
  { month: '1월', members: 0 },
  { month: '2월', members: 0 },
  { month: '3월', members: 0 },
  { month: '4월', members: 0 },
  { month: '5월', members: 0 },
  { month: '6월', members: 0 },
];

const chartConfig = {
  members: {
    label: "신규 회원",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export default function DashboardPage() {
  const firestore = useFirestore();
  
  const membersCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'members') : null), [firestore]);
  const { data: members, isLoading: isMembersLoading } = useCollection<Member>(membersCollection);

  const clubsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'clubs') : null), [firestore]);
  const { data: clubs, isLoading: isClubsLoading } = useCollection<Club>(clubsCollection);

  const competitionsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'competitions') : null), [firestore]);
  const { data: competitions, isLoading: isCompetitionsLoading } = useCollection<Competition>(competitionsCollection);

  if (isMembersLoading || isClubsLoading || isCompetitionsLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const upcomingCompetitions = competitions?.filter(
    (c) => new Date(c.startDate) > new Date()
  ) || [];

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              총 회원 수
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              -
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활동 중인 클럽</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clubs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              -
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              예정된 대회
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingCompetitions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              -
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              납부 예정 회비
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              -
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>신규 회원 증가 추이</CardTitle>
            <CardDescription>지난 6개월</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis stroke="hsl(var(--muted-foreground))"/>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="members" fill="var(--color-members)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>예정된 대회</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>대회명</TableHead>
                  <TableHead>날짜</TableHead>
                  <TableHead>장소</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingCompetitions.length > 0 ? upcomingCompetitions.map((comp) => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    <TableCell>{new Date(comp.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>{comp.location}</TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={3} className="text-center">예정된 대회가 없습니다.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

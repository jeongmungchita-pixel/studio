'use client';

export const dynamic = 'force-dynamic';
import { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Member, GymClass } from '@/types';
import { UserRole } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, BookMarked, Search, Clock, Users2, User, Baby } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getMemberCategoryLabel, getMemberCategoryColor, calculateAge } from '@/lib/member-utils';

export default function ClubDashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');

    // Query for all members (regular and pending) in the club
    const membersQuery = useMemoFirebase(() => {
        if (!firestore || !user?.clubId) return null;
        return query(collection(firestore, 'members'), where('clubId', '==', user.clubId));
    }, [firestore, user?.clubId]);
    const { data: members, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);
    
    // Query for all classes in the club
    const classesQuery = useMemoFirebase(() => {
        if (!firestore || !user?.clubId) return null;
        return query(collection(firestore, 'classes'), where('clubId', '==', user.clubId));
    }, [firestore, user?.clubId]);
    const { data: gymClasses, isLoading: areClassesLoading } = useCollection<GymClass>(classesQuery);

    
    // Filter members based on their status and search query
    const filteredMembers = useMemo(() => {
        if (!members) return [];
        if (!searchQuery) return members;
        const query = searchQuery.toLowerCase();
        return members.filter(m => 
            m.name.toLowerCase().includes(query) ||
            m.email?.toLowerCase().includes(query) ||
            m.phoneNumber?.includes(query)
        );
    }, [members, searchQuery]);

    const pendingMembers = useMemo(() => filteredMembers.filter(m => m.status === 'pending'), [filteredMembers]);
    const regularMembers = useMemo(() => filteredMembers.filter(m => m.status === 'active' || m.status === 'inactive'), [filteredMembers]);

    // Member statistics by category
    const memberStats = useMemo(() => {
        if (!members) return { total: 0, active: 0, adult: 0, child: 0, adultActive: 0, childActive: 0 };
        
        const stats = {
            total: members.length,
            active: 0,
            adult: 0,
            child: 0,
            adultActive: 0,
            childActive: 0,
        };
        
        members.forEach(member => {
            const memberCategory = member.memberCategory || 
                (calculateAge(member.dateOfBirth) >= 19 ? 'adult' : 'child');
            
            if (member.status === 'active') {
                stats.active++;
                if (memberCategory === 'adult') stats.adultActive++;
                else stats.childActive++;
            }
            
            if (memberCategory === 'adult') stats.adult++;
            else stats.child++;
        });
        
        return stats;
    }, [members]);


    const handleApproval = async (memberId: string, approve: boolean) => {
        if (!firestore) return;

        const memberRef = doc(firestore, 'members', memberId);

        if (!approve) {
            try {
                await deleteDoc(memberRef);
                toast({ title: '요청 거절', description: '가입/갱신 요청이 거절되었습니다.' });
            } catch (error) {
                toast({ variant: 'destructive', title: '오류', description: '요청 거절 중 오류가 발생했습니다.' });
            }
            return;
        }

        // Approve logic
        try {
            const batch = writeBatch(firestore);

            // 1. Update member status to 'active'
            batch.update(memberRef, { status: 'active' });

            // 2. Find the pending pass for this member and activate it
            const passesRef = collection(firestore, 'member_passes');
            const pendingPassQuery = query(passesRef, where('memberId', '==', memberId), where('status', '==', 'pending'));
            
            // Because we don't have getDocs in a batch, we do it before. This is not perfectly transactional.
            const { getDocs } = await import('firebase/firestore');
            const pendingPassSnap = await getDocs(pendingPassQuery);

            if (!pendingPassSnap.empty) {
                const passDoc = pendingPassSnap.docs[0];
                const passRef = doc(firestore, 'member_passes', passDoc.id);
                batch.update(passRef, { 
                    status: 'active',
                    startDate: new Date().toISOString() 
                });
                // 3. Update the member's activePassId
                batch.update(memberRef, { activePassId: passDoc.id });
            }

            await batch.commit();
            toast({ title: '승인 완료', description: '요청이 승인되었습니다.' });

        } catch (error) {
            toast({ variant: 'destructive', title: '오류', description: '승인 처리 중 오류가 발생했습니다.' });
        }
    };
    
     const handleStatusChange = async (memberId: string, newStatus: 'active' | 'inactive') => {
        if (!firestore) return;
        const memberRef = doc(firestore, 'members', memberId);
        try {
            await updateDoc(memberRef, { status: newStatus });
            const message = newStatus === 'active' ? '선수 상태가 활성화되었습니다.' : '선수 상태가 비활성화되었습니다.';
            toast({ title: '상태 업데이트 완료', description: message });
        } catch (error) {
            toast({ variant: 'destructive', title: '오류', description: '상태 업데이트 중 오류가 발생했습니다.' });
        }
    };

    if (isUserLoading || areMembersLoading || areClassesLoading) {
        return (
          <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        );
    }
    
    if (!user || (user.role !== UserRole.CLUB_OWNER && user.role !== UserRole.CLUB_MANAGER)) {
        redirect('/dashboard');
        return null;
    }
    
    const getStatusVariant = (status: Member['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (status) {
        case 'active':
            return 'default';
        case 'pending':
            return 'destructive';
        case 'inactive':
        default:
            return 'secondary';
        }
    };
    
    const statusTranslations: Record<Member['status'], string> = {
      active: '활동중',
      inactive: '비활동',
      pending: '승인 대기',
    };

    const MemberTable = ({ memberList, listType }: { memberList: Member[], listType: 'regular' | 'pending' }) => (
      <Table>
          <TableHeader>
              <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>분류</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>기능</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {memberList.length > 0 ? memberList.map(member => {
                  const memberCategory = member.memberCategory || 
                    (calculateAge(member.dateOfBirth) >= 19 ? 'adult' : 'child');
                  const categoryColors = getMemberCategoryColor(memberCategory);
                  
                  return (
                   <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <Link href={`/members/${member.id}`} className="flex items-center gap-3 hover:underline">
                            <Image
                                src={member.photoURL || `https://picsum.photos/seed/${member.id}/40/40`}
                                alt={member.name}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                                data-ai-hint="person gymnastics"
                            />
                            <div>
                                <div>{member.name}</div>
                                <div className="text-sm text-muted-foreground hidden sm:block">
                                    {new Date(member.dateOfBirth || '').toLocaleDateString()}
                                </div>
                            </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge className={categoryColors.badge}>
                          {memberCategory === 'adult' ? <User className="inline h-3 w-3 mr-1" /> : <Baby className="inline h-3 w-3 mr-1" />}
                          {getMemberCategoryLabel(memberCategory)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                          <Badge variant={getStatusVariant(member.status)}>{statusTranslations[member.status]}</Badge>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell className="space-x-2">
                          {listType === 'regular' && member.status === 'active' && (
                              <Button size="sm" variant="outline" onClick={() => handleStatusChange(member.id, 'inactive')}>비활성화</Button>
                          )}
                          {listType === 'regular' && member.status === 'inactive' && (
                               <Button size="sm" onClick={() => handleStatusChange(member.id, 'active')}>활성화</Button>
                          )}
                           {listType === 'pending' && (
                            <>
                                <Button size="sm" onClick={() => handleApproval(member.id, true)}>승인</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleApproval(member.id, false)}>거절</Button>
                            </>
                          )}
                      </TableCell>
                  </TableRow>
              )}) : <TableRow><TableCell colSpan={5} className="text-center">해당하는 선수가 없습니다.</TableCell></TableRow>}
          </TableBody>
      </Table>
    );

    return (
        <main className="flex-1 p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>클럽 대시보드: {user.clubName}</CardTitle>
                    <CardDescription>
                        {user.displayName} 관리자님, 환영합니다. 클럽의 선수들을 관리하세요.
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">전체 회원</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{memberStats.total}</div>
                        <p className="text-xs text-muted-foreground">
                            활동중 {memberStats.active}명
                        </p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">성인 회원</CardTitle>
                        <User className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{memberStats.adult}</div>
                        <p className="text-xs text-muted-foreground">
                            활동중 {memberStats.adultActive}명 ({memberStats.adult > 0 ? ((memberStats.adultActive / memberStats.adult) * 100).toFixed(0) : 0}%)
                        </p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">주니어 회원</CardTitle>
                        <Baby className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{memberStats.child}</div>
                        <p className="text-xs text-muted-foreground">
                            활동중 {memberStats.childActive}명 ({memberStats.child > 0 ? ((memberStats.childActive / memberStats.child) * 100).toFixed(0) : 0}%)
                        </p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">클래스</CardTitle>
                        <BookMarked className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{gymClasses?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            운영중인 클래스
                        </p>
                    </CardContent>
                </Card>
            </div>

             <Tabs defaultValue="members" className="w-full">
                <TabsList>
                    <TabsTrigger value="members">소속 선수 명단</TabsTrigger>
                    <TabsTrigger value="requests">
                        가입/갱신 요청
                        {pendingMembers.length > 0 && <Badge className="ml-2">{pendingMembers.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="classes">클래스 현황</TabsTrigger>
                </TabsList>
                <TabsContent value="members">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>소속 선수 관리</CardTitle>
                                    <CardDescription>현재 클럽에 소속된 활동중 또는 비활동 상태의 선수 목록입니다.</CardDescription>
                                </div>
                            </div>
                            <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="이름, 이메일, 전화번호로 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                           <MemberTable memberList={regularMembers} listType="regular" />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="requests">
                     <Card>
                        <CardHeader>
                            <CardTitle>가입/갱신 요청 관리</CardTitle>
                            <CardDescription>신규 가입 또는 이용권 갱신을 요청한 선수 목록입니다.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MemberTable memberList={pendingMembers} listType="pending" />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="classes">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {gymClasses?.map((gymClass) => {
                            const enrolledMembers = members?.filter(m => gymClass.memberIds?.includes(m.id)) || [];
                            return (
                                <Card key={gymClass.id}>
                                    <CardHeader>
                                        <CardTitle>{gymClass.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-4">
                                            <span>{gymClass.dayOfWeek}요일</span>
                                            <span className="flex items-center gap-1"><Clock className="w-4 h-4"/>{gymClass.time}</span>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                                            <span className="flex items-center gap-1"><Users2 className="w-4 h-4"/>정원</span>
                                            <span>{enrolledMembers?.length || 0} / {gymClass.capacity}</span>
                                        </div>
                                        <div className="space-y-2">
                                            {enrolledMembers && enrolledMembers.length > 0 ? (
                                                enrolledMembers.map(member => (
                                                    <Link href={`/members/${member.id}`} key={member.id} className="flex items-center gap-2 text-sm p-1 rounded-md bg-secondary/50 hover:bg-secondary">
                                                        <Image src={member.photoURL || `https://picsum.photos/seed/${member.id}/24/24`} alt={member.name} width={24} height={24} className="rounded-full" />
                                                        <span>{member.name}</span>
                                                    </Link>
                                                ))
                                            ) : (
                                                <p className="text-sm text-muted-foreground text-center py-4">등록된 회원이 없습니다.</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                         {(!gymClasses || gymClasses.length === 0) && (
                            <Card className="md:col-span-2 lg:col-span-3">
                                <CardContent className="flex flex-col items-center justify-center h-64">
                                    <p className="text-muted-foreground">생성된 클래스가 없습니다.</p>
                                    <Button variant="link" asChild>
                                        <a href="/club-dashboard/classes">클래스 관리 페이지로 이동</a>
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </main>
    );
}

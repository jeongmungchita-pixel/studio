'use client';

import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { redirect } from 'next/navigation';

export default function ClubDashboardPage() {
    const { user, isUserLoading } = useUser();

    if (isUserLoading) {
        return (
          <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        );
    }
    
    if (!user || user.role !== 'club-admin') {
        // Redirect if not a club admin or not logged in
        redirect('/dashboard');
    }

    return (
        <main className="flex-1 p-6">
            <Card>
                <CardHeader>
                    <CardTitle>클럽 대시보드</CardTitle>
                    <CardDescription>{user.clubName} 관리자님, 환영합니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">클럽 관리 기능이 여기에 표시됩니다.</p>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}

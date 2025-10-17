'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useAuth, useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function FirebaseDebug() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [isVisible, setIsVisible] = useState(false);

  // 개발 환경에서만 표시
  useEffect(() => {
    setIsVisible(process.env.NODE_ENV === 'development');
  }, []);

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-white/95 backdrop-blur-sm border-2 border-blue-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          🔧 Firebase Debug
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0"
          >
            ✕
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span>Firestore:</span>
          <Badge variant={firestore ? 'default' : 'destructive'}>
            {firestore ? '✅ 연결됨' : '❌ 연결 안됨'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Auth:</span>
          <Badge variant={auth ? 'default' : 'destructive'}>
            {auth ? '✅ 연결됨' : '❌ 연결 안됨'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span>User Loading:</span>
          <Badge variant={isUserLoading ? 'secondary' : 'default'}>
            {isUserLoading ? '🔄 로딩 중' : '✅ 완료'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span>User:</span>
          <Badge variant={user ? 'default' : 'destructive'}>
            {user ? '✅ 로그인됨' : '❌ 로그인 안됨'}
          </Badge>
        </div>
        
        {user && (
          <>
            <div className="flex items-center justify-between">
              <span>Club ID:</span>
              <Badge variant={user.clubId ? 'default' : 'destructive'}>
                {user.clubId ? '✅ 있음' : '❌ 없음'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Role:</span>
              <Badge variant="outline">
                {user.role || '미설정'}
              </Badge>
            </div>
          </>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-2"
          onClick={() => {
          }}
        >
          콘솔에 상세 정보 출력
        </Button>
      </CardContent>
    </Card>
  );
}

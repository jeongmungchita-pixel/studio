'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/utils/api-client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, User } from 'lucide-react';
import { useUser } from '@/firebase';
export default function FixFamilyPage() {
  const { _user } = useUser();
  const [parentUserId, setParentUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();
  const handleDryRun = async () => {
    if (!parentUserId) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '부모 User ID를 입력해주세요.',
      });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      // Direct API call without auth for now
      const response = await fetch('/api/admin/utils/fix-family-links-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parentUserId, dryRun: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Request failed');
      }
      setResult(data);
      toast({
        title: 'Dry Run 완료',
        description: `${data.fixes?.length || 0}개 수정 사항 발견`,
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: '실패',
        description: (error as any).message || '오류가 발생했습니다.',
      });
      setResult({ error: (error as any).message });
    } finally {
      setLoading(false);
    }
  };
  const handleApplyFix = async () => {
    if (!parentUserId) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '부모 User ID를 입력해주세요.',
      });
      return;
    }
    if (!confirm('정말로 수정사항을 적용하시겠습니까?')) {
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      // Direct API call without auth for now
      const response = await fetch('/api/admin/utils/fix-family-links-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parentUserId, dryRun: false }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Request failed');
      }
      setResult(data);
      toast({
        title: '수정 완료',
        description: `${data.fixes?.length || 0}개 항목이 수정되었습니다.`,
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: '실패',
        description: (error as any).message || '오류가 발생했습니다.',
      });
      setResult({ error: (error as any).message });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>가족 연결 수정 도구</CardTitle>
          <CardDescription>
            부모-자녀 연결이 제대로 되지 않은 경우 이 도구를 사용하여 수정할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              이 도구는 다음 작업을 수행합니다:
              <ul className="list-disc list-inside mt-2">
                <div>&quot;userId&quot; 필드를 &quot;guardianUserIds&quot; 배열에 추가</div>
                <li>부모 users의 clubId/clubName 필드 추가</li>
                <li>부모-자녀 연결 복구</li>
              </ul>
            </AlertDescription>
          </Alert>
          {_user && (
            <Alert>
              <User className="h-4 w-4" />
              <AlertDescription>
                <strong>현재 로그인:</strong> {_user.email || _user.displayName}
                <br />
                <strong>UID:</strong> {_user.uid}
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-4"
                  onClick={() => setParentUserId(_user.uid)}
                >
                  내 UID 사용
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <div>
            <Label>부모 User ID (Firebase Auth UID)</Label>
            <Input
              placeholder="예: AbCdEfGhIjKlMnOpQrStUvWxYz"
              value={parentUserId}
              onChange={(e) => setParentUserId(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              위의 &quot;내 UID 사용&quot; 버튼을 클릭하거나 직접 입력하세요.
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleDryRun}
              disabled={!parentUserId || loading}
              variant="outline"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Dry Run (미리보기)
            </Button>
            <Button 
              onClick={handleApplyFix}
              disabled={!parentUserId || loading}
              variant="default"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              실제 적용
            </Button>
          </div>
          {result && (
            <div className="mt-6">
              {result.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>오류:</strong> {result.error}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{result.message}</strong>
                    </AlertDescription>
                  </Alert>
                  {result.fixes && result.fixes.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">수정 내역:</h3>
                      <div className="border rounded-lg p-4 bg-muted/50">
                        <pre className="text-sm overflow-auto">
                          {JSON.stringify(result.fixes, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  {result.fixes && result.fixes.length === 0 && (
                    <Alert>
                      <AlertDescription>
                        수정할 항목이 없습니다. 이미 올바르게 연결되어 있습니다.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>사용 방법</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ol className="list-decimal list-inside space-y-2">
            <li>브라우저 개발자 도구 (F12) 열기</li>
            <li>Console 탭에서 다음 입력: <code className="bg-muted px-1 py-0.5 rounded">firebase.auth().currentUser.uid</code></li>
            <li>출력된 UID를 위 입력란에 붙여넣기</li>
            <li>&quot;Dry Run&quot;으로 먼저 확인</li>
            <li>문제없으면 &quot;실제 적용&quot; 클릭</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

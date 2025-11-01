'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/utils/api-client';
export default function TestAPIPage() {
  const [requestId, setRequestId] = useState('');
  const [requestType, setRequestType] = useState<'adult' | 'family' | 'member'>('adult');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      let response;
      switch (requestType) {
        case 'adult':
          response = await adminAPI.approvals.approveAdult(requestId);
          break;
        case 'family':
          response = await adminAPI.approvals.approveFamily(requestId);
          break;
        case 'member':
          response = await adminAPI.approvals.approveMember(requestId);
          break;
      }
      setResult(response);
      toast({
        title: '성공',
        description: response.message || '승인이 완료되었습니다.',
      });
    } catch (err: unknown) {
      setError((err as any).message || (err as any).toString());
      toast({
        variant: 'destructive',
        title: '실패',
        description: (err as any).message || '오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Admin API Test</h1>
      <Card>
        <CardHeader>
          <CardTitle>승인 API 테스트</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Request Type</Label>
            <select
              className="w-full p-2 border rounded"
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as any)}
            >
              <option value="adult">Adult</option>
              <option value="family">Family</option>
              <option value="member">Member</option>
            </select>
          </div>
          <div>
            <Label>Request ID</Label>
            <Input
              placeholder="Enter request ID"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleTest}
            disabled={!requestId || loading}
          >
            {loading ? 'Processing...' : 'Test Approval'}
          </Button>
          {result && (
            <div className="mt-4 p-4 bg-green-50 rounded">
              <h3 className="font-bold text-green-800">Success Result:</h3>
              <pre className="text-sm mt-2">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded">
              <h3 className="font-bold text-red-800">Error:</h3>
              <pre className="text-sm mt-2">{error}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

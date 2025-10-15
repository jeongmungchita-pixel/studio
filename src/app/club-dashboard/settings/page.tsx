'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { ClubBankAccount, NaverCloudConfig } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, CreditCard, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ClubSettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Bank Account State
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [isSavingBank, setIsSavingBank] = useState(false);

  // Naver Cloud State
  const [serviceId, setServiceId] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [kakaoSenderId, setKakaoSenderId] = useState('');
  const [isSavingNaver, setIsSavingNaver] = useState(false);

  // Fetch bank account
  const bankAccountRef = useMemoFirebase(
    () => (firestore && user?.clubId ? doc(firestore, 'club_bank_accounts', user.clubId) : null),
    [firestore, user?.clubId]
  );
  const { data: bankAccount } = useDoc<ClubBankAccount>(bankAccountRef);

  // Fetch naver cloud config
  const naverConfigRef = useMemoFirebase(
    () => (firestore && user?.clubId ? doc(firestore, 'naver_cloud_configs', user.clubId) : null),
    [firestore, user?.clubId]
  );
  const { data: naverConfig } = useDoc<NaverCloudConfig>(naverConfigRef);

  // Load data
  useEffect(() => {
    if (bankAccount) {
      setBankName(bankAccount.bankName);
      setAccountNumber(bankAccount.accountNumber);
      setAccountHolder(bankAccount.accountHolder);
    }
  }, [bankAccount]);

  useEffect(() => {
    if (naverConfig) {
      setServiceId(naverConfig.serviceId);
      setAccessKey(naverConfig.accessKey);
      setSecretKey(naverConfig.secretKey);
      setSenderPhone(naverConfig.senderPhone);
      setKakaoSenderId(naverConfig.kakaoSenderId || '');
    }
  }, [naverConfig]);

  const handleSaveBankAccount = async () => {
    if (!firestore || !user?.clubId || !bankName || !accountNumber || !accountHolder) {
      toast({ variant: 'destructive', title: '모든 필드를 입력하세요' });
      return;
    }

    setIsSavingBank(true);
    try {
      const accountData: ClubBankAccount = {
        clubId: user.clubId,
        bankName,
        accountNumber,
        accountHolder,
        isActive: true,
        createdAt: bankAccount?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(firestore, 'club_bank_accounts', user.clubId), accountData);

      toast({ title: '계좌 정보 저장 완료' });
    } catch (error) {
      console.error('Bank account save error:', error);
      toast({ variant: 'destructive', title: '저장 실패' });
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleSaveNaverConfig = async () => {
    if (!firestore || !user?.clubId || !serviceId || !accessKey || !secretKey || !senderPhone) {
      toast({ variant: 'destructive', title: '필수 필드를 입력하세요' });
      return;
    }

    setIsSavingNaver(true);
    try {
      const configData: NaverCloudConfig = {
        clubId: user.clubId,
        serviceId,
        accessKey,
        secretKey,
        senderPhone,
        kakaoSenderId: kakaoSenderId || undefined,
        isActive: true,
        createdAt: naverConfig?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(firestore, 'naver_cloud_configs', user.clubId), configData);

      toast({ title: '네이버 클라우드 설정 저장 완료' });
    } catch (error) {
      console.error('Naver config save error:', error);
      toast({ variant: 'destructive', title: '저장 실패' });
    } finally {
      setIsSavingNaver(false);
    }
  };

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">클럽 설정</h1>
        <p className="text-muted-foreground mt-1">계좌 정보 및 문자 발송 설정</p>
      </div>

      <Tabs defaultValue="bank" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bank">계좌 정보</TabsTrigger>
          <TabsTrigger value="message">문자 발송 설정</TabsTrigger>
        </TabsList>

        {/* Bank Account Tab */}
        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                계좌 정보
              </CardTitle>
              <CardDescription>
                회원들이 이용권 갱신 시 입금할 계좌 정보를 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">은행명</Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="예: 국민은행"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">계좌번호</Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="예: 123-456-789012"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountHolder">예금주</Label>
                <Input
                  id="accountHolder"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="예: 홍길동"
                />
              </div>

              {bankAccount && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-semibold mb-2">현재 등록된 계좌</p>
                  <p className="text-sm">{bankAccount.bankName} {bankAccount.accountNumber}</p>
                  <p className="text-sm text-muted-foreground">예금주: {bankAccount.accountHolder}</p>
                </div>
              )}

              <Button onClick={handleSaveBankAccount} disabled={isSavingBank} className="w-full">
                {isSavingBank ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    계좌 정보 저장
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Naver Cloud Tab */}
        <TabsContent value="message">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                네이버 클라우드 플랫폼 설정
              </CardTitle>
              <CardDescription>
                SMS/LMS/알림톡 발송을 위한 네이버 클라우드 플랫폼 정보를 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">📌 설정 방법</p>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>네이버 클라우드 플랫폼 콘솔 접속</li>
                  <li>Simple & Easy Notification Service 선택</li>
                  <li>프로젝트 생성 후 Service ID 확인</li>
                  <li>API 인증키 생성 (Access Key, Secret Key)</li>
                  <li>발신번호 등록 및 승인</li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceId">Service ID *</Label>
                <Input
                  id="serviceId"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  placeholder="ncp:sms:kr:..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessKey">Access Key *</Label>
                <Input
                  id="accessKey"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="Access Key"
                  type="password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secretKey">Secret Key *</Label>
                <Input
                  id="secretKey"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Secret Key"
                  type="password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senderPhone">발신번호 *</Label>
                <Input
                  id="senderPhone"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="01012345678 (하이픈 없이)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kakaoSenderId">카카오 발신프로필 키 (선택)</Label>
                <Input
                  id="kakaoSenderId"
                  value={kakaoSenderId}
                  onChange={(e) => setKakaoSenderId(e.target.value)}
                  placeholder="알림톡 사용 시 입력"
                />
              </div>

              {naverConfig && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-semibold text-green-900 mb-1">✅ 설정 완료</p>
                  <p className="text-sm text-green-800">
                    발신번호: {naverConfig.senderPhone}
                  </p>
                  {naverConfig.kakaoSenderId && (
                    <p className="text-sm text-green-800">
                      알림톡: 설정됨
                    </p>
                  )}
                </div>
              )}

              <Button onClick={handleSaveNaverConfig} disabled={isSavingNaver} className="w-full">
                {isSavingNaver ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    네이버 클라우드 설정 저장
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

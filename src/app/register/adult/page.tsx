'use client';

export const dynamic = 'force-dynamic';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { User, PenTool, CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { Club, AdultRegistrationRequest } from '@/types';

interface FormData {
  clubId: string;
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  phoneNumber: string;
  email: string;
  agreePersonalInfo: boolean;
  agreeTerms: boolean;
  agreeSafety: boolean;
  agreePortrait: boolean;
  signature: string | null;
}

export default function AdultRegisterPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const signatureRef = useRef<SignatureCanvas>(null);
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    clubId: '',
    name: '',
    birthDate: '',
    gender: 'male',
    phoneNumber: '',
    email: '',
    agreePersonalInfo: false,
    agreeTerms: false,
    agreeSafety: false,
    agreePortrait: false,
    signature: null,
  });

  // 클럽 목록 조회
  const clubsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clubs') : null),
    [firestore]
  );
  const { data: clubs, isLoading: isClubsLoading } = useCollection<Club>(clubsCollection);

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev } as FormData;
      if (
        field === 'agreePersonalInfo' ||
        field === 'agreeTerms' ||
        field === 'agreeSafety' ||
        field === 'agreePortrait'
      ) {
        (updated as any)[field] = value === true;
      } else {
        (updated as any)[field] = value as never;
      }
      return updated;
    });
  };

  const handleAgreeAll = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      agreePersonalInfo: checked,
      agreeTerms: checked,
      agreeSafety: checked,
      agreePortrait: checked,
    }));
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
    updateFormData('signature', null);
  };

  const saveSignature = () => {
    if (signatureRef.current?.isEmpty()) {
      toast({
        variant: 'destructive',
        title: '서명 필요',
        description: '서명을 작성해주세요.',
      });
      return false;
    }
    
    const signatureData = signatureRef.current?.toDataURL() ?? null;
    updateFormData('signature', signatureData);
    return true;
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1: // 클럽 선택
        if (!formData.clubId) {
          toast({
            variant: 'destructive',
            title: '클럽 선택 필요',
            description: '가입할 체육관을 선택해주세요.',
          });
          return false;
        }
        return true;
        
      case 2: // 기본 정보
        if (!formData.name || !formData.birthDate || !formData.phoneNumber) {
          toast({
            variant: 'destructive',
            title: '필수 정보 누락',
            description: '모든 필수 항목을 입력해주세요.',
          });
          return false;
        }
        
        // 19세 이상 확인
        const birthDate = new Date(formData.birthDate);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 19) {
          toast({
            variant: 'destructive',
            title: '연령 제한',
            description: '성인 회원은 19세 이상만 가입 가능합니다. 가족 회원으로 가입해주세요.',
          });
          return false;
        }
        return true;
        
      case 3: // 약관 동의
        if (!formData.agreePersonalInfo || !formData.agreeTerms || !formData.agreeSafety) {
          toast({
            variant: 'destructive',
            title: '약관 동의 필요',
            description: '필수 약관에 모두 동의해주세요.',
          });
          return false;
        }
        return true;
        
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step === 4) {
        if (saveSignature()) {
          handleSubmit();
        }
      } else {
        setStep(step + 1);
      }
    }
  };

  const handlePrev = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const selectedClub = clubs?.find(c => c.id === formData.clubId);
      if (!selectedClub) {
        throw new Error('클럽을 찾을 수 없습니다.');
      }

      const requestData: Omit<AdultRegistrationRequest, 'id'> = {
        clubId: formData.clubId,
        clubName: selectedClub.name,
        requestType: 'adult',
        name: formData.name,
        birthDate: formData.birthDate,
        gender: formData.gender,
        phoneNumber: formData.phoneNumber,
        email: formData.email || undefined,
        agreements: {
          personal: formData.agreePersonalInfo,
          terms: formData.agreeTerms,
          safety: formData.agreeSafety,
          portrait: formData.agreePortrait,
          agreedAt: new Date().toISOString(),
        },
        signature: formData.signature!,
        signedAt: new Date().toISOString(),
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };

      await addDoc(collection(firestore, 'adultRegistrationRequests'), requestData);
      
      toast({
        title: '가입 신청 완료',
        description: '클럽의 승인을 기다려주세요. 승인 완료 시 연락드리겠습니다.',
      });
      
      router.push('/register/success');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '가입 신청에 실패했습니다. 다시 시도해주세요.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isClubsLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">성인 회원 가입</CardTitle>
              <CardDescription>
                Step {step} / 4
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: 클럽 선택 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="club">가입할 체육관 선택 *</Label>
                <Select value={formData.clubId} onValueChange={(value) => updateFormData('clubId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="체육관을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs && clubs.length > 0 ? (
                      clubs.map((club) => (
                        <SelectItem key={club.id} value={club.id}>
                          {club.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        등록된 체육관이 없습니다
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: 기본 정보 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="홍길동"
                />
              </div>
              
              <div>
                <Label htmlFor="birthDate">생년월일 *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => updateFormData('birthDate', e.target.value)}
                />
              </div>
              
              <div>
                <Label>성별 *</Label>
                <RadioGroup value={formData.gender} onValueChange={(value) => updateFormData('gender', value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="cursor-pointer">남성</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="cursor-pointer">여성</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label htmlFor="phoneNumber">연락처 *</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                  placeholder="010-1234-5678"
                />
              </div>
              
              <div>
                <Label htmlFor="email">이메일 (선택)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="example@email.com"
                />
              </div>
            </div>
          )}

          {/* Step 3: 약관 동의 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="all" 
                  checked={formData.agreePersonalInfo && formData.agreeTerms && formData.agreeSafety && formData.agreePortrait}
                  onCheckedChange={handleAgreeAll}
                />
                <Label htmlFor="all" className="font-semibold cursor-pointer">
                  전체 동의
                </Label>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="personal" 
                    checked={formData.agreePersonalInfo}
                    onCheckedChange={(checked) => updateFormData('agreePersonalInfo', checked)}
                  />
                  <Label htmlFor="personal" className="cursor-pointer">
                    개인정보 수집 및 이용 동의 (필수)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="terms" 
                    checked={formData.agreeTerms}
                    onCheckedChange={(checked) => updateFormData('agreeTerms', checked)}
                  />
                  <Label htmlFor="terms" className="cursor-pointer">
                    체육시설 이용 약관 동의 (필수)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="safety" 
                    checked={formData.agreeSafety}
                    onCheckedChange={(checked) => updateFormData('agreeSafety', checked)}
                  />
                  <Label htmlFor="safety" className="cursor-pointer">
                    안전사고 면책 동의 (필수)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="portrait" 
                    checked={formData.agreePortrait}
                    onCheckedChange={(checked) => updateFormData('agreePortrait', checked)}
                  />
                  <Label htmlFor="portrait" className="cursor-pointer">
                    초상권 활용 동의 (선택)
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: 서명 */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <PenTool className="h-4 w-4" />
                  본인 서명
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4 bg-white">
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      className: 'w-full h-40 border rounded',
                    }}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={clearSignature}>
                    다시 작성
                  </Button>
                </div>
              </div>
              
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>가입 신청 준비 완료</AlertTitle>
                <AlertDescription>
                  제출 버튼을 누르면 클럽에 가입 신청이 전송됩니다.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* 네비게이션 버튼 */}
          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={isSubmitting}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                이전
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : step === 4 ? (
                '제출'
              ) : (
                <>
                  다음
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

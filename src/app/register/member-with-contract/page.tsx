'use client';
import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PenTool, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
type GuardianRelation = 'parent' | 'grandparent' | 'legal_guardian' | 'other';
const relationLabels: Record<GuardianRelation, string> = {
  parent: '부모',
  grandparent: '조부모',
  legal_guardian: '법정대리인',
  other: '기타',
};
interface MemberFormData {
  // 회원 정보
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  phoneNumber: string;
  // 보호자 정보 (미성년자)
  isMinor: boolean;
  guardianName: string;
  guardianPhone: string;
  guardianRelation: GuardianRelation;
  // 동의 항목
  agreePersonalInfo: boolean;
  agreeTerms: boolean;
  agreeSafety: boolean;
  agreePortrait: boolean;
  // 서명
  signature: string | null;
}
export default function MemberWithContractPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clubId = searchParams.get('clubId');
  const clubName = searchParams.get('clubName');
  const firestore = useFirestore();
  const { toast } = useToast();
  const signatureRef = useRef<SignatureCanvas>(null);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<MemberFormData>({
    name: '',
    birthDate: '',
    gender: 'male',
    phoneNumber: '',
    isMinor: false,
    guardianName: '',
    guardianPhone: '',
    guardianRelation: 'parent',
    agreePersonalInfo: false,
    agreeTerms: false,
    agreeSafety: false,
    agreePortrait: false,
    signature: null,
  });
  // 생년월일로 미성년자 자동 판단
  const checkIfMinor = (birthDate: string) => {
    if (!birthDate) return false;
    const _today = new Date();
    const birth = new Date(birthDate);
    const age = _today.getFullYear() - birth.getFullYear();
    return age < 19;
  };
  const updateFormData = (field: keyof MemberFormData, value: string | boolean | null) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value } as MemberFormData;
      // 생년월일 변경 시 미성년자 자동 판단
      if (field === 'birthDate') {
        updated.isMinor = typeof value === 'string' ? checkIfMinor(value) : false;
      }
      return updated;
    });
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
    const signatureData = signatureRef.current?.toDataURL();
    updateFormData('signature', signatureData || '');
    return true;
  };
  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1: // 회원 기본 정보
        if (!formData.name || !formData.birthDate || !formData.phoneNumber) {
          toast({
            variant: 'destructive',
            title: '필수 정보 누락',
            description: '모든 필수 항목을 입력해주세요.',
          });
          return false;
        }
        return true;
      case 2: // 보호자 정보
        if (formData.isMinor) {
          if (!formData.guardianName || !formData.guardianPhone) {
            toast({
              variant: 'destructive',
              title: '보호자 정보 필요',
              description: '미성년자는 보호자 정보가 필수입니다.',
            });
            return false;
          }
        }
        return true;
      case 3: // 계약서 동의
        if (!formData.agreePersonalInfo || !formData.agreeTerms || 
            !formData.agreeSafety || !formData.agreePortrait) {
          toast({
            variant: 'destructive',
            title: '동의 필요',
            description: '모든 약관에 동의해주세요.',
          });
          return false;
        }
        return true;
      case 4: // 서명
        return saveSignature();
      default:
        return true;
    }
  };
  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };
  const prevStep = () => {
    setStep(step - 1);
  };
  const handleSubmit = async () => {
    if (!firestore || !clubId) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '클럽 정보가 없습니다.',
      });
      return;
    }
    if (!validateStep(4)) return;
    setIsSubmitting(true);
    try {
      // 회원 가입 신청 데이터 생성
      await addDoc(collection(firestore, 'memberRegistrationRequests'), {
        // 회원 정보
        name: formData.name,
        birthDate: formData.birthDate,
        gender: formData.gender,
        phoneNumber: formData.phoneNumber,
        // 클럽 정보
        clubId,
        clubName,
        // 보호자 정보
        isMinor: formData.isMinor,
        guardianName: formData.isMinor ? formData.guardianName : null,
        guardianPhone: formData.isMinor ? formData.guardianPhone : null,
        guardianRelation: formData.isMinor ? formData.guardianRelation : null,
        // 동의 정보
        agreements: {
          personalInfo: formData.agreePersonalInfo,
          terms: formData.agreeTerms,
          safety: formData.agreeSafety,
          portrait: formData.agreePortrait,
          agreedAt: new Date().toISOString(),
        },
        // 서명
        signature: formData.signature,
        signedAt: new Date().toISOString(),
        // 상태
        status: 'pending',
        requestedAt: new Date().toISOString(),
      });
      toast({
        title: '가입 신청 완료!',
        description: '클럽 관리자의 승인을 기다려주세요.',
      });
      // 완료 페이지로 이동
      router.push('/register/success');
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '가입 신청 중 오류가 발생했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  if (!clubId || !clubName) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <Card>
          <CardContent className="py-12">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-center text-muted-foreground">
              클럽 정보가 없습니다.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }
  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-2 w-12 rounded-full ${
                    s <= step ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {step}/4 단계
            </span>
          </div>
          <CardTitle className="text-2xl">
            {step === 1 && '회원 정보 입력'}
            {step === 2 && '보호자 정보 입력'}
            {step === 3 && '계약서 확인 및 동의'}
            {step === 4 && '전자 서명'}
          </CardTitle>
          <CardDescription>
            {clubName} 회원 가입 신청
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: 회원 기본 정보 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>이름 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="홍길동"
                />
              </div>
              <div className="space-y-2">
                <Label>생년월일 *</Label>
                <Input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => updateFormData('birthDate', e.target.value)}
                />
                {formData.birthDate && formData.isMinor && (
                  <p className="text-sm text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    미성년자입니다. 보호자 정보가 필요합니다.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>성별 *</Label>
                <RadioGroup
                  value={formData.gender}
                  onValueChange={(value) => updateFormData('gender', value)}
                >
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="male" />
                      <Label htmlFor="male">남성</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="female" />
                      <Label htmlFor="female">여성</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>전화번호 *</Label>
                <Input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                  placeholder="010-1234-5678"
                />
              </div>
            </div>
          )}
          {/* Step 2: 보호자 정보 */}
          {step === 2 && (
            <div className="space-y-4">
              {formData.isMinor ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <strong>미성년자 회원</strong><br />
                        법정대리인(보호자)의 정보가 필요합니다.
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>보호자 관계 *</Label>
                    <RadioGroup
                      value={formData.guardianRelation}
                      onValueChange={(value) => updateFormData('guardianRelation', value as GuardianRelation)}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(relationLabels).map(([value, label]) => (
                          <div key={value} className="flex items-center space-x-2">
                            <RadioGroupItem value={value} id={`relation-${value}`} />
                            <Label htmlFor={`relation-${value}`}>{label}</Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label>보호자 이름 *</Label>
                    <Input
                      value={formData.guardianName}
                      onChange={(e) => updateFormData('guardianName', e.target.value)}
                      placeholder="홍길동"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>보호자 전화번호 *</Label>
                    <Input
                      type="tel"
                      value={formData.guardianPhone}
                      onChange={(e) => updateFormData('guardianPhone', e.target.value)}
                      placeholder="010-1234-5678"
                    />
                  </div>
                </>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <p className="text-blue-800">
                    성인 회원이므로 보호자 정보가 필요하지 않습니다.
                  </p>
                </div>
              )}
            </div>
          )}
          {/* Step 3: 계약서 동의 */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-slate-50 border rounded-lg p-4 max-h-96 overflow-y-auto">
                <h3 className="font-semibold mb-4">개인정보 수집 및 이용 동의</h3>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p>1. 수집하는 개인정보 항목: 이름, 생년월일, 성별, 전화번호, 보호자 정보(미성년자)</p>
                  <p>2. 수집 및 이용 목적: 회원 관리, 출석 관리, 수업 운영</p>
                  <p>3. 보유 및 이용 기간: 회원 탈퇴 시까지</p>
                </div>
                <Separator className="my-4" />
                <h3 className="font-semibold mb-4">체육시설 이용 약관</h3>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p>1. 시설 이용 시 안전 수칙을 준수해야 합니다.</p>
                  <p>2. 시설 내 안전사고에 대한 책임은 회원 본인에게 있습니다.</p>
                  <p>3. 타인에게 피해를 주는 행위를 금지합니다.</p>
                </div>
                <Separator className="my-4" />
                <h3 className="font-semibold mb-4">안전사고 면책 동의</h3>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p>체육활동 중 발생할 수 있는 안전사고에 대해 클럽은 고의 또는 중과실이 없는 한 책임을 지지 않습니다.</p>
                </div>
                <Separator className="my-4" />
                <h3 className="font-semibold mb-4">초상권 활용 동의</h3>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p>수업 및 행사 중 촬영된 사진/영상을 클럽 홍보 목적으로 사용하는 것에 동의합니다.</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="agree-personal"
                    checked={formData.agreePersonalInfo}
                    onCheckedChange={(checked) => updateFormData('agreePersonalInfo', checked)}
                  />
                  <Label htmlFor="agree-personal" className="cursor-pointer">
                    개인정보 수집 및 이용에 동의합니다 *
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="agree-terms"
                    checked={formData.agreeTerms}
                    onCheckedChange={(checked) => updateFormData('agreeTerms', checked)}
                  />
                  <Label htmlFor="agree-terms" className="cursor-pointer">
                    체육시설 이용 약관에 동의합니다 *
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="agree-safety"
                    checked={formData.agreeSafety}
                    onCheckedChange={(checked) => updateFormData('agreeSafety', checked)}
                  />
                  <Label htmlFor="agree-safety" className="cursor-pointer">
                    안전사고 면책에 동의합니다 *
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="agree-portrait"
                    checked={formData.agreePortrait}
                    onCheckedChange={(checked) => updateFormData('agreePortrait', checked)}
                  />
                  <Label htmlFor="agree-portrait" className="cursor-pointer">
                    초상권 활용에 동의합니다 *
                  </Label>
                </div>
              </div>
            </div>
          )}
          {/* Step 4: 전자 서명 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <PenTool className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>서명 안내</strong><br />
                    아래 서명란에 {formData.isMinor ? '보호자' : '본인'}의 서명을 작성해주세요.
                  </div>
                </div>
              </div>
              <div className="border-2 border-dashed rounded-lg p-4">
                <Label className="mb-2 block">
                  {formData.isMinor ? '보호자 서명' : '본인 서명'} *
                </Label>
                <div className="border-2 border-gray-300 rounded-lg bg-white">
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      className: 'w-full h-48',
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  className="mt-2"
                >
                  다시 작성
                </Button>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  서명 완료 후 &quot;가입 신청&quot; 버튼을 클릭하면 클럽 관리자에게 승인 요청이 전송됩니다.
                </p>
              </div>
            </div>
          )}
          {/* 네비게이션 버튼 */}
          <div className="flex gap-2 pt-4">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="flex-1"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                이전
              </Button>
            )}
            {step < 4 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="flex-1"
              >
                다음
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? '제출 중...' : '가입 신청'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

'use client';

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
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, Plus, Trash2, PenTool, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, Loader2, Info, User, Baby
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import type { Club, FamilyRegistrationRequest } from '@/types';

interface ParentData {
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  phoneNumber: string;
  email: string;
}

interface ChildData {
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  grade: string;
}

interface ExternalGuardianData {
  name: string;
  phoneNumber: string;
  relation: 'parent' | 'grandparent' | 'legal_guardian' | 'other';
}

export default function FamilyRegisterPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const signatureRef = useRef<SignatureCanvas>(null);
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clubId, setClubId] = useState('');
  const [parents, setParents] = useState<ParentData[]>([]);
  const [children, setChildren] = useState<ChildData[]>([]);
  const [externalGuardian, setExternalGuardian] = useState<ExternalGuardianData>({
    name: '',
    phoneNumber: '',
    relation: 'parent',
  });
  const [agreements, setAgreements] = useState({
    personal: false,
    terms: false,
    safety: false,
    portrait: false,
  });
  const [signature, setSignature] = useState<string | null>(null);

  const clubsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'clubs') : null),
    [firestore]
  );
  const { data: clubs, isLoading: isClubsLoading } = useCollection<Club>(clubsCollection);

  const addParent = () => {
    if (parents.length < 2) {
      setParents([...parents, { name: '', birthDate: '', gender: 'male', phoneNumber: '', email: '' }]);
    }
  };

  const removeParent = (index: number) => setParents(parents.filter((_, i) => i !== index));
  const updateParent = (index: number, field: keyof ParentData, value: any) => {
    const updated = [...parents];
    updated[index] = { ...updated[index], [field]: value };
    setParents(updated);
  };

  const addChild = () => {
    setChildren([...children, { name: '', birthDate: '', gender: 'male', grade: '' }]);
  };

  const removeChild = (index: number) => setChildren(children.filter((_, i) => i !== index));
  const updateChild = (index: number, field: keyof ChildData, value: any) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const handleAgreeAll = (checked: boolean) => {
    setAgreements({ personal: checked, terms: checked, safety: checked, portrait: checked });
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
    setSignature(null);
  };

  const saveSignature = () => {
    if (signatureRef.current?.isEmpty()) {
      toast({ variant: 'destructive', title: '서명 필요', description: '서명을 작성해주세요.' });
      return false;
    }
    setSignature(signatureRef.current?.toDataURL());
    return true;
  };

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1 && !clubId) {
      toast({ variant: 'destructive', title: '클럽 선택 필요', description: '가입할 체육관을 선택해주세요.' });
      return false;
    }
    
    if (currentStep === 2) {
      if (parents.length === 0 && children.length === 0) {
        toast({ variant: 'destructive', title: '회원 추가 필요', description: '최소 1명 이상의 가족 구성원을 추가해주세요.' });
        return false;
      }
      
      for (let i = 0; i < parents.length; i++) {
        const parent = parents[i];
        if (!parent.name || !parent.birthDate || !parent.phoneNumber) {
          toast({ variant: 'destructive', title: '부모 정보 누락', description: `부모 ${i + 1}의 필수 정보를 모두 입력해주세요.` });
          return false;
        }
      }
      
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (!child.name || !child.birthDate) {
          toast({ variant: 'destructive', title: '자녀 정보 누락', description: `자녀 ${i + 1}의 필수 정보를 모두 입력해주세요.` });
          return false;
        }
      }
      
      if (parents.length === 0 && children.length > 0) {
        if (!externalGuardian.name || !externalGuardian.phoneNumber) {
          toast({ variant: 'destructive', title: '보호자 정보 필요', description: '자녀만 등록하는 경우 보호자 정보가 필수입니다.' });
          return false;
        }
      }
    }
    
    if (currentStep === 3 && (!agreements.personal || !agreements.terms || !agreements.safety)) {
      toast({ variant: 'destructive', title: '약관 동의 필요', description: '필수 약관에 모두 동의해주세요.' });
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step === 4) {
        if (saveSignature()) handleSubmit();
      } else {
        setStep(step + 1);
      }
    }
  };

  const handlePrev = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const selectedClub = clubs?.find(c => c.id === clubId);
      if (!selectedClub) throw new Error('클럽을 찾을 수 없습니다.');

      const requestData: Omit<FamilyRegistrationRequest, 'id'> = {
        clubId,
        clubName: selectedClub.name,
        requestType: 'family',
        parents: parents.map(p => ({
          name: p.name,
          birthDate: p.birthDate,
          gender: p.gender,
          phoneNumber: p.phoneNumber,
          email: p.email || undefined,
        })),
        children: children.map(c => ({
          name: c.name,
          birthDate: c.birthDate,
          gender: c.gender,
          grade: c.grade || undefined,
        })),
        externalGuardian: parents.length === 0 && children.length > 0 ? externalGuardian : undefined,
        agreements: {
          personal: agreements.personal,
          terms: agreements.terms,
          safety: agreements.safety,
          portrait: agreements.portrait,
          agreedAt: new Date().toISOString(),
        },
        signature: signature!,
        signedAt: new Date().toISOString(),
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };

      await addDoc(collection(firestore, 'familyRegistrationRequests'), requestData);
      
      const message = [];
      if (parents.length > 0) message.push(`부모 ${parents.length}명`);
      if (children.length > 0) message.push(`자녀 ${children.length}명`);
      
      toast({
        title: '가입 신청 완료',
        description: `${message.join(' + ')} 가입 신청이 완료되었습니다. 클럽의 승인을 기다려주세요.`,
      });
      
      router.push('/register/success');
    } catch (error) {
      console.error('가입 신청 실패:', error);
      toast({ variant: 'destructive', title: '오류 발생', description: '가입 신청에 실패했습니다. 다시 시도해주세요.' });
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
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">가족 회원 가입</CardTitle>
              <CardDescription>Step {step} / 4</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: 클럽 선택 */}
          {step === 1 && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>가족 회원이란?</AlertTitle>
                <AlertDescription>
                  부모와 자녀를 함께 등록하거나, 부모만, 자녀만 등록할 수 있습니다.
                  가족 단위로 관리되며 할인 혜택을 받을 수 있습니다.
                </AlertDescription>
              </Alert>
              
              <div>
                <Label htmlFor="club">가입할 체육관 선택 *</Label>
                <Select value={clubId} onValueChange={setClubId}>
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
                      <SelectItem value="none" disabled>등록된 체육관이 없습니다</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: 가족 구성원 추가 */}
          {step === 2 && (
            <div className="space-y-6">
              {/* 부모 섹션 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">부모 (선택)</h3>
                    <Badge variant="outline">{parents.length}/2명</Badge>
                  </div>
                  {parents.length < 2 && (
                    <Button variant="outline" size="sm" onClick={addParent}>
                      <Plus className="h-4 w-4 mr-1" />
                      부모 추가
                    </Button>
                  )}
                </div>
                
                {parents.length === 0 && (
                  <Alert>
                    <AlertDescription>
                      부모를 추가하지 않으면 자녀만 등록됩니다. 이 경우 보호자 정보를 입력해야 합니다.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-4">
                  {parents.map((parent, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">부모 {index + 1}</CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => removeParent(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <Label>이름 *</Label>
                            <Input
                              value={parent.name}
                              onChange={(e) => updateParent(index, 'name', e.target.value)}
                              placeholder="홍길동"
                            />
                          </div>
                          <div>
                            <Label>생년월일 *</Label>
                            <Input
                              type="date"
                              value={parent.birthDate}
                              onChange={(e) => updateParent(index, 'birthDate', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>성별 *</Label>
                            <RadioGroup 
                              value={parent.gender}
                              onValueChange={(val) => updateParent(index, 'gender', val)}
                            >
                              <div className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="male" id={`parent-${index}-male`} />
                                  <Label htmlFor={`parent-${index}-male`}>남성</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="female" id={`parent-${index}-female`} />
                                  <Label htmlFor={`parent-${index}-female`}>여성</Label>
                                </div>
                              </div>
                            </RadioGroup>
                          </div>
                          <div>
                            <Label>연락처 *</Label>
                            <Input
                              type="tel"
                              value={parent.phoneNumber}
                              onChange={(e) => updateParent(index, 'phoneNumber', e.target.value)}
                              placeholder="010-1234-5678"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>이메일 (선택)</Label>
                            <Input
                              type="email"
                              value={parent.email}
                              onChange={(e) => updateParent(index, 'email', e.target.value)}
                              placeholder="example@email.com"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 자녀 섹션 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Baby className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">자녀 (선택)</h3>
                    <Badge variant="outline">{children.length}명</Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={addChild}>
                    <Plus className="h-4 w-4 mr-1" />
                    자녀 추가
                  </Button>
                </div>
                
                {children.length === 0 && (
                  <Alert>
                    <AlertDescription>
                      자녀를 추가하지 않으면 부모만 등록됩니다.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-4">
                  {children.map((child, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">자녀 {index + 1}</CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => removeChild(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <Label>이름 *</Label>
                            <Input
                              value={child.name}
                              onChange={(e) => updateChild(index, 'name', e.target.value)}
                              placeholder="홍아이"
                            />
                          </div>
                          <div>
                            <Label>생년월일 *</Label>
                            <Input
                              type="date"
                              value={child.birthDate}
                              onChange={(e) => updateChild(index, 'birthDate', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>성별 *</Label>
                            <RadioGroup 
                              value={child.gender}
                              onValueChange={(val) => updateChild(index, 'gender', val)}
                            >
                              <div className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="male" id={`child-${index}-male`} />
                                  <Label htmlFor={`child-${index}-male`}>남성</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="female" id={`child-${index}-female`} />
                                  <Label htmlFor={`child-${index}-female`}>여성</Label>
                                </div>
                              </div>
                            </RadioGroup>
                          </div>
                          <div>
                            <Label>학년 (선택)</Label>
                            <Select 
                              value={child.grade}
                              onValueChange={(val) => updateChild(index, 'grade', val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="학년 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kindergarten">유치원</SelectItem>
                                <SelectItem value="elementary-1">초등 1학년</SelectItem>
                                <SelectItem value="elementary-2">초등 2학년</SelectItem>
                                <SelectItem value="elementary-3">초등 3학년</SelectItem>
                                <SelectItem value="elementary-4">초등 4학년</SelectItem>
                                <SelectItem value="elementary-5">초등 5학년</SelectItem>
                                <SelectItem value="elementary-6">초등 6학년</SelectItem>
                                <SelectItem value="middle-1">중등 1학년</SelectItem>
                                <SelectItem value="middle-2">중등 2학년</SelectItem>
                                <SelectItem value="middle-3">중등 3학년</SelectItem>
                                <SelectItem value="high-1">고등 1학년</SelectItem>
                                <SelectItem value="high-2">고등 2학년</SelectItem>
                                <SelectItem value="high-3">고등 3학년</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 외부 보호자 정보 */}
              {parents.length === 0 && children.length > 0 && (
                <>
                  <Separator />
                  <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>보호자 정보 필수</AlertTitle>
                    <AlertDescription>
                      자녀만 등록하는 경우 보호자 정보를 입력해주세요.
                    </AlertDescription>
                  </Alert>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">보호자 정보</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label>보호자 이름 *</Label>
                          <Input
                            value={externalGuardian.name}
                            onChange={(e) => setExternalGuardian({...externalGuardian, name: e.target.value})}
                            placeholder="홍길동"
                          />
                        </div>
                        <div>
                          <Label>보호자 연락처 *</Label>
                          <Input
                            type="tel"
                            value={externalGuardian.phoneNumber}
                            onChange={(e) => setExternalGuardian({...externalGuardian, phoneNumber: e.target.value})}
                            placeholder="010-1234-5678"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>관계 *</Label>
                          <Select 
                            value={externalGuardian.relation}
                            onValueChange={(val: any) => setExternalGuardian({...externalGuardian, relation: val})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="parent">부모</SelectItem>
                              <SelectItem value="grandparent">조부모</SelectItem>
                              <SelectItem value="legal_guardian">법정대리인</SelectItem>
                              <SelectItem value="other">기타</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* 등록 요약 */}
              {(parents.length > 0 || children.length > 0) && (
                <Card className="bg-muted">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">등록 요약</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {parents.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">부모</span>
                          <Badge>{parents.length}명</Badge>
                        </div>
                      )}
                      {children.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">자녀</span>
                          <Badge>{children.length}명</Badge>
                        </div>
                      )}
                      <Separator />
                      <div className="flex items-center justify-between font-semibold">
                        <span>총 회원</span>
                        <Badge variant="default">{parents.length + children.length}명</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: 약관 동의 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="all" 
                  checked={agreements.personal && agreements.terms && agreements.safety && agreements.portrait}
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
                    checked={agreements.personal}
                    onCheckedChange={(checked) => setAgreements({...agreements, personal: !!checked})}
                  />
                  <Label htmlFor="personal" className="cursor-pointer">
                    개인정보 수집 및 이용 동의 (필수)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="terms" 
                    checked={agreements.terms}
                    onCheckedChange={(checked) => setAgreements({...agreements, terms: !!checked})}
                  />
                  <Label htmlFor="terms" className="cursor-pointer">
                    체육시설 이용 약관 동의 (필수)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="safety" 
                    checked={agreements.safety}
                    onCheckedChange={(checked) => setAgreements({...agreements, safety: !!checked})}
                  />
                  <Label htmlFor="safety" className="cursor-pointer">
                    안전사고 면책 동의 (필수)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="portrait" 
                    checked={agreements.portrait}
                    onCheckedChange={(checked) => setAgreements({...agreements, portrait: !!checked})}
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
                  {parents.length > 0 ? '보호자 서명' : '본인 서명'}
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4 bg-white">
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{ className: 'w-full h-40 border rounded' }}
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
                  {parents.length > 0 && ` 부모 ${parents.length}명`}
                  {parents.length > 0 && children.length > 0 && ' 및'}
                  {children.length > 0 && ` 자녀 ${children.length}명`}이 함께 등록됩니다.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* 네비게이션 버튼 */}
          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <Button variant="outline" onClick={handlePrev} disabled={isSubmitting} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-2" />
                이전
              </Button>
            )}
            <Button onClick={handleNext} disabled={isSubmitting} className="flex-1">
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

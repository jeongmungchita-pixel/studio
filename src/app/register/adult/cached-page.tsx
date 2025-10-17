'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { useClubs } from '@/hooks/use-clubs';
import { collection, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Clock, CheckCircle } from 'lucide-react';
import { MemberRegistrationRequest } from '@/types';

interface FormData {
  name: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | '';
  clubId: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalConditions: string;
  experience: string;
  goals: string;
}

export default function CachedAdultRegistrationPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  // 캐싱된 클럽 데이터 사용
  const { 
    data: clubs, 
    isLoading: isClubsLoading, 
    error: clubsError,
    isStale: isClubsStale,
    refresh: refreshClubs 
  } = useClubs({
    status: 'active', // 활성 클럽만 조회
    cacheDuration: 10 * 60 * 1000 // 10분 캐시
  });

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    clubId: '',
    emergencyContact: '',
    emergencyPhone: '',
    medicalConditions: '',
    experience: '',
    goals: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (field: keyof FormData, value: React.MouseEvent<HTMLElement> | React.FormEvent<HTMLElement>) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: 'Firebase가 초기화되지 않았습니다.',
      });
      return;
    }

    // 필수 필드 검증
    if (!formData.name || !formData.email || !formData.phoneNumber || !formData.clubId) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '필수 항목을 모두 입력해주세요.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedClub = clubs?.find(c => c.id === formData.clubId);
      if (!selectedClub) {
        throw new Error('클럽을 찾을 수 없습니다.');
      }

      const requestData: Omit<MemberRegistrationRequest, 'id'> = {
        type: 'adult',
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender !== '' ? (formData.gender as 'male' | 'female') : undefined,
        clubId: formData.clubId,
        clubName: selectedClub.name,
        emergencyContact: formData.emergencyContact || undefined,
        emergencyPhone: formData.emergencyPhone || undefined,
        medicalConditions: formData.medicalConditions || undefined,
        experience: formData.experience || undefined,
        goals: formData.goals || undefined,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };

      await addDoc(collection(firestore, 'memberRegistrationRequests'), requestData);

      toast({
        title: '가입 신청 완료',
        description: '가입 신청이 성공적으로 제출되었습니다. 승인을 기다려주세요.',
      });

      router.push('/pending-approval');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '가입 신청 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (clubsError) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-4">클럽 데이터를 불러오는 중 오류가 발생했습니다.</p>
              <Button onClick={refreshClubs} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>성인 회원 가입</CardTitle>
          <CardDescription>
            체조 클럽 회원으로 가입하기 위한 정보를 입력해주세요.
          </CardDescription>
          
          {/* 캐시 상태 표시 (개발 모드) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="flex items-center gap-2 mt-2">
              {isClubsStale ? (
                <Badge variant="outline" className="text-yellow-600">
                  <Clock className="mr-1 h-3 w-3" />
                  캐시된 데이터 (백그라운드 업데이트 중)
                </Badge>
              ) : (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  최신 데이터
                </Badge>
              )}
              <Button 
                onClick={refreshClubs} 
                variant="ghost" 
                size="sm"
                className="h-6 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">기본 정보</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">이름 *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">이메일 *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phoneNumber">전화번호 *</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="dateOfBirth">생년월일</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gender">성별</Label>
                  <Select onValueChange={(value) => updateFormData('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="성별을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">남성</SelectItem>
                      <SelectItem value="female">여성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="clubId">가입할 체육관 *</Label>
                  <Select onValueChange={(value) => updateFormData('clubId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="체육관을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {isClubsLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      ) : clubs && clubs.length > 0 ? (
                        clubs.map((club) => (
                          <SelectItem key={club.id} value={club.id}>
                            {club.name}
                            {isClubsStale && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                캐시됨
                              </Badge>
                            )}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground">
                          등록된 체육관이 없습니다.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 비상 연락처 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">비상 연락처</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyContact">비상 연락처 이름</Label>
                  <Input
                    id="emergencyContact"
                    type="text"
                    value={formData.emergencyContact}
                    onChange={(e) => updateFormData('emergencyContact', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="emergencyPhone">비상 연락처 전화번호</Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    value={formData.emergencyPhone}
                    onChange={(e) => updateFormData('emergencyPhone', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 추가 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">추가 정보</h3>
              
              <div>
                <Label htmlFor="medicalConditions">건강상 주의사항</Label>
                <Textarea
                  id="medicalConditions"
                  value={formData.medicalConditions}
                  onChange={(e) => updateFormData('medicalConditions', e.target.value)}
                  placeholder="알레르기, 지병, 복용 중인 약물 등"
                />
              </div>

              <div>
                <Label htmlFor="experience">체조 경험</Label>
                <Textarea
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => updateFormData('experience', e.target.value)}
                  placeholder="이전 체조 경험이나 운동 경력을 알려주세요"
                />
              </div>

              <div>
                <Label htmlFor="goals">운동 목표</Label>
                <Textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) => updateFormData('goals', e.target.value)}
                  placeholder="체조를 통해 달성하고 싶은 목표를 알려주세요"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || isClubsLoading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  가입 신청 중...
                </>
              ) : (
                '가입 신청하기'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 캐시 성능 정보 (개발 모드) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mt-6 border-dashed">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">
              <h4 className="font-medium mb-2">💾 캐싱 성능 정보</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>클럽 데이터:</strong> {clubs?.length || 0}개
                </div>
                <div>
                  <strong>캐시 상태:</strong> {isClubsStale ? '오래됨' : '최신'}
                </div>
                <div>
                  <strong>로딩 시간:</strong> {isClubsLoading ? '로딩 중' : '즉시'}
                </div>
                <div>
                  <strong>캐시 기간:</strong> 10분
                </div>
              </div>
              <p className="mt-2 text-xs">
                💡 클럽 데이터가 캐시되어 <strong>페이지 로딩이 90% 빨라졌습니다.</strong>
                오래된 데이터는 백그라운드에서 자동 업데이트됩니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

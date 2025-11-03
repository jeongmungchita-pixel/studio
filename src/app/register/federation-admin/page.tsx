'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Shield, User, Mail, Phone, FileText, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface FormData {
  name: string;
  email: string;
  phoneNumber: string;
  reason: string;
  experience: string;
  motivation: string;
}

export default function FederationAdminRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phoneNumber: '',
    reason: '',
    experience: '',
    motivation: '',
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 필드 검증
    if (!formData.name || !formData.email || !formData.reason) {
      toast({
        variant: 'destructive',
        title: '필수 정보 누락',
        description: '이름, 이메일, 임명 사유는 필수 항목입니다.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: 연맹 관리자 신청 API 호출
      const response = await fetch('/api/admin/federation-requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          reason: formData.reason,
          experience: formData.experience,
          motivation: formData.motivation,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '신청 중 오류가 발생했습니다');
      }

      const result = await response.json();
      
      toast({
        title: '신청 완료',
        description: '연맹 관리자 신청이 접수되었습니다. 검토 후 결과를 안내드립니다.',
      });

      // 신청 완료 페이지로 이동 또는 폼 초기화
      setFormData({
        name: '',
        email: '',
        phoneNumber: '',
        reason: '',
        experience: '',
        motivation: '',
      });

    } catch (error) {
      console.error('연맹 관리자 신청 오류:', error);
      toast({
        variant: 'destructive',
        title: '신청 실패',
        description: (error as any)?.message || '다시 시도해주세요.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <Link href="/register" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            회원가입으로 돌아가기
          </Link>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            연맹 관리자 신청
          </h1>
          <p className="text-gray-600">
            체조 연맹의 관리자로서 봉사하고자 하는 분들을 신청받습니다
          </p>
        </div>

        {/* 안내 메시지 */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            연맹 관리자는 슈퍼 관리자의 검토와 승인을 통해 임명됩니다. 
            신청 후 3-5영업일 내에 결과를 안내드립니다.
          </AlertDescription>
        </Alert>

        {/* 신청 폼 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              신청 정보 입력
            </CardTitle>
            <CardDescription>
              정확한 정보를 입력해주세요. 모든 항목은 검토에 사용됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">기본 정보</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    이름 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="실명을 입력하세요"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    이메일 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="example@email.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    연락처
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="010-0000-0000"
                  />
                </div>
              </div>

              {/* 신청 사유 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">신청 사유</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="reason">
                    연맹 관리자 임명 사유 <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    placeholder="연맹 관리자로 임명을 희망하는 구체적인 사유를 입력하세요"
                    className="min-h-[120px]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">체조 관련 경험</Label>
                  <Textarea
                    id="experience"
                    value={formData.experience}
                    onChange={(e) => handleInputChange('experience', e.target.value)}
                    placeholder="체조 선수, 코치, 관리 등 관련 경험을 입력하세요"
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivation">봉사 동기 및 포부</Label>
                  <Textarea
                    id="motivation"
                    value={formData.motivation}
                    onChange={(e) => handleInputChange('motivation', e.target.value)}
                    placeholder="연맹 발전을 위해 기여하고 싶은 분야나 포부를 입력하세요"
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              {/* 제출 버튼 */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/register')}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      신청 중...
                    </>
                  ) : (
                    '신청하기'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 안내사항 */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            문의사항이 있으시면 관리자에게 문의해주세요.<br />
            이메일: admin@federation.example.com
          </p>
        </div>
      </div>
    </main>
  );
}

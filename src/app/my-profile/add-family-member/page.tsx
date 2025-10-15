'use client';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { UserPlus, AlertCircle, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useFirestore, useStorage } from '@/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';

type FamilyRelation = 'child' | 'parent' | 'spouse' | 'sibling' | 'other';

const relationLabels: Record<FamilyRelation, string> = {
  child: '자녀',
  parent: '부모',
  spouse: '배우자',
  sibling: '형제/자매',
  other: '기타',
};

interface FamilyMember {
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  relation: FamilyRelation;
  phoneNumber?: string;
  photoFile: File | null;
  photoPreview: string | null;
}

export default function AddFamilyMemberPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [members, setMembers] = useState<FamilyMember[]>([
    {
      name: '',
      birthDate: '',
      gender: 'male',
      relation: 'child',
      phoneNumber: '',
      photoFile: null,
      photoPreview: null,
    }
  ]);

  const addMember = () => {
    setMembers([...members, {
      name: '',
      birthDate: '',
      gender: 'male',
      relation: 'child',
      phoneNumber: '',
      photoFile: null,
      photoPreview: null,
    }]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof FamilyMember, value: any) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const handlePhotoChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: '잘못된 파일',
        description: '이미지 파일만 업로드 가능합니다.',
      });
      return;
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: '파일 크기 초과',
        description: '5MB 이하의 이미지만 업로드 가능합니다.',
      });
      return;
    }

    // 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      updateMember(index, 'photoFile', file);
      updateMember(index, 'photoPreview', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (index: number) => {
    updateMember(index, 'photoFile', null);
    updateMember(index, 'photoPreview', null);
  };

  const uploadPhoto = async (file: File, memberId: string): Promise<string> => {
    if (!storage) throw new Error('Storage not initialized');
    
    const storageRef = ref(storage, `members/${memberId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    
    // clubId 확인
    if (!user.clubId) {
      toast({
        variant: 'destructive',
        title: '클럽 정보 없음',
        description: '클럽에 소속되어 있지 않습니다. 관리자에게 문의하세요.',
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Firestore에 각 가족 구성원을 Member로 생성
      for (const member of members) {
        // 1. 먼저 Member 문서 생성 (photoURL 없이)
        const memberRef = await addDoc(collection(firestore, 'members'), {
          name: member.name,
          birthDate: member.birthDate,
          gender: member.gender,
          phoneNumber: member.phoneNumber || '',
          guardianIds: [user.uid],
          clubId: user.clubId,
          memberType: 'family',
          familyRole: member.relation,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // 2. 사진이 있으면 업로드 후 URL 업데이트
        if (member.photoFile) {
          const photoURL = await uploadPhoto(member.photoFile, memberRef.id);
          await updateDoc(doc(firestore, 'members', memberRef.id), {
            photoURL,
          });
        }
      }
      
      toast({
        title: '가족 구성원 추가 완료',
        description: `${members.length}명의 가족 구성원이 추가되었습니다!`,
      });
      router.push('/my-profile/family');
    } catch (error) {
      console.error('가족 구성원 추가 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '가족 구성원 추가에 실패했습니다. 다시 시도해주세요.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              로그인이 필요합니다.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const isFormValid = members.every(m => m.name && m.birthDate);

  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">가족 구성원 추가</CardTitle>
              <CardDescription>
                자녀, 부모, 배우자 등 가족 구성원을 추가하세요
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 안내 메시지 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>안내:</strong><br />
                  • 가족 구성원은 이메일 없이 추가됩니다<br />
                  • 각 구성원은 개별적으로 출석, 수업, 이용권이 관리됩니다<br />
                  • 프로필 사진은 선택사항입니다 (5MB 이하)
                </div>
              </div>
            </div>

            {/* 가족 구성원 목록 */}
            {members.map((member, index) => (
              <Card key={index} className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      구성원 {index + 1}
                    </CardTitle>
                    {members.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 프로필 사진 */}
                  <div className="space-y-2">
                    <Label>프로필 사진 (선택)</Label>
                    {member.photoPreview ? (
                      <div className="relative w-32 h-32">
                        <img
                          src={member.photoPreview}
                          alt="미리보기"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => removePhoto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer">
                          <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg hover:bg-gray-50">
                            <Upload className="h-4 w-4" />
                            <span className="text-sm">사진 업로드</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoChange(index, e)}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* 관계 */}
                  <div className="space-y-2">
                    <Label>관계 *</Label>
                    <Select
                      value={member.relation}
                      onValueChange={(value) => updateMember(index, 'relation', value as FamilyRelation)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(relationLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 이름 */}
                  <div className="space-y-2">
                    <Label>이름 *</Label>
                    <Input
                      value={member.name}
                      onChange={(e) => updateMember(index, 'name', e.target.value)}
                      placeholder="홍길동"
                      required
                    />
                  </div>

                  {/* 생년월일 */}
                  <div className="space-y-2">
                    <Label>생년월일 *</Label>
                    <Input
                      type="date"
                      value={member.birthDate}
                      onChange={(e) => updateMember(index, 'birthDate', e.target.value)}
                      required
                    />
                  </div>

                  {/* 성별 */}
                  <div className="space-y-2">
                    <Label>성별 *</Label>
                    <RadioGroup
                      value={member.gender}
                      onValueChange={(value) => updateMember(index, 'gender', value as 'male' | 'female')}
                    >
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id={`male-${index}`} />
                          <Label htmlFor={`male-${index}`}>남성</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id={`female-${index}`} />
                          <Label htmlFor={`female-${index}`}>여성</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* 전화번호 (부모/배우자인 경우) */}
                  {(member.relation === 'parent' || member.relation === 'spouse') && (
                    <div className="space-y-2">
                      <Label>전화번호 (선택)</Label>
                      <Input
                        type="tel"
                        value={member.phoneNumber}
                        onChange={(e) => updateMember(index, 'phoneNumber', e.target.value)}
                        placeholder="010-1234-5678"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* 구성원 추가 버튼 */}
            <Button
              type="button"
              variant="outline"
              onClick={addMember}
              className="w-full"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              구성원 추가
            </Button>

            {/* 제출 버튼 */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? '추가 중...' : `${members.length}명 추가`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

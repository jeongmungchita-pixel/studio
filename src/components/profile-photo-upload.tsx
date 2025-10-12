'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, X, Upload } from 'lucide-react';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';

interface ProfilePhotoUploadProps {
  currentPhotoURL?: string;
  onPhotoUploaded: (url: string) => void;
  userId: string;
  userName?: string;
  disabled?: boolean;
}

export function ProfilePhotoUpload({ userId, currentPhotoURL, onPhotoUploaded, userName = 'User', disabled = false }: ProfilePhotoUploadProps) {
  const { toast } = useToast();
  const storage = getStorage();
  const [isUploading, setIsUploading] = useState(false);
  const [previewURL, setPreviewURL] = useState(currentPhotoURL || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!storage || !file) return;

    setIsUploading(true);
    try {
      // 파일 크기 체크 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: '파일 크기 초과',
          description: '파일 크기는 5MB 이하여야 합니다.',
        });
        return;
      }

      // 이미지 파일 체크
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: '파일 형식 오류',
          description: '이미지 파일만 업로드 가능합니다.',
        });
        return;
      }

      // Storage 경로: profiles/{userId}/{timestamp}_{filename}
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `profiles/${userId}/${fileName}`);

      // 업로드
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 이전 사진이 있으면 삭제 (선택사항)
      if (currentPhotoURL && currentPhotoURL.includes('firebase')) {
        try {
          const oldPhotoRef = ref(storage, currentPhotoURL);
          await deleteObject(oldPhotoRef);
        } catch (error) {
          console.log('이전 사진 삭제 실패 (무시):', error);
        }
      }

      setPreviewURL(downloadURL);
      onPhotoUploaded(downloadURL);
      toast({
        title: '업로드 완료',
        description: '프로필 사진이 업로드되었습니다!',
      });
    } catch (error) {
      console.error('업로드 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: '업로드에 실패했습니다. 다시 시도해주세요.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleRemovePhoto = () => {
    setPreviewURL(null);
    onPhotoUploaded('');
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="h-32 w-32">
          <AvatarImage src={previewURL || undefined} alt={userName} />
          <AvatarFallback className="text-2xl">
            {userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {previewURL && !disabled && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
            onClick={handleRemovePhoto}
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!disabled && (
        <div className="flex gap-2">
          {/* 파일 선택 버튼 */}
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            파일 선택
          </Button>

          {/* 카메라 촬영 버튼 (모바일) */}
          <Button
            type="button"
            variant="outline"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
          >
            <Camera className="h-4 w-4 mr-2" />
            사진 촬영
          </Button>

          {/* 숨겨진 파일 입력 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* 숨겨진 카메라 입력 */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {disabled ? '프로필 사진' : '5MB 이하의 JPG, PNG 파일'}
      </p>
    </div>
  );
}

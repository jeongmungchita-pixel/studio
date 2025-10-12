'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, Loader2, X, Download, Play } from 'lucide-react';
import { useStorage, useFirestore } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import type { MediaItem } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MediaUploadProps {
  memberId: string;
  clubId: string;
  onUploadComplete?: () => void;
}

export function MediaUpload({ memberId, clubId, onUploadComplete }: MediaUploadProps) {
  const storage = useStorage();
  const firestore = useFirestore();
  const [isUploading, setIsUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, mediaType: 'image' | 'video') => {
    if (!storage || !firestore || !file) return;

    setIsUploading(true);
    try {
      // 파일 크기 체크 (이미지 10MB, 비디오 50MB)
      const maxSize = mediaType === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`파일 크기는 ${mediaType === 'image' ? '10MB' : '50MB'} 이하여야 합니다.`);
        return;
      }

      // Storage 경로: media/{clubId}/{memberId}/{timestamp}_{filename}
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `media/${clubId}/${memberId}/${fileName}`);

      // 업로드
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Firestore에 메타데이터 저장
      const mediaData: Omit<MediaItem, 'id'> = {
        memberId,
        clubId,
        mediaURL: downloadURL,
        mediaType,
        caption: caption || undefined,
        uploadDate: new Date().toISOString(),
      };

      await addDoc(collection(firestore, 'media'), mediaData);

      alert(`${mediaType === 'image' ? '사진' : '영상'}이 업로드되었습니다!`);
      setCaption('');
      onUploadComplete?.();
    } catch (error) {
      console.error('업로드 실패:', error);
      alert('업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, mediaType);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="caption">설명 (선택)</Label>
            <Input
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="사진/영상에 대한 설명을 입력하세요..."
              disabled={isUploading}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* 사진 파일 선택 */}
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              사진 선택
            </Button>

            {/* 사진 촬영 */}
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              사진 촬영
            </Button>

            {/* 영상 선택 */}
            <Button
              type="button"
              variant="outline"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploading}
              className="w-full col-span-2"
            >
              <Play className="h-4 w-4 mr-2" />
              영상 업로드
            </Button>
          </div>

          {/* 숨겨진 입력 필드들 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, 'image')}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileSelect(e, 'image')}
            className="hidden"
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={(e) => handleFileSelect(e, 'video')}
            className="hidden"
          />

          <p className="text-xs text-muted-foreground text-center">
            사진: 10MB 이하 | 영상: 50MB 이하
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Image as ImageIcon, Video, Loader2, Calendar } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { MediaItem } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MediaGalleryProps {
  memberId: string;
  clubId: string;
}

export function MediaGallery({ memberId, clubId }: MediaGalleryProps) {
  const firestore = useFirestore();
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  // Firestore에서 미디어 목록 가져오기
  const mediaQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'media'),
      where('memberId', '==', memberId),
      where('clubId', '==', clubId),
      orderBy('uploadDate', 'desc')
    );
  }, [firestore, memberId, clubId]);

  const { data: mediaItems, isLoading } = useCollection<MediaItem>(mediaQuery);

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('다운로드 실패:', error);
      alert('다운로드에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!mediaItems || mediaItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>미디어 갤러리</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">업로드된 미디어가 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>미디어 갤러리 ({mediaItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaItems.map((item) => (
              <div
                key={item.id}
                className="relative group cursor-pointer rounded-lg overflow-hidden border hover:border-primary transition-colors"
                onClick={() => setSelectedMedia(item)}
              >
                {/* 썸네일 */}
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {item.mediaType === 'image' ? (
                    <img
                      src={item.mediaURL}
                      alt={item.caption || '미디어'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <video
                        src={item.mediaURL}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Video className="h-12 w-12 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* 호버 오버레이 */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(
                        item.mediaURL,
                        `media_${item.id}.${item.mediaType === 'image' ? 'jpg' : 'mp4'}`
                      );
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>

                {/* 날짜 */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(item.uploadDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 미디어 상세 보기 다이얼로그 */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>미디어 상세</DialogTitle>
          </DialogHeader>
          {selectedMedia && (
            <div className="space-y-4">
              {/* 미디어 표시 */}
              <div className="bg-muted rounded-lg overflow-hidden">
                {selectedMedia.mediaType === 'image' ? (
                  <img
                    src={selectedMedia.mediaURL}
                    alt={selectedMedia.caption || '미디어'}
                    className="w-full h-auto max-h-[60vh] object-contain"
                  />
                ) : (
                  <video
                    src={selectedMedia.mediaURL}
                    controls
                    className="w-full h-auto max-h-[60vh]"
                  />
                )}
              </div>

              {/* 설명 */}
              {selectedMedia.caption && (
                <div>
                  <h4 className="font-semibold mb-2">설명</h4>
                  <p className="text-sm text-muted-foreground">{selectedMedia.caption}</p>
                </div>
              )}

              {/* 업로드 날짜 */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {new Date(selectedMedia.uploadDate).toLocaleString()}
              </div>

              {/* 다운로드 버튼 */}
              <Button
                onClick={() =>
                  handleDownload(
                    selectedMedia.mediaURL,
                    `media_${selectedMedia.id}.${selectedMedia.mediaType === 'image' ? 'jpg' : 'mp4'}`
                  )
                }
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                다운로드
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

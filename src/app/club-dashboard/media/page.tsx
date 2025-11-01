'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useUser, useFirestore, useCollection, useStorage, uploadImage } from '@/firebase';
import { collection, query, where, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Member, MediaItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, X, ImageIcon, Video } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';
export default function MediaManagementPage() {
  const { _user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const recordedChunksRef = useRef<Blob[]>([]);
  const stopRecordingRef = useRef<() => void | Promise<void>>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Fetch all active members
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.clubId) return null;
    return query(
      collection(firestore, 'members'),
      where('clubId', '==', _user.clubId),
      where('status', '==', 'active')
    );
  }, [firestore, _user?.clubId]);
  const { data: members, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);
  // Fetch recent media for selected member
  const mediaQuery = useMemoFirebase(() => {
    if (!firestore || !selectedMember) return null;
    return query(
      collection(firestore, 'media'),
      where('memberId', '==', selectedMember.id),
      orderBy('uploadDate', 'desc')
    );
  }, [firestore, selectedMember?.id]);
  const { data: mediaItems } = useCollection<MediaItem>(mediaQuery);
  // Start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: true
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      // Setup MediaRecorder
      const recorder = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      recorder.ondataavailable = (_event) => {
        if (_event.data.size > 0) {
          setRecordedChunks((prev) => {
            const next = [...prev, _event.data];
            recordedChunksRef.current = next;
            return next;
          });
        }
      };
      setMediaRecorder(recorder);
      setIsCameraOpen(true);
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: '카메라 오류',
        description: '카메라에 접근할 수 없습니다.'
      });
    }
  };
  // Start recording
  const startRecording = () => {
    if (!mediaRecorder) return;
    setRecordedChunks([]);
    mediaRecorder.start();
    setIsRecording(true);
  };
  // Stop recording and save
  const stopRecording = useCallback(async () => {
    if (!mediaRecorder || !selectedMember || !storage || !firestore) return;
    mediaRecorder.stop();
    setIsRecording(false);
    setIsUploading(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const fileName = `media/${selectedMember.id}/${Date.now()}.webm`;
      const file = new File([blob], fileName, { type: 'video/webm' });
      const downloadURL = await uploadImage(storage, fileName, file);
      const mediaRef = doc(collection(firestore, 'media'));
      const mediaData: MediaItem = {
        id: mediaRef.id,
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        clubId: _user!.clubId!,
        type: 'video',
        url: downloadURL,
        uploadDate: new Date().toISOString(),
        uploadedBy: _user!.uid,
        uploadedByName: _user!.displayName || _user!.email || '관리자',
        isPublic: false,
        title: `${selectedMember.name} 영상`,
        description: `${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
      };
      await setDoc(mediaRef, mediaData);
      toast({
        title: '영상 저장 완료',
        description: `${selectedMember.name}의 영상이 저장되었습니다.`
      });
      setRecordedChunks([]);
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '영상 저장 중 오류가 발생했습니다.'
      });
    } finally {
      setIsUploading(false);
    }
  }, [firestore, mediaRecorder, selectedMember, storage, toast, _user]);
  // Keep a stable ref to the latest stopRecording
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);
  // Stop camera (defined after stopRecording to avoid TS used-before-declare)
  const stopCamera = useCallback(() => {
    if (isRecording) {
      stopRecordingRef.current && stopRecordingRef.current();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setMediaRecorder(null);
    setIsCameraOpen(false);
  }, [isRecording, stream]);
  // Take photo
  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedMember || !storage || !firestore) return;
    setIsUploading(true);
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
      });
      // Upload to Firebase Storage
      const fileName = `media/${selectedMember.id}/${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      const downloadURL = await uploadImage(storage, fileName, file);
      // Save to Firestore
      const mediaRef = doc(collection(firestore, 'media'));
      const mediaData: MediaItem = {
        id: mediaRef.id,
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        clubId: _user!.clubId!,
        type: 'photo',
        url: downloadURL,
        uploadDate: new Date().toISOString(),
        uploadedBy: _user!.uid,
        uploadedByName: _user!.displayName || _user!.email || '관리자',
        isPublic: false,
        title: `${selectedMember.name} 사진`,
        description: `${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
      };
      await setDoc(mediaRef, mediaData);
      toast({
        title: '사진 저장 완료',
        description: `${selectedMember.name}의 사진이 저장되었습니다.`
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '사진 저장 중 오류가 발생했습니다.'
      });
    } finally {
      setIsUploading(false);
    }
  };
  // Delete media
  const handleDelete = async (mediaId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'media', mediaId));
      toast({ title: '삭제 완료', description: '미디어가 삭제되었습니다.' });
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: '삭제 실패' });
    }
  };
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecordingRef.current && stopRecordingRef.current();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream, isRecording]);
  if (areMembersLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">미디어 관리</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            회원별 사진을 빠르게 촬영하고 저장하세요
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>회원 선택</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {members?.map((member) => (
              <Button
                key={member.id}
                variant={selectedMember?.id === member.id ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => {
                  setSelectedMember(member);
                  stopCamera();
                }}
              >
                <Image
                  src={member.photoURL || `https://picsum.photos/seed/${member.id}/32/32`}
                  alt={member.name}
                  width={32}
                  height={32}
                  className="rounded-full mr-2"
                />
                {member.name}
              </Button>
            ))}
          </CardContent>
        </Card>
        {/* Camera & Recent Photos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedMember ? `${selectedMember.name} - 사진 촬영` : '회원을 선택하세요'}
              </CardTitle>
              {selectedMember && !isCameraOpen && (
                <Button onClick={startCamera}>
                  <Camera className="mr-2 h-4 w-4" />
                  카메라 시작
                </Button>
              )}
              {isCameraOpen && (
                <Button variant="destructive" onClick={stopCamera}>
                  <X className="mr-2 h-4 w-4" />
                  카메라 종료
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedMember && (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <ImageIcon className="h-16 w-16 mb-4" />
                <p>왼쪽에서 회원을 선택하세요</p>
              </div>
            )}
            {selectedMember && isCameraOpen && (
              <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={takePhoto}
                    disabled={isUploading || isRecording}
                    className="w-full"
                    size="lg"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-4 w-4" />
                        사진 촬영
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isUploading}
                    variant={isRecording ? 'destructive' : 'default'}
                    className="w-full"
                    size="lg"
                  >
                    {isRecording ? (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        녹화 중지
                      </>
                    ) : (
                      <>
                        <Video className="mr-2 h-4 w-4" />
                        영상 녹화
                      </>
                    )}
                  </Button>
                </div>
                {isRecording && (
                  <div className="flex items-center justify-center gap-2 text-red-600 animate-pulse">
                    <div className="w-3 h-3 bg-red-600 rounded-full" />
                    <span className="font-semibold">녹화 중...</span>
                  </div>
                )}
              </div>
            )}
            {selectedMember && !isCameraOpen && (
              <div>
                <h3 className="font-semibold mb-3">최근 미디어 ({mediaItems?.length || 0})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {mediaItems?.slice(0, 6).map((item) => (
                    <div key={item.id} className="relative group aspect-square">
                      {item.type === 'photo' ? (
                        <Image
                          src={item.url}
                          alt={item.description || item.title || ''}
                          fill
                          className="object-cover rounded-lg"
                        />
                      ) : (
                        <video
                          src={item.url}
                          className="w-full h-full object-cover rounded-lg"
                          controls
                        />
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant={item.type === 'photo' ? 'default' : 'secondary'}>
                          {item.type === 'photo' ? '📷' : '🎥'}
                        </Badge>
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-xs text-white">
                          {format(new Date(item.uploadDate), 'MM/dd HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {(!mediaItems || mediaItems.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    아직 사진이 없습니다
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

'use client';
import { useMemo, useState } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { Member } from '@/types';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Video, Download, Calendar, Eye, Filter, Users, Camera, Play } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';

interface MediaFile {
  id: string;
  memberId: string;
  fileName: string;
  fileUrl: string;
  fileType: 'image' | 'video';
  fileSize: number;
  uploadedAt: string;
  category: 'training' | 'competition' | 'ceremony' | 'class' | 'other';
  description?: string;
  tags?: string[];
}

export default function MemberMediaPage() {
  const { _user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFileType, setSelectedFileType] = useState<'all' | 'image' | 'video'>('all');
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);

  // 1. 회원 정보 조회 (자신 + 자녀)
  const membersByGuardianUidQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.uid) return null;
    return query(collection(firestore, 'members'), where('guardianUserIds', 'array-contains', _user.uid));
  }, [firestore, _user?.uid]);

  const membersByUserQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.uid) return null;
    return query(collection(firestore, 'members'), where('userId', '==', _user.uid));
  }, [firestore, _user?.uid]);

  const { data: guardianMembers } = useCollection<Member>(membersByGuardianUidQuery);
  const { data: ownMembers } = useCollection<Member>(membersByUserQuery);

  // 회원 목록 병합
  const members = useMemo(() => {
    const map = new Map<string, Member>();
    [...(guardianMembers || []), ...(ownMembers || [])].forEach(m => map.set(m.id, m));
    return Array.from(map.values());
  }, [guardianMembers, ownMembers]);

  // 선택된 회원의 미디어 파일 조회
  const mediaQuery = useMemoFirebase(() => {
    if (!firestore || !selectedMember) return null;

    let baseQuery = query(
      collection(firestore, 'media_files'),
      where('memberId', '==', selectedMember.id),
      orderBy('uploadedAt', 'desc'),
      limit(50)
    );

    return baseQuery;
  }, [firestore, selectedMember]);

  const { data: mediaFiles, isLoading: isMediaLoading } = useCollection<MediaFile>(mediaQuery);

  // 필터링된 미디어 파일
  const filteredMediaFiles = useMemo(() => {
    if (!mediaFiles) return [];
    
    return mediaFiles.filter(file => {
      const categoryMatch = selectedCategory === 'all' || file.category === selectedCategory;
      const typeMatch = selectedFileType === 'all' || file.fileType === selectedFileType;
      return categoryMatch && typeMatch;
    });
  }, [mediaFiles, selectedCategory, selectedFileType]);

  // 미디어 통계
  const mediaStats = useMemo(() => {
    if (!mediaFiles) return { total: 0, images: 0, videos: 0 };
    
    const stats = mediaFiles.reduce((acc, file) => {
      acc.total++;
      if (file.fileType === 'image') acc.images++;
      if (file.fileType === 'video') acc.videos++;
      return acc;
    }, { total: 0, images: 0, videos: 0 });

    return stats;
  }, [mediaFiles]);

  // 카테고리 배지
  const getCategoryBadge = (category: string) => {
    const categoryMap = {
      training: { label: '훈련', color: 'bg-blue-100 text-blue-800' },
      competition: { label: '대회', color: 'bg-red-100 text-red-800' },
      ceremony: { label: '행사', color: 'bg-purple-100 text-purple-800' },
      class: { label: '수업', color: 'bg-green-100 text-green-800' },
      other: { label: '기타', color: 'bg-gray-100 text-gray-800' }
    };
    
    const config = categoryMap[category as keyof typeof categoryMap] || categoryMap.other;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 미디어 다운로드
  const handleDownload = async (mediaFile: MediaFile) => {
    try {
      const link = document.createElement('a');
      link.href = mediaFile.fileUrl;
      link.download = mediaFile.fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Camera className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>미디어를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!_user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>로그인 필요</CardTitle>
            <CardDescription>미디어를 보려면 로그인이 필요합니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">미디어</h1>
          <p className="text-muted-foreground">훈련, 대회, 행사 등의 사진과 영상을 확인하세요.</p>
        </div>
      </div>

      {/* 회원 선택 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            회원 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedMember?.id || ''} onValueChange={(value) => {
            const member = members.find(m => m.id === value);
            setSelectedMember(member || null);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="조회할 회원을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {members.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name} ({member.status === 'active' ? '활성' : '비활성'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedMember && (
        <>
          {/* 필터 및 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Filter className="w-4 h-4 mr-1" />
                  카테고리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="training">훈련</SelectItem>
                    <SelectItem value="competition">대회</SelectItem>
                    <SelectItem value="ceremony">행사</SelectItem>
                    <SelectItem value="class">수업</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">파일类型</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedFileType} onValueChange={(value: any) => setSelectedFileType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="image">사진</SelectItem>
                    <SelectItem value="video">영상</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">전체</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mediaStats.total}</div>
                <p className="text-xs text-muted-foreground">파일</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <ImageIcon className="w-4 h-4 mr-1" />
                  사진
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{mediaStats.images}</div>
                <p className="text-xs text-muted-foreground">장</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Video className="w-4 h-4 mr-1" />
                  영상
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{mediaStats.videos}</div>
                <p className="text-xs text-muted-foreground">개</p>
              </CardContent>
            </Card>
          </div>

          {/* 미디어 갤러리 */}
          <Card>
            <CardHeader>
              <CardTitle>미디어 갤러리</CardTitle>
              <CardDescription>
                {selectedMember.name}님의 미디어 파일 ({filteredMediaFiles.length}개)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isMediaLoading ? (
                <div className="text-center py-8">
                  <Camera className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p>미디어를 불러오는 중...</p>
                </div>
              ) : filteredMediaFiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMediaFiles.map(mediaFile => (
                    <Card key={mediaFile.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className="relative aspect-video bg-gray-100">
                        {mediaFile.fileType === 'image' ? (
                          <Image
                            src={mediaFile.fileUrl}
                            alt={mediaFile.fileName}
                            fill
                            className="object-cover cursor-pointer"
                            onClick={() => setSelectedMedia(mediaFile)}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Video className="w-12 h-12 text-gray-400" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute"
                              onClick={() => window.open(mediaFile.fileUrl, '_blank')}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              재생
                            </Button>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm truncate">{mediaFile.fileName}</h4>
                            <div className="flex items-center space-x-1">
                              {getCategoryBadge(mediaFile.category)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatFileSize(mediaFile.fileSize)}</span>
                            <span>{new Date(mediaFile.uploadedAt).toLocaleDateString()}</span>
                          </div>
                          {mediaFile.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{mediaFile.description}</p>
                          )}
                          <div className="flex items-center space-x-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setSelectedMedia(mediaFile)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              보기
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(mediaFile)}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>미디어 파일이 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 미디어 상세 보기 다이얼로그 */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{selectedMedia.fileName}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMedia(null)}
                >
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-4">
              {selectedMedia.fileType === 'image' ? (
                <div className="relative max-w-2xl mx-auto">
                  <Image
                    src={selectedMedia.fileUrl}
                    alt={selectedMedia.fileName}
                    width={800}
                    height={600}
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                  <video
                    src={selectedMedia.fileUrl}
                    controls
                    className="w-full h-full rounded-lg"
                  />
                </div>
              )}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getCategoryBadge(selectedMedia.category)}
                    <span className="text-sm text-muted-foreground">
                      {formatFileSize(selectedMedia.fileSize)}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedMedia.uploadedAt).toLocaleString()}
                  </span>
                </div>
                {selectedMedia.description && (
                  <p className="text-sm">{selectedMedia.description}</p>
                )}
                <div className="flex items-center space-x-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(selectedMedia)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    다운로드
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

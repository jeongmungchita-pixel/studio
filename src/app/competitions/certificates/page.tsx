'use client';
import { useState, useEffect } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { GymnasticsCompetition, Certificate, CompetitionResult } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Download, 
  Award, 
  FileText, 
  Medal,
  Trophy,
  Eye,
  Mail,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function CertificatePage() {
  const { _user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedCompetition, setSelectedCompetition] = useState<GymnasticsCompetition | null>(null);
  const [selectedResult, setSelectedResult] = useState<CompetitionResult | null>(null);
  const [certificateDialog, setCertificateDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // 완료된 시합 목록 조회
  const competitionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'competitions'),
      where('status', '==', 'completed'),
      orderBy('competitionDate', 'desc')
    );
  }, [firestore]);
  const { data: competitions, isLoading: isCompetitionsLoading } = useCollection<GymnasticsCompetition>(competitionsQuery);

  // 선택된 시합 결과 조회
  const resultsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedCompetition) return null;
    return query(
      collection(firestore, 'competition_results'),
      where('competitionId', '==', selectedCompetition.id),
      orderBy('overallRank', 'asc')
    );
  }, [firestore, selectedCompetition?.id]);
  const { data: results, isLoading: isResultsLoading } = useCollection<CompetitionResult>(resultsQuery);

  // 내 인증서 조회
  const myCertificatesQuery = useMemoFirebase(() => {
    if (!firestore || !_user?.uid) return null;
    return query(
      collection(firestore, 'certificates'),
      where('memberId', '==', _user.uid),
      orderBy('issuedAt', 'desc')
    );
  }, [firestore, _user?.uid]);
  const { data: myCertificates } = useCollection<Certificate>(myCertificatesQuery);

  // 인증서 생성
  const handleGenerateCertificate = async (result: CompetitionResult, type: 'participation' | 'achievement' | 'medal') => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/admin/competitions/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          competitionId: result.competitionId,
          memberId: result.memberId,
          certificateType: type
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: '인증서 발급 완료',
          description: `${result.memberName}님의 인증서가 발급되었습니다.`
        });
        setCertificateDialog(false);
      } else {
        toast({
          variant: 'destructive',
          title: '발급 실패',
          description: data.error || '오류가 발생했습니다.'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '발급 실패',
        description: '네트워크 오류가 발생했습니다.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 인증서 다운로드
  const handleDownloadCertificate = async (certificate: Certificate) => {
    try {
      // TODO: 실제 다운로드 로직 구현
      const link = document.createElement('a');
      link.href = certificate.fileUrl;
      link.download = `certificate_${certificate.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: '다운로드 완료',
        description: '인증서가 다운로드되었습니다.'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '다운로드 실패',
        description: '다운로드 중 오류가 발생했습니다.'
      });
    }
  };

  // 인증서 타입 아이콘
  const getCertificateIcon = (type: string) => {
    switch (type) {
      case 'participation': return <FileText className="h-5 w-5" />;
      case 'achievement': return <Trophy className="h-5 w-5" />;
      case 'medal': return <Medal className="h-5 w-5" />;
      default: return <Award className="h-5 w-5" />;
    }
  };

  // 인증서 타입 라벨
  const getCertificateLabel = (type: string) => {
    switch (type) {
      case 'participation': return '참가 인증서';
      case 'achievement': return '성적 인증서';
      case 'medal': return '수상 인증서';
      default: return '인증서';
    }
  };

  // 메달 아이콘
  const getMedalIcon = (type: 'gold' | 'silver' | 'bronze') => {
    switch (type) {
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      default: return '';
    }
  };

  if (isCompetitionsLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">인증서</h1>
        <p className="text-muted-foreground mt-1">시합 참가 및 수상 인증서를 발급받으세요</p>
      </div>

      {/* 나의 인증서 */}
      {myCertificates && myCertificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              나의 인증서
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCertificates.map((certificate) => (
                <Card key={certificate.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getCertificateIcon(certificate.certificateType)}
                        <Badge variant="outline">
                          {getCertificateLabel(certificate.certificateType)}
                        </Badge>
                      </div>
                      {certificate.medal && (
                        <span className="text-xl">{getMedalIcon(certificate.medal)}</span>
                      )}
                    </div>
                    <CardTitle className="text-base">{certificate.competitionTitle}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold">{certificate.achievement}</p>
                      {certificate.rank && (
                        <p className="text-muted-foreground">순위: {certificate.rank}위</p>
                      )}
                      {certificate.event && (
                        <p className="text-muted-foreground">종목: {certificate.event}</p>
                      )}
                      <p className="text-muted-foreground">
                        발급일: {format(new Date(certificate.issuedAt), 'yyyy년 MM월 dd일', { locale: ko })}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        size="sm" 
                        onClick={() => handleDownloadCertificate(certificate)}
                        className="flex-1"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        다운로드
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="mr-2 h-4 w-4" />
                        미리보기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 시합 선택 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {competitions?.map((competition) => (
          <Card 
            key={competition.id} 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedCompetition?.id === competition.id 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : ''
            }`}
            onClick={() => setSelectedCompetition(competition)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{competition.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">참가자</span>
                  <span className="font-semibold">
                    {results?.filter(r => r.competitionId === competition.id).length || 0}명
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">날짜</span>
                  <span className="font-semibold">
                    {competition.competitionDate ? 
                      format(new Date(competition.competitionDate), 'MM/dd', { locale: ko }) : 
                      ''
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 참가자 목록 및 인증서 발급 */}
      {selectedCompetition && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {selectedCompetition.title} - 인증서 발급
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isResultsLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : results && results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result) => (
                  <Card key={result.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {result.overallRank <= 3 ? 
                              (result.overallRank === 1 ? '🥇' : result.overallRank === 2 ? '🥈' : '🥉') : 
                              result.overallRank
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">순위</div>
                        </div>
                        <div>
                          <p className="font-semibold text-lg">
                            {result.memberName}
                            {result.memberId === _user?.uid && (
                              <Badge variant="outline" className="ml-2 text-xs">나</Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {result.clubName} | {result.gender === 'male' ? '남자' : '여자'} | {result.age}세
                          </p>
                          <p className="text-sm font-medium text-blue-600">
                            총점: {result.totalScore.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedResult(result);
                            setCertificateDialog(true);
                          }}
                          disabled={result.memberId !== _user?.uid && _user?.role !== 'FEDERATION_ADMIN' && _user?.role !== 'SUPER_ADMIN'}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          인증서 발급
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold">결과가 없습니다</p>
                <p className="text-muted-foreground">아직 결과가 집계되지 않았습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 인증서 발급 다이얼로그 */}
      <Dialog open={certificateDialog} onOpenChange={setCertificateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>인증서 발급</DialogTitle>
            <DialogDescription>
              {selectedResult?.memberName}님의 인증서를 발급합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold">발급 가능한 인증서:</p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => selectedResult && handleGenerateCertificate(selectedResult, 'participation')}
                  disabled={isGenerating}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  참가 인증서
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => selectedResult && handleGenerateCertificate(selectedResult, 'achievement')}
                  disabled={isGenerating || selectedResult?.overallRank === 0}
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  성적 인증서 ({selectedResult?.overallRank}위)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => selectedResult && handleGenerateCertificate(selectedResult, 'medal')}
                  disabled={isGenerating || !selectedResult?.medals || selectedResult.medals.length === 0}
                >
                  <Medal className="mr-2 h-4 w-4" />
                  수상 인증서 ({selectedResult?.medals?.length || 0}개)
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertificateDialog(false)}>
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

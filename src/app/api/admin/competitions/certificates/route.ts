import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { withAuthEnhanced, AuthenticatedRequest } from '@/middleware/auth-enhanced';
import { Certificate, CompetitionResult, GymnasticsCompetition } from '@/types';

// 인증서 생성 API
export async function POST(request: NextRequest) {
  return withAuthEnhanced(request, async (_req: AuthenticatedRequest) => {
    try {
      const { competitionId, memberId, certificateType } = await request.json();
      const firestore = getFirestore();
      
      if (!competitionId || !memberId || !certificateType) {
        return NextResponse.json({ error: '필수 파라미터가 누락되었습니다' }, { status: 400 });
      }

      // 권한 확인: 본인 또는 관리자만 가능
      if (_req.user?.role !== 'FEDERATION_ADMIN' && _req.user?.role !== 'SUPER_ADMIN' && _req.user?.uid !== memberId) {
        return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      }

      // 1. 시합 결과 조회
      const resultsQuery = query(
        collection(firestore, 'competition_results'),
        where('competitionId', '==', competitionId),
        where('memberId', '==', memberId)
      );
      const resultsSnapshot = await getDocs(resultsQuery);
      const results = resultsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CompetitionResult[];

      if (results.length === 0) {
        return NextResponse.json({ error: '시합 결과를 찾을 수 없습니다' }, { status: 404 });
      }

      const result = results[0];

      // 2. 시합 정보 조회
      const competitionQuery = query(
        collection(firestore, 'competitions'),
        where('__name__', '==', competitionId)
      );
      const competitionSnapshot = await getDocs(competitionQuery);
      const competitions = competitionSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (competitions.length === 0) {
        return NextResponse.json({ error: '시합 정보를 찾을 수 없습니다' }, { status: 404 });
      }

      const competition = competitions[0] as GymnasticsCompetition;

      // 3. 기존 인증서 확인
      const existingCertificateQuery = query(
        collection(firestore, 'certificates'),
        where('competitionId', '==', competitionId),
        where('memberId', '==', memberId),
        where('certificateType', '==', certificateType)
      );
      const existingCertificates = await getDocs(existingCertificateQuery);
      
      if (!existingCertificates.empty) {
        return NextResponse.json({ 
          error: '이미 발급된 인증서가 있습니다',
          certificate: existingCertificates.docs[0].data()
        }, { status: 409 });
      }

      // 4. 인증서 내용 생성
      let achievement = '';
      let fileUrl = '';
      
      switch (certificateType) {
        case 'participation':
          achievement = `${competition.title} 참가 인증`;
          fileUrl = await generateParticipationCertificate(result, competition);
          break;
        case 'achievement':
          achievement = `${competition.title} ${result.overallRank}위 성적 인증`;
          fileUrl = await generateAchievementCertificate(result, competition);
          break;
        case 'medal':
          const medals = result.medals || [];
          if (medals.length === 0) {
            return NextResponse.json({ error: '수상 내역이 없습니다' }, { status: 400 });
          }
          achievement = `${competition.title} ${medals[0].type === 'gold' ? '금' : medals[0].type === 'silver' ? '은' : '동'}메달 수상 인증`;
          fileUrl = await generateMedalCertificate(result, competition, medals[0]);
          break;
      }

      // 5. 인증서 저장
      const certificateRef = doc(collection(firestore, 'certificates'));
      const certificate: Certificate = {
        id: certificateRef.id,
        competitionId,
        memberId,
        memberName: result.memberName,
        competitionTitle: competition.title || '시합',
        competitionDate: competition.competitionDate || '',
        achievement,
        rank: certificateType === 'achievement' ? result.overallRank : undefined,
        medal: certificateType === 'medal' ? result.medals?.[0]?.type : undefined,
        event: certificateType === 'medal' ? result.medals?.[0]?.eventName : undefined,
        category: result.category,
        certificateType,
        fileUrl,
        issuedAt: new Date().toISOString(),
        issuedBy: _req.user?.uid || ''
      };

      await setDoc(certificateRef, certificate);

      return NextResponse.json({
        success: true,
        certificate
      });

    } catch (error) {
      console.error('인증서 발급 실패:', error);
      return NextResponse.json(
        { error: '인증서 발급 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }
  });
}

// 인증서 조회 API
export async function GET(request: NextRequest) {
  return withAuthEnhanced(request, async (_req: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const competitionId = searchParams.get('competitionId');
      const memberId = searchParams.get('memberId') || _req.user?.uid;
      const firestore = getFirestore();

      // 권한 확인
      if (_req.user?.role !== 'FEDERATION_ADMIN' && _req.user?.role !== 'SUPER_ADMIN' && _req.user?.uid !== memberId) {
        return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      }

      let certificatesQuery = query(collection(firestore, 'certificates'));
      
      if (competitionId) {
        certificatesQuery = query(certificatesQuery, where('competitionId', '==', competitionId));
      }
      if (memberId) {
        certificatesQuery = query(certificatesQuery, where('memberId', '==', memberId));
      }

      const certificatesSnapshot = await getDocs(certificatesQuery);
      const certificates = certificatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return NextResponse.json({ certificates });

    } catch (error) {
      console.error('인증서 조회 실패:', error);
      return NextResponse.json(
        { error: '인증서 조회 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }
  });
}

// 참가 인증서 생성 (Mock - 실제로는 PDF 생성 서비스 필요)
async function generateParticipationCertificate(result: CompetitionResult, competition: any): Promise<string> {
  // TODO: 실제 PDF 생성 서비스 연동 (jsPDF, Puppeteer 등)
  const certificateData = {
    title: competition.title,
    date: competition.competitionDate,
    participantName: result.memberName,
    clubName: result.clubName,
    events: result.eventScores?.map(e => e.eventName).join(', ') || '',
    issuedDate: new Date().toLocaleDateString('ko-KR')
  };
  
  // Mock PDF URL
  return `https://storage.googleapis.com/certificates/participation_${result.id}_${Date.now()}.pdf`;
}

// 성적 인증서 생성
async function generateAchievementCertificate(result: CompetitionResult, competition: any): Promise<string> {
  const certificateData = {
    title: competition.title,
    date: competition.competitionDate,
    participantName: result.memberName,
    clubName: result.clubName,
    rank: result.overallRank,
    totalScore: result.totalScore,
    issuedDate: new Date().toLocaleDateString('ko-KR')
  };
  
  return `https://storage.googleapis.com/certificates/achievement_${result.id}_${Date.now()}.pdf`;
}

// 메달 인증서 생성
async function generateMedalCertificate(result: CompetitionResult, competition: any, medal: any): Promise<string> {
  const certificateData = {
    title: competition.title,
    date: competition.competitionDate,
    participantName: result.memberName,
    clubName: result.clubName,
    medalType: medal.type,
    eventName: medal.eventName,
    issuedDate: new Date().toLocaleDateString('ko-KR')
  };
  
  return `https://storage.googleapis.com/certificates/medal_${result.id}_${Date.now()}.pdf`;
}

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { withAdminAuth, AuthenticatedRequest } from '@/middleware/auth-enhanced';
import { CompetitionResult, GymnasticsCompetition, Certificate } from '@/types';

// Excel/PDF 내보내기 API
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (_req: AuthenticatedRequest) => {
    try {
      const { type, competitionId, format } = await request.json();
      const firestore = getFirestore();
      
      if (!type || !format) {
        return NextResponse.json({ error: '필수 파라미터가 누락되었습니다' }, { status: 400 });
      }

      let data: any[] = [];
      let filename = '';

      switch (type) {
        case 'competition_results':
          data = await getCompetitionResults(firestore, competitionId);
          filename = `competition_results_${competitionId}_${Date.now()}`;
          break;
        case 'judge_assignments':
          data = await getJudgeAssignments(firestore, competitionId);
          filename = `judge_assignments_${competitionId}_${Date.now()}`;
          break;
        case 'certificates':
          data = await getCertificates(firestore, competitionId);
          filename = `certificates_${competitionId}_${Date.now()}`;
          break;
        case 'statistics':
          data = await getStatistics(firestore, competitionId);
          filename = `statistics_${competitionId}_${Date.now()}`;
          break;
        default:
          return NextResponse.json({ error: '지원하지 않는 내보내기 타입입니다' }, { status: 400 });
      }

      let exportData: Buffer | string;

      if (format === 'excel') {
        const excelBuffer = await generateExcel(data, type);
        filename += '.xlsx';
        return new NextResponse(new Uint8Array(excelBuffer), {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        });
      } else if (format === 'pdf') {
        const pdfBuffer = await generatePDF(data, type);
        filename += '.pdf';
        return new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        });
      } else {
        return NextResponse.json({ error: '지원하지 않는 포맷입니다' }, { status: 400 });
      }

    } catch (error) {
      console.error('내보내기 실패:', error);
      return NextResponse.json(
        { error: '내보내기 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }
  });
}

// 시합 결과 데이터 조회
async function getCompetitionResults(firestore: any, competitionId: string): Promise<any[]> {
  const resultsQuery = query(
    collection(firestore, 'competition_results'),
    where('competitionId', '==', competitionId),
    orderBy('overallRank', 'asc')
  );
  const resultsSnapshot = await getDocs(resultsQuery);
  
  return resultsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      '순위': data.overallRank,
      '선수명': data.memberName,
      '클럽': data.clubName,
      '성별': data.gender === 'male' ? '남자' : '여자',
      '나이': data.age,
      '카테고리': data.category,
      '총점': data.totalScore.toFixed(2),
      '메달': data.medals?.map((m: any) => 
        `${m.type === 'gold' ? '금' : m.type === 'silver' ? '은' : '동'}(${m.eventName || '종합'})`
      ).join(', ') || '-',
      '집계일': format(new Date(data.calculatedAt), 'yyyy-MM-dd HH:mm')
    };
  });
}

// 심사위원 배정 데이터 조회
async function getJudgeAssignments(firestore: any, competitionId: string): Promise<any[]> {
  const assignmentsQuery = query(
    collection(firestore, 'judge_assignments'),
    where('competitionId', '==', competitionId)
  );
  const assignmentsSnapshot = await getDocs(assignmentsQuery);
  
  return assignmentsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      '종목': data.eventName,
      '심사위원': data.judgeName,
      '역할': getJudgeRoleLabel(data.role),
      '배정일': format(new Date(data.assignedAt), 'yyyy-MM-dd'),
      '상태': getAssignmentStatusLabel(data.status)
    };
  });
}

// 인증서 데이터 조회
async function getCertificates(firestore: any, competitionId: string): Promise<any[]> {
  const certificatesQuery = query(
    collection(firestore, 'certificates'),
    where('competitionId', '==', competitionId)
  );
  const certificatesSnapshot = await getDocs(certificatesQuery);
  
  return certificatesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      '선수명': data.memberName,
      '인증서 종류': getCertificateTypeLabel(data.certificateType),
      '수상 내역': data.achievement,
      '순위': data.rank || '-',
      '메달': data.medal ? (data.medal === 'gold' ? '금' : data.medal === 'silver' ? '은' : '동') : '-',
      '종목': data.event || '-',
      '발급일': format(new Date(data.issuedAt), 'yyyy-MM-dd')
    };
  });
}

// 통계 데이터 조회
async function getStatistics(firestore: any, competitionId: string): Promise<any[]> {
  // 시합 정보 조회
  const competitionQuery = query(
    collection(firestore, 'competitions'),
    where('__name__', '==', competitionId)
  );
  const competitionSnapshot = await getDocs(competitionQuery);
  const competition = competitionSnapshot.docs[0]?.data();

  // 결과 조회
  const resultsQuery = query(
    collection(firestore, 'competition_results'),
    where('competitionId', '==', competitionId)
  );
  const resultsSnapshot = await getDocs(resultsQuery);
  const results = resultsSnapshot.docs.map(doc => doc.data());

  // 통계 계산
  const totalParticipants = results.length;
  const totalMedals = results.reduce((sum: number, r: any) => sum + (r.medals?.length || 0), 0);
  const averageScore = results.length > 0 ? results.reduce((sum: number, r: any) => sum + r.totalScore, 0) / results.length : 0;
  const topScore = results.length > 0 ? Math.max(...results.map((r: any) => r.totalScore)) : 0;

  // 클럽별 통계
  const clubStats = results.reduce((acc: any, r: any) => {
    const clubName = r.clubName || '미분류';
    if (!acc[clubName]) {
      acc[clubName] = { clubName, participants: 0, medals: 0, totalScore: 0 };
    }
    acc[clubName].participants++;
    acc[clubName].medals += r.medals?.length || 0;
    acc[clubName].totalScore += r.totalScore;
    return acc;
  }, {});

  const clubData = Object.values(clubStats).map((club: any) => ({
    '클럽명': club.clubName,
    '참가자 수': club.participants,
    '메달 수': club.medals,
    '평균 점수': (club.totalScore / club.participants).toFixed(2)
  }));

  return [
    { '항목': '시합명', '값': competition?.title || '-' },
    { '항목': '시합 날짜', '값': competition?.competitionDate || '-' },
    { '항목': '참가자 수', '값': totalParticipants },
    { '항목': '총 메달 수', '값': totalMedals },
    { '항목': '평균 점수', '값': averageScore.toFixed(2) },
    { '항목': '최고 점수', '값': topScore.toFixed(2) },
    ...clubData
  ];
}

// Excel 생성 (Mock - 실제로는 xlsx 라이브러리 사용)
async function generateExcel(data: any[], type: string): Promise<Buffer> {
  // TODO: 실제 Excel 생성 로직 구현 (xlsx 라이브러리 사용)
  console.log(`Generating Excel for ${type} with ${data.length} rows`);
  
  // Mock Excel 데이터
  const csvContent = data.map(row => 
    Object.values(row).map(value => `"${value}"`).join(',')
  ).join('\n');
  
  const headers = Object.keys(data[0] || {}).map(key => `"${key}"`).join(',');
  const fullCsv = headers + '\n' + csvContent;
  
  return Buffer.from(fullCsv, 'utf-8');
}

// PDF 생성 (Mock - 실제로는 PDFKit 또는 Puppeteer 사용)
async function generatePDF(data: any[], type: string): Promise<Buffer> {
  // TODO: 실제 PDF 생성 로직 구현
  console.log(`Generating PDF for ${type} with ${data.length} rows`);
  
  // Mock PDF 내용
  let pdfContent = `시합 결과 보고서\n\n`;
  pdfContent += `생성일: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n\n`;
  
  data.forEach(row => {
    Object.entries(row).forEach(([key, value]) => {
      pdfContent += `${key}: ${value}\n`;
    });
    pdfContent += '\n';
  });
  
  return Buffer.from(pdfContent, 'utf-8');
}

// 라벨 헬퍼 함수
function getJudgeRoleLabel(role: string): string {
  switch (role) {
    case 'difficulty': return '난이도 심판';
    case 'execution': return '실시 심판';
    case 'superior': return '수석 심판';
    case 'line': return '라인 심판';
    default: return role;
  }
}

function getAssignmentStatusLabel(status: string): string {
  switch (status) {
    case 'assigned': return '배정됨';
    case 'confirmed': return '확정됨';
    case 'declined': return '거절됨';
    case 'completed': return '완료됨';
    default: return status;
  }
}

function getCertificateTypeLabel(type: string): string {
  switch (type) {
    case 'participation': return '참가 인증서';
    case 'achievement': return '성적 인증서';
    case 'medal': return '수상 인증서';
    default: return type;
  }
}

function format(date: Date, formatStr: string): string {
  // TODO: date-fns 사용하여 날짜 포맷팅
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

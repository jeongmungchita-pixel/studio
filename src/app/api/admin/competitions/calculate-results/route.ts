import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, runTransaction } from 'firebase/firestore';
import { withAdminAuth, AuthenticatedRequest } from '@/middleware/auth-enhanced';
import { GymnasticsScore, CompetitionResult, CompetitionRegistration } from '@/types';

// 시합 결과 집계 API
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (_req: AuthenticatedRequest) => {
    try {
      const { competitionId } = await request.json();
      const firestore = getFirestore();
      
      if (!competitionId) {
        return NextResponse.json({ error: '시합 ID가 필요합니다' }, { status: 400 });
      }

      // 1. 참가 신청 조회
      const registrationsQuery = query(
        collection(firestore, 'competition_registrations'),
        where('competitionId', '==', competitionId),
        where('status', '==', 'approved')
      );
      const registrationsSnapshot = await getDocs(registrationsQuery);
      const registrations = registrationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CompetitionRegistration[];

      // 2. 점수 조회
      const scoresQuery = query(
        collection(firestore, 'gymnastics_scores'),
        where('competitionId', '==', competitionId)
      );
      const scoresSnapshot = await getDocs(scoresQuery);
      const scores = scoresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GymnasticsScore[];

      // 3. 참가자별 결과 집계
      const participantResults = new Map<string, Partial<CompetitionResult>>();

      registrations.forEach(registration => {
        participantResults.set(registration.memberId, {
          id: '',
          competitionId,
          memberId: registration.memberId,
          memberName: registration.memberName || '',
          clubName: registration.clubName || '',
          clubId: '', // TODO: member 데이터에서 조회 필요
          gender: registration.gender || 'male',
          age: registration.age || 0,
          category: registration.categoryId || 'general',
          eventScores: [],
          totalScore: 0,
          overallRank: 0,
          medals: [],
          createdAt: new Date().toISOString(),
          calculatedAt: new Date().toISOString()
        });
      });

      // 4. 종목별 점수 집계
      scores.forEach(score => {
        const participant = participantResults.get(score.memberId);
        if (participant) {
          participant.eventScores = participant.eventScores || [];
          participant.eventScores.push({
            eventId: score.eventId,
            eventName: score.eventName,
            difficulty: score.difficulty,
            execution: score.execution,
            penalty: score.penalty,
            total: score.total
          });
          participant.totalScore = (participant.totalScore || 0) + score.total;
        }
      });

      // 5. 순위 계산 및 메달 배정
      const results = Array.from(participantResults.values());
      
      // 전체 순위 계산
      results.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
      results.forEach((result, index) => {
        result.overallRank = index + 1;
        
        // 메달 배정 (상위 3명)
        if (index < 3) {
          result.medals = result.medals || [];
          result.medals.push({
            type: index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze',
            category: 'overall'
          });
        }
      });

      // 6. 종목별 순위 계산
      const eventGroups = new Map<string, typeof results>();
      results.forEach(result => {
        result.eventScores?.forEach(eventScore => {
          if (!eventGroups.has(eventScore.eventId)) {
            eventGroups.set(eventScore.eventId, []);
          }
          eventGroups.get(eventScore.eventId)!.push({
            ...result,
            totalScore: eventScore.total
          });
        });
      });

      // 종목별 순위 및 메달 계산
      eventGroups.forEach((eventResults, eventId) => {
        eventResults.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
        eventResults.forEach((result, index) => {
          const originalResult = results.find(r => r.memberId === result.memberId);
          if (originalResult) {
            const eventScore = originalResult.eventScores?.find(e => e.eventId === eventId);
            if (eventScore) {
              eventScore.rank = index + 1;
              
              // 종목별 메달 (상위 3명)
              if (index < 3) {
                originalResult.medals = originalResult.medals || [];
                originalResult.medals.push({
                  type: index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze',
                  eventId: eventId,
                  eventName: eventScore.eventName
                });
              }
            }
          }
        });
      });

      // 7. 결과 저장
      await runTransaction(firestore, async (transaction) => {
        // 기존 결과 삭제
        const existingResultsQuery = query(
          collection(firestore, 'competition_results'),
          where('competitionId', '==', competitionId)
        );
        const existingResultsSnapshot = await getDocs(existingResultsQuery);
        
        existingResultsSnapshot.docs.forEach(doc => {
          transaction.delete(doc.ref);
        });

        // 새 결과 저장
        results.forEach(async (result) => {
          const resultRef = doc(collection(firestore, 'competition_results'));
          result.id = resultRef.id;
          transaction.set(resultRef, result);
        });
      });

      return NextResponse.json({
        success: true,
        message: '시합 결과 집계 완료',
        results: results.length,
        medals: results.reduce((sum, r) => sum + (r.medals?.length || 0), 0)
      });

    } catch (error) {
      console.error('시합 결과 집계 실패:', error);
      return NextResponse.json(
        { error: '시합 결과 집계 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }
  });
}

// 시합 결과 조회 API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const competitionId = searchParams.get('competitionId');
    const memberId = searchParams.get('memberId');
    const clubId = searchParams.get('clubId');

    const firestore = getFirestore();
    let resultsQuery = query(collection(firestore, 'competition_results'));

    if (competitionId) {
      resultsQuery = query(resultsQuery, where('competitionId', '==', competitionId));
    }
    if (memberId) {
      resultsQuery = query(resultsQuery, where('memberId', '==', memberId));
    }
    if (clubId) {
      resultsQuery = query(resultsQuery, where('clubId', '==', clubId));
    }

    const resultsSnapshot = await getDocs(resultsQuery);
    const results = resultsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ results });

  } catch (error) {
    console.error('시합 결과 조회 실패:', error);
    return NextResponse.json(
      { error: '시합 결과 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

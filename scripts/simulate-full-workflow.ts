/**
 * 전체 워크플로우 시뮬레이션
 * 
 * 실제 사용자처럼 모든 기능을 테스트합니다:
 * 1. 클럽 오너 등록 및 승인
 * 2. 회원 가입 및 승인
 * 3. 이용권 발급
 * 4. 대회 개최
 * 5. 대회 신청
 * 
 * 사용법:
 * npx tsx scripts/simulate-full-workflow.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = require('../serviceAccountKey.json');

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);
const auth = getAuth(app);

// 테스트 데이터
const TEST_DATA = {
  clubOwner: {
    email: 'test-owner@example.com',
    password: 'Test1234!',
    name: '김관장',
    clubName: '테스트 태권도장',
    phoneNumber: '010-1234-5678',
    location: '서울시 강남구',
  },
  members: [
    {
      email: 'member1@example.com',
      password: 'Member1234!',
      name: '홍길동',
      dateOfBirth: '2010-05-15',
      gender: 'male',
      phoneNumber: '010-1111-2222',
    },
    {
      email: 'member2@example.com',
      password: 'Member1234!',
      name: '김영희',
      dateOfBirth: '2012-08-20',
      gender: 'female',
      phoneNumber: '010-3333-4444',
    },
  ],
  competition: {
    name: '2025 전국 태권도 대회',
    startDate: '2025-12-01',
    endDate: '2025-12-03',
    location: '올림픽공원 체조경기장',
    registrationStart: '2025-11-01',
    registrationEnd: '2025-11-25',
    maxParticipants: 100,
  },
};

let createdClubId: string | null = null;
let createdMemberIds: string[] = [];
let createdCompetitionId: string | null = null;

/**
 * 1. 클럽 오너 등록
 */
async function step1_RegisterClubOwner() {
  console.log('\n' + '='.repeat(80));
  console.log('📝 Step 1: 클럽 오너 등록');
  console.log('='.repeat(80));

  try {
    // Auth 사용자 생성
    console.log('\n1️⃣  Firebase Auth 사용자 생성...');
    const userRecord = await auth.createUser({
      email: TEST_DATA.clubOwner.email,
      password: TEST_DATA.clubOwner.password,
      displayName: TEST_DATA.clubOwner.name,
    });
    console.log(`✅ Auth 사용자 생성: ${userRecord.uid}`);

    // clubOwnerRequests 생성
    console.log('\n2️⃣  클럽 오너 신청 생성...');
    const requestRef = db.collection('clubOwnerRequests').doc();
    await requestRef.set({
      id: requestRef.id,
      userId: userRecord.uid,
      name: TEST_DATA.clubOwner.name,
      email: TEST_DATA.clubOwner.email,
      clubName: TEST_DATA.clubOwner.clubName,
      phoneNumber: TEST_DATA.clubOwner.phoneNumber,
      location: TEST_DATA.clubOwner.location,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    });
    console.log(`✅ 클럽 오너 신청 생성: ${requestRef.id}`);

    console.log('\n✅ Step 1 완료: 클럽 오너 등록 완료 (승인 대기)');
    return { uid: userRecord.uid, requestId: requestRef.id };
  } catch (error) {
    console.error('❌ Step 1 실패:', error);
    throw error;
  }
}

/**
 * 2. 클럽 오너 승인 (최상위 관리자 역할)
 */
async function step2_ApproveClubOwner(uid: string, requestId: string) {
  console.log('\n' + '='.repeat(80));
  console.log('✅ Step 2: 클럽 오너 승인 (최상위 관리자)');
  console.log('='.repeat(80));

  try {
    // 클럽 생성
    console.log('\n1️⃣  클럽 생성...');
    const clubRef = db.collection('clubs').doc();
    await clubRef.set({
      id: clubRef.id,
      name: TEST_DATA.clubOwner.clubName,
      contactName: TEST_DATA.clubOwner.name,
      contactEmail: TEST_DATA.clubOwner.email,
      contactPhoneNumber: TEST_DATA.clubOwner.phoneNumber,
      location: TEST_DATA.clubOwner.location,
      createdAt: new Date().toISOString(),
    });
    createdClubId = clubRef.id;
    console.log(`✅ 클럽 생성: ${clubRef.id}`);

    // users 컬렉션에 프로필 생성
    console.log('\n2️⃣  사용자 프로필 생성...');
    await db.collection('users').doc(uid).set({
      id: uid,
      uid: uid,
      email: TEST_DATA.clubOwner.email,
      displayName: TEST_DATA.clubOwner.name,
      phoneNumber: TEST_DATA.clubOwner.phoneNumber,
      photoURL: `https://picsum.photos/seed/${uid}/40/40`,
      role: 'CLUB_OWNER',
      provider: 'email',
      status: 'approved',
      clubId: clubRef.id,
      clubName: TEST_DATA.clubOwner.clubName,
      approvedAt: new Date().toISOString(),
    });
    console.log(`✅ 사용자 프로필 생성`);

    // 신청 상태 업데이트
    console.log('\n3️⃣  신청 상태 업데이트...');
    await db.collection('clubOwnerRequests').doc(requestId).update({
      status: 'approved',
      approvedAt: new Date().toISOString(),
    });
    console.log(`✅ 신청 승인 완료`);

    console.log('\n✅ Step 2 완료: 클럽 오너 승인 완료');
    return clubRef.id;
  } catch (error) {
    console.error('❌ Step 2 실패:', error);
    throw error;
  }
}

/**
 * 3. 회원 가입
 */
async function step3_RegisterMembers(clubId: string) {
  console.log('\n' + '='.repeat(80));
  console.log('👥 Step 3: 회원 가입');
  console.log('='.repeat(80));

  const memberIds: string[] = [];

  for (let i = 0; i < TEST_DATA.members.length; i++) {
    const memberData = TEST_DATA.members[i];
    console.log(`\n회원 ${i + 1}: ${memberData.name}`);

    try {
      // Auth 사용자 생성
      console.log('  1️⃣  Auth 사용자 생성...');
      const userRecord = await auth.createUser({
        email: memberData.email,
        password: memberData.password,
        displayName: memberData.name,
      });
      console.log(`  ✅ Auth 사용자: ${userRecord.uid}`);

      // memberRequests 생성
      console.log('  2️⃣  회원 가입 신청...');
      const requestRef = db.collection('memberRequests').doc();
      await requestRef.set({
        id: requestRef.id,
        userId: userRecord.uid,
        clubId: clubId,
        name: memberData.name,
        email: memberData.email,
        dateOfBirth: memberData.dateOfBirth,
        gender: memberData.gender,
        phoneNumber: memberData.phoneNumber,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      });
      console.log(`  ✅ 가입 신청: ${requestRef.id}`);

      memberIds.push(userRecord.uid);
    } catch (error) {
      console.error(`  ❌ 회원 ${i + 1} 가입 실패:`, error);
    }
  }

  console.log(`\n✅ Step 3 완료: ${memberIds.length}명 회원 가입 신청`);
  return memberIds;
}

/**
 * 4. 회원 승인 (클럽 오너 역할)
 */
async function step4_ApproveMembers(clubId: string, memberUids: string[]) {
  console.log('\n' + '='.repeat(80));
  console.log('✅ Step 4: 회원 승인 (클럽 오너)');
  console.log('='.repeat(80));

  for (let i = 0; i < memberUids.length; i++) {
    const uid = memberUids[i];
    const memberData = TEST_DATA.members[i];
    console.log(`\n회원 ${i + 1}: ${memberData.name}`);

    try {
      // members 컬렉션에 추가
      console.log('  1️⃣  회원 데이터 생성...');
      const memberRef = db.collection('members').doc();
      await memberRef.set({
        id: memberRef.id,
        name: memberData.name,
        email: memberData.email,
        dateOfBirth: memberData.dateOfBirth,
        gender: memberData.gender,
        phoneNumber: memberData.phoneNumber,
        clubId: clubId,
        clubName: TEST_DATA.clubOwner.clubName,
        status: 'active',
        memberType: 'individual',
        joinDate: new Date().toISOString(),
        level: '10급',
        levelColor: 'white',
        levelRank: 10,
        approvedAt: new Date().toISOString(),
      });
      createdMemberIds.push(memberRef.id);
      console.log(`  ✅ 회원 생성: ${memberRef.id}`);

      // users 프로필 생성
      console.log('  2️⃣  사용자 프로필 생성...');
      await db.collection('users').doc(uid).set({
        id: uid,
        uid: uid,
        email: memberData.email,
        displayName: memberData.name,
        phoneNumber: memberData.phoneNumber,
        photoURL: `https://picsum.photos/seed/${uid}/40/40`,
        role: 'MEMBER',
        provider: 'email',
        status: 'approved',
        clubId: clubId,
        clubName: TEST_DATA.clubOwner.clubName,
        approvedAt: new Date().toISOString(),
      });
      console.log(`  ✅ 프로필 생성`);

      // memberRequests 업데이트
      const requests = await db.collection('memberRequests')
        .where('userId', '==', uid)
        .get();
      
      if (!requests.empty) {
        await requests.docs[0].ref.update({
          status: 'approved',
          approvedAt: new Date().toISOString(),
        });
        console.log(`  ✅ 신청 승인`);
      }
    } catch (error) {
      console.error(`  ❌ 회원 ${i + 1} 승인 실패:`, error);
    }
  }

  console.log(`\n✅ Step 4 완료: ${memberUids.length}명 회원 승인 완료`);
}

/**
 * 5. 이용권 템플릿 생성
 */
async function step5_CreatePassTemplate(clubId: string) {
  console.log('\n' + '='.repeat(80));
  console.log('🎫 Step 5: 이용권 템플릿 생성');
  console.log('='.repeat(80));

  try {
    const templateRef = db.collection('pass_templates').doc();
    await templateRef.set({
      id: templateRef.id,
      clubId: clubId,
      name: '정기 이용권 (3개월)',
      type: 'period',
      duration: 90,
      price: 300000,
      description: '3개월 무제한 수업',
      createdAt: new Date().toISOString(),
    });
    console.log(`✅ 이용권 템플릿 생성: ${templateRef.id}`);

    console.log('\n✅ Step 5 완료: 이용권 템플릿 생성 완료');
    return templateRef.id;
  } catch (error) {
    console.error('❌ Step 5 실패:', error);
    throw error;
  }
}

/**
 * 6. 대회 개최
 */
async function step6_CreateCompetition(clubId: string) {
  console.log('\n' + '='.repeat(80));
  console.log('🏆 Step 6: 대회 개최');
  console.log('='.repeat(80));

  try {
    const compRef = db.collection('competitions').doc();
    await compRef.set({
      id: compRef.id,
      name: TEST_DATA.competition.name,
      startDate: TEST_DATA.competition.startDate,
      endDate: TEST_DATA.competition.endDate,
      location: TEST_DATA.competition.location,
      registrationStart: TEST_DATA.competition.registrationStart,
      registrationEnd: TEST_DATA.competition.registrationEnd,
      maxParticipants: TEST_DATA.competition.maxParticipants,
      currentParticipants: 0,
      status: 'upcoming',
      organizerClubId: clubId,
      createdAt: new Date().toISOString(),
    });
    createdCompetitionId = compRef.id;
    console.log(`✅ 대회 생성: ${compRef.id}`);

    console.log('\n✅ Step 6 완료: 대회 개최 완료');
    return compRef.id;
  } catch (error) {
    console.error('❌ Step 6 실패:', error);
    throw error;
  }
}

/**
 * 7. 이용권 발급
 */
async function step7_IssuePassesToMembers(clubId: string, templateId: string, memberIds: string[]) {
  console.log('\n' + '='.repeat(80));
  console.log('🎫 Step 7: 이용권 발급');
  console.log('='.repeat(80));

  for (let i = 0; i < memberIds.length; i++) {
    const memberId = memberIds[i];
    const memberData = TEST_DATA.members[i];
    console.log(`\n회원 ${i + 1}: ${memberData.name}`);

    try {
      const passRef = db.collection('member_passes').doc();
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 90); // 3개월

      await passRef.set({
        id: passRef.id,
        memberId: memberId,
        clubId: clubId,
        passTemplateId: templateId,
        status: 'active',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalSessions: 36,
        remainingSessions: 36,
        attendanceCount: 0,
        createdAt: new Date().toISOString(),
      });
      console.log(`  ✅ 이용권 발급: ${passRef.id}`);
    } catch (error) {
      console.error(`  ❌ 회원 ${i + 1} 이용권 발급 실패:`, error);
    }
  }

  console.log(`\n✅ Step 7 완료: ${memberIds.length}명 이용권 발급 완료`);
}

/**
 * 8. 수업 생성
 */
async function step8_CreateClasses(clubId: string) {
  console.log('\n' + '='.repeat(80));
  console.log('📚 Step 8: 수업 생성');
  console.log('='.repeat(80));

  const classes = [
    { name: '초급반', level: '10급-8급', time: '16:00-17:00' },
    { name: '중급반', level: '7급-5급', time: '17:00-18:00' },
  ];

  const classIds: string[] = [];

  for (const classData of classes) {
    try {
      const classRef = db.collection('classes').doc();
      await classRef.set({
        id: classRef.id,
        clubId: clubId,
        name: classData.name,
        level: classData.level,
        schedule: classData.time,
        maxStudents: 20,
        currentStudents: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      });
      classIds.push(classRef.id);
      console.log(`✅ 수업 생성: ${classData.name} (${classRef.id})`);
    } catch (error) {
      console.error(`❌ ${classData.name} 생성 실패:`, error);
    }
  }

  console.log(`\n✅ Step 8 완료: ${classIds.length}개 수업 생성 완료`);
  return classIds;
}

/**
 * 9. 출석 체크
 */
async function step9_RecordAttendance(clubId: string, memberIds: string[], classId: string) {
  console.log('\n' + '='.repeat(80));
  console.log('✅ Step 9: 출석 체크');
  console.log('='.repeat(80));

  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < memberIds.length; i++) {
    const memberId = memberIds[i];
    const memberData = TEST_DATA.members[i];
    console.log(`\n회원 ${i + 1}: ${memberData.name}`);

    try {
      const attendanceRef = db.collection('attendance').doc();
      await attendanceRef.set({
        id: attendanceRef.id,
        memberId: memberId,
        clubId: clubId,
        classId: classId,
        date: today,
        status: 'present',
        checkInTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      console.log(`  ✅ 출석 체크: ${attendanceRef.id}`);

      // 이용권 잔여 횟수 감소
      const passesSnapshot = await db.collection('member_passes')
        .where('memberId', '==', memberId)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!passesSnapshot.empty) {
        const passDoc = passesSnapshot.docs[0];
        const passData = passDoc.data();
        await passDoc.ref.update({
          remainingSessions: (passData.remainingSessions || 0) - 1,
          attendanceCount: (passData.attendanceCount || 0) + 1,
        });
        console.log(`  ✅ 이용권 업데이트: 잔여 ${passData.remainingSessions - 1}회`);
      }
    } catch (error) {
      console.error(`  ❌ 회원 ${i + 1} 출석 체크 실패:`, error);
    }
  }

  console.log(`\n✅ Step 9 완료: ${memberIds.length}명 출석 체크 완료`);
}

/**
 * 10. 공지사항 작성
 */
async function step10_CreateAnnouncement(clubId: string) {
  console.log('\n' + '='.repeat(80));
  console.log('📢 Step 10: 공지사항 작성');
  console.log('='.repeat(80));

  try {
    const announcementRef = db.collection('announcements').doc();
    await announcementRef.set({
      id: announcementRef.id,
      clubId: clubId,
      title: '12월 정기 승급 심사 안내',
      content: '12월 15일 정기 승급 심사가 있습니다. 참가 희망자는 신청해주세요.',
      author: '김관장',
      isPinned: true,
      createdAt: new Date().toISOString(),
    });
    console.log(`✅ 공지사항 작성: ${announcementRef.id}`);

    console.log('\n✅ Step 10 완료: 공지사항 작성 완료');
    return announcementRef.id;
  } catch (error) {
    console.error('❌ Step 10 실패:', error);
    throw error;
  }
}

/**
 * 11. 승급 심사 생성
 */
async function step11_CreateLevelTest(clubId: string) {
  console.log('\n' + '='.repeat(80));
  console.log('🥋 Step 11: 승급 심사 생성');
  console.log('='.repeat(80));

  try {
    const testRef = db.collection('level_tests').doc();
    await testRef.set({
      id: testRef.id,
      clubId: clubId,
      name: '12월 정기 승급 심사',
      date: '2025-12-15',
      location: '테스트 태권도장',
      status: 'upcoming',
      maxParticipants: 30,
      currentParticipants: 0,
      createdAt: new Date().toISOString(),
    });
    console.log(`✅ 승급 심사 생성: ${testRef.id}`);

    console.log('\n✅ Step 11 완료: 승급 심사 생성 완료');
    return testRef.id;
  } catch (error) {
    console.error('❌ Step 11 실패:', error);
    throw error;
  }
}

/**
 * 12. 대회 신청
 */
async function step12_RegisterForCompetition(competitionId: string, memberIds: string[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📝 Step 12: 대회 신청');
  console.log('='.repeat(80));

  for (let i = 0; i < memberIds.length; i++) {
    const memberId = memberIds[i];
    const memberData = TEST_DATA.members[i];
    console.log(`\n회원 ${i + 1}: ${memberData.name}`);

    try {
      const regRef = db.collection('competition_registrations').doc();
      await regRef.set({
        id: regRef.id,
        competitionId: competitionId,
        memberId: memberId,
        memberName: memberData.name,
        clubId: createdClubId,
        clubName: TEST_DATA.clubOwner.clubName,
        gender: memberData.gender,
        birthDate: memberData.dateOfBirth,
        age: new Date().getFullYear() - parseInt(memberData.dateOfBirth.split('-')[0]),
        registeredEvents: ['품새', '겨루기'],
        status: 'pending',
        registeredAt: new Date().toISOString(),
      });
      console.log(`  ✅ 대회 신청: ${regRef.id}`);
    } catch (error) {
      console.error(`  ❌ 회원 ${i + 1} 대회 신청 실패:`, error);
    }
  }

  console.log(`\n✅ Step 12 완료: ${memberIds.length}명 대회 신청 완료`);
}

/**
 * 13. 대회 결과 저장
 */
async function step13_SaveCompetitionResults(competitionId: string, memberIds: string[]) {
  console.log('\n' + '='.repeat(80));
  console.log('🏅 Step 13: 대회 결과 저장');
  console.log('='.repeat(80));

  const results = [
    { rank: 1, medal: 'gold', event: '품새', score: 9.5 },
    { rank: 2, medal: 'silver', event: '품새', score: 9.2 },
  ];

  for (let i = 0; i < memberIds.length; i++) {
    const memberId = memberIds[i];
    const memberData = TEST_DATA.members[i];
    const result = results[i];
    console.log(`\n회원 ${i + 1}: ${memberData.name}`);

    try {
      // 대회 신청 문서 찾기
      const registrationsSnapshot = await db.collection('competition_registrations')
        .where('competitionId', '==', competitionId)
        .where('memberId', '==', memberId)
        .limit(1)
        .get();

      if (!registrationsSnapshot.empty) {
        const regDoc = registrationsSnapshot.docs[0];
        
        // 결과 업데이트
        await regDoc.ref.update({
          status: 'completed',
          results: {
            [result.event]: {
              rank: result.rank,
              medal: result.medal,
              score: result.score,
            }
          },
          completedAt: new Date().toISOString(),
        });
        
        console.log(`  ✅ 결과 저장: ${result.rank}위 (${result.medal}) - ${result.event} ${result.score}점`);
      }
    } catch (error) {
      console.error(`  ❌ 회원 ${i + 1} 결과 저장 실패:`, error);
    }
  }

  // 대회 상태 업데이트
  try {
    await db.collection('competitions').doc(competitionId).update({
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
    console.log('\n✅ 대회 상태: completed로 변경');
  } catch (error) {
    console.error('❌ 대회 상태 업데이트 실패:', error);
  }

  console.log(`\n✅ Step 13 완료: ${memberIds.length}명 대회 결과 저장 완료`);
}

/**
 * 14. 결제 생성 (이용권 결제)
 */
async function step14_CreatePayments(clubId: string, memberIds: string[]) {
  console.log('\n' + '='.repeat(80));
  console.log('💳 Step 14: 결제 생성');
  console.log('='.repeat(80));

  for (let i = 0; i < memberIds.length; i++) {
    const memberId = memberIds[i];
    const memberData = TEST_DATA.members[i];
    console.log(`\n회원 ${i + 1}: ${memberData.name}`);

    try {
      // 이용권 찾기
      const passesSnapshot = await db.collection('member_passes')
        .where('memberId', '==', memberId)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!passesSnapshot.empty) {
        const passDoc = passesSnapshot.docs[0];
        const passData = passDoc.data();

        // 결제 생성
        const paymentRef = db.collection('payments').doc();
        await paymentRef.set({
          id: paymentRef.id,
          clubId: clubId,
          memberId: memberId,
          passId: passDoc.id,
          amount: 300000,
          method: 'card',
          status: 'completed',
          paidAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        
        console.log(`  ✅ 결제 생성: ${paymentRef.id} (300,000원)`);
      }
    } catch (error) {
      console.error(`  ❌ 회원 ${i + 1} 결제 생성 실패:`, error);
    }
  }

  console.log(`\n✅ Step 14 완료: ${memberIds.length}건 결제 생성 완료`);
}

/**
 * 결과 요약
 */
function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 시뮬레이션 결과 요약');
  console.log('='.repeat(80));
  console.log('\n✅ 생성된 데이터:');
  console.log(`  - 클럽: 1개`);
  console.log(`  - 회원: ${createdMemberIds.length}명`);
  console.log(`  - 이용권: ${createdMemberIds.length}개 (활성)`);
  console.log(`  - 수업: 2개 (초급반, 중급반)`);
  console.log(`  - 출석 기록: ${createdMemberIds.length}건`);
  console.log(`  - 공지사항: 1개`);
  console.log(`  - 승급 심사: 1개`);
  console.log(`  - 대회: 1개 (완료)`);
  console.log(`  - 대회 신청: ${createdMemberIds.length}건 (결과 저장됨)`);
  console.log(`  - 결제: ${createdMemberIds.length}건 (완료)`);
  console.log('\n🔐 테스트 계정:');
  console.log(`  클럽 오너: ${TEST_DATA.clubOwner.email} / ${TEST_DATA.clubOwner.password}`);
  TEST_DATA.members.forEach((m, i) => {
    console.log(`  회원 ${i + 1}: ${m.email} / ${m.password}`);
  });
  console.log('\n🌐 확인 가능한 페이지:');
  console.log('  1. /club-dashboard - 클럽 대시보드');
  console.log('  2. /club-dashboard/class-status - 출석 체크');
  console.log('  3. /club-dashboard/analytics - 통계 분석');
  console.log('  4. /dashboard - 회원 대시보드');
  console.log('  5. /competitions - 대회 목록');
  console.log('  6. /level-tests - 승급 심사');
  console.log('\n🎉 전체 시뮬레이션 완료!\n');
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 전체 워크플로우 시뮬레이션 시작');
  console.log('='.repeat(80));

  try {
    // Step 1: 클럽 오너 등록
    const { uid: ownerUid, requestId } = await step1_RegisterClubOwner();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: 클럽 오너 승인
    const clubId = await step2_ApproveClubOwner(ownerUid, requestId);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: 회원 가입
    const memberUids = await step3_RegisterMembers(clubId);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: 회원 승인
    await step4_ApproveMembers(clubId, memberUids);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 5: 이용권 템플릿 생성
    const templateId = await step5_CreatePassTemplate(clubId);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 6: 대회 개최
    const competitionId = await step6_CreateCompetition(clubId);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 7: 이용권 발급
    await step7_IssuePassesToMembers(clubId, templateId, createdMemberIds);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 8: 수업 생성
    const classIds = await step8_CreateClasses(clubId);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 9: 출석 체크
    await step9_RecordAttendance(clubId, createdMemberIds, classIds[0]);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 10: 공지사항 작성
    await step10_CreateAnnouncement(clubId);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 11: 승급 심사 생성
    await step11_CreateLevelTest(clubId);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 12: 대회 신청
    await step12_RegisterForCompetition(competitionId, createdMemberIds);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 13: 대회 결과 저장
    await step13_SaveCompetitionResults(competitionId, createdMemberIds);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 14: 결제 생성
    await step14_CreatePayments(clubId, createdMemberIds);

    // 결과 요약
    printSummary();

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 시뮬레이션 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main();

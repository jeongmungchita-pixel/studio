/**
 * 연맹 관리자 초대 수락 시뮬레이션
 * 
 * 이메일을 받은 후 초대 링크를 통한 가입 과정 테스트
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

async function testInviteAcceptance() {
  console.log('\n' + '='.repeat(80));
  console.log('🎉 연맹 관리자 초대 수락 시뮬레이션');
  console.log('='.repeat(80));

  try {
    // Step 1: 초대 목록 확인
    console.log('\n📋 Step 1: 대기 중인 초대 확인');
    const invitesSnapshot = await db
      .collection('federationAdminInvites')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (invitesSnapshot.empty) {
      console.log('❌ 대기 중인 초대가 없습니다.');
      console.log('먼저 test-invite-email.ts를 실행하여 초대를 생성하세요.');
      process.exit(1);
    }

    const inviteDoc = invitesSnapshot.docs[0];
    const invite = inviteDoc?.data();
    const inviteToken = inviteDoc.id;

    console.log('✅ 초대 정보:');
    console.log(`   - 이메일: ${invite.email}`);
    console.log(`   - 이름: ${invite.name}`);
    console.log(`   - 초대자: ${invite.invitedByName}`);
    console.log(`   - 토큰: ${inviteToken}`);
    console.log(`   - 만료일: ${invite.expiresAt}`);

    // Step 2: 초대 유효성 확인
    console.log('\n🔍 Step 2: 초대 유효성 확인');
    const now = new Date();
    const expiresAt = new Date(invite.expiresAt);

    if (now > expiresAt) {
      console.log('❌ 초대가 만료되었습니다.');
      process.exit(1);
    }

    if (invite.status !== 'pending') {
      console.log(`❌ 초대 상태가 올바르지 않습니다: ${invite.status}`);
      process.exit(1);
    }

    console.log('✅ 초대가 유효합니다.');

    // Step 3: Firebase Auth 사용자 생성 (실제로는 프론트엔드에서 수행)
    console.log('\n👤 Step 3: Firebase Auth 사용자 생성');
    
    let userRecord;
    try {
      // 이미 존재하는 사용자인지 확인
      userRecord = await auth.getUserByEmail(invite.email);
      console.log(`✅ 기존 사용자 발견: ${userRecord.uid}`);
    } catch (error: unknown) {
      if ((error as any).code === 'auth/user-not-found') {
        // 새 사용자 생성
        userRecord = await auth.createUser({
          email: invite.email,
          password: 'TestPassword123!', // 실제로는 사용자가 입력
          displayName: invite.name,
          phoneNumber: invite.phoneNumber,
        });
        console.log(`✅ 새 사용자 생성: ${userRecord.uid}`);
      } else {
        throw error;
      }
    }

    // Step 4: users 컬렉션에 프로필 생성
    console.log('\n📝 Step 4: 사용자 프로필 생성');
    
    const userProfile = {
      id: userRecord.uid,
      uid: userRecord.uid,
      email: invite.email,
      displayName: invite.name,
      phoneNumber: invite.phoneNumber || null,
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(invite.name)}&background=667eea&color=fff`,
      role: 'FEDERATION_ADMIN',
      provider: 'email',
      status: 'approved',
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await db.collection('users').doc(userRecord.uid).set(userProfile);
    console.log('✅ 사용자 프로필 생성 완료');

    // Step 5: 초대 상태 업데이트
    console.log('\n✅ Step 5: 초대 상태 업데이트');
    
    await db.collection('federationAdminInvites').doc(inviteToken).update({
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
      acceptedBy: userRecord.uid,
    });
    console.log('✅ 초대 수락 완료');

    // Step 6: Custom Claims 설정 (권한 부여)
    console.log('\n🔐 Step 6: 사용자 권한 설정');
    
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'FEDERATION_ADMIN',
    });
    console.log('✅ FEDERATION_ADMIN 권한 부여 완료');

    // 결과 요약
    console.log('\n' + '='.repeat(80));
    console.log('📊 가입 완료 요약');
    console.log('='.repeat(80));
    console.log('\n✅ 생성된 계정 정보:');
    console.log(`   - UID: ${userRecord.uid}`);
    console.log(`   - 이메일: ${invite.email}`);
    console.log(`   - 이름: ${invite.name}`);
    console.log(`   - 역할: FEDERATION_ADMIN`);
    console.log(`   - 상태: approved`);
    
    console.log('\n🔐 로그인 정보:');
    console.log(`   - 이메일: ${invite.email}`);
    console.log(`   - 비밀번호: TestPassword123!`);
    
    console.log('\n🌐 접속 가능한 페이지:');
    console.log('   1. /super-admin - 최고 관리자 대시보드');
    console.log('   2. /super-admin/invites - 초대 관리');
    console.log('   3. /admin/users - 사용자 관리');
    console.log('   4. /clubs - 클럽 목록');
    console.log('   5. /members - 회원 목록');
    
    console.log('\n🎉 연맹 관리자 가입 시뮬레이션 완료!\n');
    
    process.exit(0);
  } catch (error: unknown) {
    console.error('\n❌ 시뮬레이션 실패:', error);
    process.exit(1);
  }
}

// 실행
testInviteAcceptance();

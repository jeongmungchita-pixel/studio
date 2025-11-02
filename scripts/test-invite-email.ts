/**
 * 연맹 관리자 초대 이메일 테스트
 * 
 * Firestore에 초대 문서를 생성하여 이메일 발송 트리거 테스트
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = require('../serviceAccountKey.json');

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function testInviteEmail() {
  console.log('\n' + '='.repeat(80));
  console.log('📧 연맹 관리자 초대 이메일 테스트');
  console.log('='.repeat(80));

  try {
    // 초대 생성
    const inviteRef = db.collection('federationAdminInvites').doc();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7일 후 만료

    const inviteData = {
      email: 'wo1109ok@icloud.com', // 테스트 이메일
      name: '테스트 관리자',
      phoneNumber: '010-1234-5678',
      invitedBy: 'test-super-admin-uid',
      invitedByName: '최고 관리자',
      status: 'pending',
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };

    console.log('\n📝 초대 데이터:');
    console.log(JSON.stringify(inviteData, null, 2));

    console.log('\n⏳ Firestore에 초대 문서 생성 중...');
    await inviteRef.set(inviteData);
    
    console.log(`✅ 초대 문서 생성 완료: ${inviteRef.id}`);
    console.log(`\n📧 Firebase Functions가 자동으로 이메일을 발송합니다.`);
    console.log(`\n🔍 Firebase Console에서 Functions 로그를 확인하세요:`);
    console.log(`   https://console.firebase.google.com/project/studio-2481293716-bdd83/functions/logs`);
    console.log(`\n⏰ 잠시 후 (약 10-30초) 이메일이 발송됩니다.`);
    console.log(`\n📬 수신 이메일: ${inviteData.email}`);
    console.log(`\n초대 링크: https://gymnasticsfed--studio-2481293716-bdd83.asia-southeast1.hosted.app/invite/${inviteRef.id}`);
    
    console.log('\n✅ 테스트 완료!\n');
    process.exit(0);
  } catch (error: unknown) {
    console.error('\n❌ 테스트 실패:', error);
    process.exit(1);
  }
}

// 실행
testInviteEmail();

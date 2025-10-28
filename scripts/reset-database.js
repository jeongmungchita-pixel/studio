#!/usr/bin/env node

/**
 * 데이터베이스 리셋 스크립트
 * Superadmin을 제외한 모든 데이터를 삭제합니다.
 * 
 * 사용법: node scripts/reset-database.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('==================================================');
console.log('🚨 데이터베이스 초기화 스크립트');
console.log('==================================================');
console.log();
console.log('이 스크립트는 다음 작업을 수행합니다:');
console.log('  ✓ Superadmin (wo1109ok@me.com)을 제외한 모든 사용자 삭제');
console.log('  ✓ 모든 클럽 데이터 삭제');
console.log('  ✓ 모든 회원 데이터 삭제'); 
console.log('  ✓ 모든 수업, 패스, 결제 정보 삭제');
console.log('  ✓ 모든 대회, 이벤트, 공지사항 삭제');
console.log();
console.log('⚠️  경고: 이 작업은 되돌릴 수 없습니다!');
console.log();

rl.question('정말로 계속하시겠습니까? (yes/no): ', (answer) => {
  if (answer.toLowerCase() !== 'yes') {
    console.log('✅ 작업이 취소되었습니다.');
    rl.close();
    process.exit(0);
  }

  console.log();
  rl.question('확인을 위해 "RESET"을 입력하세요: ', async (confirmText) => {
    if (confirmText !== 'RESET') {
      console.log('❌ 확인 텍스트가 일치하지 않습니다. 작업이 취소되었습니다.');
      rl.close();
      process.exit(0);
    }

    console.log();
    console.log('🔄 데이터베이스 초기화를 시작합니다...');
    console.log();

    try {
      // Firebase Admin SDK 초기화
      const admin = require('firebase-admin');
      const serviceAccount = require('../service-account-key.json');

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }

      const db = admin.firestore();
      const auth = admin.auth();

      // Superadmin 이메일
      const SUPER_ADMIN_EMAIL = 'wo1109ok@me.com';
      
      // 1. Superadmin UID 찾기
      console.log('1️⃣ Superadmin 정보 확인 중...');
      const usersSnapshot = await db.collection('users').get();
      let superAdminUid = null;
      
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        if (userData.email === SUPER_ADMIN_EMAIL) {
          superAdminUid = doc.id;
          console.log(`   ✓ Superadmin 발견: ${SUPER_ADMIN_EMAIL} (UID: ${superAdminUid})`);
          break;
        }
      }

      if (!superAdminUid) {
        console.log('   ⚠️ Superadmin을 찾을 수 없습니다. 새로 생성이 필요합니다.');
      }

      // 2. 컬렉션 삭제
      const collections = [
        'clubs',
        'members', 
        'member_passes',
        'pass_templates',
        'attendance',
        'classes',
        'payments',
        'announcements',
        'level_tests',
        'competitions',
        'competition_registrations',
        'events',
        'event_registrations',
        'message_history',
        'media',
        'clubOwnerRequests',
        'federationAdminInvites',
        'memberRequests',
        'pass_renewal_requests',
        'committees',
        'committee_members'
      ];

      console.log();
      console.log('2️⃣ 컬렉션 데이터 삭제 중...');
      
      for (const collectionName of collections) {
        const collectionRef = db.collection(collectionName);
        const snapshot = await collectionRef.get();
        
        if (!snapshot.empty) {
          const batch = db.batch();
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          console.log(`   ✓ ${collectionName}: ${snapshot.size}개 문서 삭제`);
        } else {
          console.log(`   - ${collectionName}: 비어있음`);
        }
      }

      // 3. Users 컬렉션 처리 (Superadmin 제외)
      console.log();
      console.log('3️⃣ 사용자 데이터 삭제 중 (Superadmin 제외)...');
      
      const usersToDelete = [];
      usersSnapshot.docs.forEach(doc => {
        if (doc.id !== superAdminUid) {
          usersToDelete.push(doc);
        }
      });

      if (usersToDelete.length > 0) {
        const batch = db.batch();
        usersToDelete.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`   ✓ users: ${usersToDelete.length}개 문서 삭제`);
      }

      // 4. Firebase Auth 사용자 삭제 (Superadmin 제외)
      console.log();
      console.log('4️⃣ Firebase Auth 계정 삭제 중 (Superadmin 제외)...');
      
      let authDeleteCount = 0;
      const listUsersResult = await auth.listUsers();
      const uidsToDelete = [];
      
      for (const userRecord of listUsersResult.users) {
        if (userRecord.uid !== superAdminUid) {
          uidsToDelete.push(userRecord.uid);
        }
      }

      if (uidsToDelete.length > 0) {
        const deleteResult = await auth.deleteUsers(uidsToDelete);
        authDeleteCount = deleteResult.successCount;
        console.log(`   ✓ ${authDeleteCount}개 Auth 계정 삭제`);
        
        if (deleteResult.failureCount > 0) {
          console.log(`   ⚠️ ${deleteResult.failureCount}개 계정 삭제 실패`);
        }
      }

      console.log();
      console.log('==================================================');
      console.log('✅ 데이터베이스 초기화 완료!');
      console.log('==================================================');
      console.log();
      console.log('📊 초기화 결과:');
      console.log(`   • Firestore 문서: ${collections.length}개 컬렉션 초기화`);
      console.log(`   • Auth 계정: ${authDeleteCount}개 삭제`);
      console.log(`   • 보존된 Superadmin: ${SUPER_ADMIN_EMAIL}`);
      console.log();
      console.log('🎯 다음 단계:');
      console.log('   1. 브라우저에서 로그인: http://localhost:9002');
      console.log(`   2. Superadmin 계정으로 로그인: ${SUPER_ADMIN_EMAIL}`);
      console.log('   3. 필요한 초기 데이터 설정');
      console.log();

    } catch (error) {
      console.error('❌ 오류 발생:', error);
      process.exit(1);
    } finally {
      rl.close();
      process.exit(0);
    }
  });
});

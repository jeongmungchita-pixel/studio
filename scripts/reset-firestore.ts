/**
 * Firestore 데이터 초기화 스크립트
 * 
 * 최상위 관리자(wo1109ok@me.com)를 제외한:
 * - 모든 Firestore 데이터 삭제
 * - 모든 Firebase Auth 계정 삭제
 * 
 * 사용법:
 * npx tsx scripts/reset-firestore.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as readline from 'readline';

// Firebase Admin SDK 초기화
const serviceAccount = require('../serviceAccountKey.json');

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);
const auth = getAuth(app);

// 삭제할 컬렉션 목록 (모든 컬렉션)
const COLLECTIONS_TO_DELETE = [
  'users',
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
  'committee_members',
];

// 최상위 관리자 UID (보존할 사용자)
const SUPER_ADMIN_EMAIL = 'wo1109ok@me.com';
let SUPER_ADMIN_UID: string | null = null;

/**
 * 사용자 확인 프롬프트
 */
async function confirmDeletion(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      '\n⚠️  경고: 이 작업은 되돌릴 수 없습니다!\n' +
      `최상위 관리자(${SUPER_ADMIN_EMAIL})를 제외한:\n` +
      '- 모든 Firestore 데이터 삭제\n' +
      '- 모든 Firebase Auth 계정 삭제\n\n' +
      '계속하시겠습니까? (yes/no): ',
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes');
      }
    );
  });
}

/**
 * 최상위 관리자 UID 찾기
 */
async function findSuperAdminUid(): Promise<string | null> {
  console.log(`\n🔍 최상위 관리자 찾는 중... (${SUPER_ADMIN_EMAIL})`);
  
  const usersSnapshot = await db.collection('users').get();
  
  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    if (data.email === SUPER_ADMIN_EMAIL) {
      console.log(`✅ 최상위 관리자 발견: ${doc.id}`);
      return doc.id;
    }
  }
  
  console.log('⚠️  최상위 관리자를 찾을 수 없습니다. 모든 users 데이터가 삭제됩니다.');
  return null;
}

/**
 * 컬렉션의 모든 문서 삭제 (배치 처리)
 */
async function deleteCollection(collectionName: string, preserveUid?: string | null) {
  const collectionRef = db.collection(collectionName);
  const batchSize = 500;
  let deletedCount = 0;

  while (true) {
    const snapshot = await collectionRef.limit(batchSize).get();
    
    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      // users 컬렉션에서 최상위 관리자는 보존
      if (collectionName === 'users' && preserveUid && doc.id === preserveUid) {
        console.log(`  ⏭️  최상위 관리자 보존: ${doc.id}`);
        continue;
      }

      batch.delete(doc.ref);
      batchCount++;
    }

    if (batchCount > 0) {
      await batch.commit();
      deletedCount += batchCount;
      console.log(`  🗑️  ${collectionName}: ${deletedCount}개 문서 삭제됨...`);
    }

    // 더 이상 삭제할 문서가 없으면 종료
    if (snapshot.size < batchSize) {
      break;
    }
  }

  return deletedCount;
}

/**
 * Firebase Auth 사용자 삭제 (최상위 관리자 제외)
 */
async function deleteAuthUsers(superAdminUid: string | null): Promise<number> {
  console.log('\n👤 Firebase Auth 사용자 삭제 중...\n');
  
  let deletedCount = 0;
  let nextPageToken: string | undefined;

  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    const uidsToDelete: string[] = [];
    
    for (const userRecord of listUsersResult.users) {
      if (superAdminUid && userRecord.uid === superAdminUid) {
        console.log(`  ⏭️  최상위 관리자 보존: ${userRecord.email}`);
        continue;
      }
      uidsToDelete.push(userRecord.uid);
    }

    if (uidsToDelete.length > 0) {
      const deleteResult = await auth.deleteUsers(uidsToDelete);
      deletedCount += deleteResult.successCount;
      console.log(`  🗑️  Auth 사용자: ${deletedCount}개 계정 삭제됨...`);
      
      if (deleteResult.failureCount > 0) {
        console.error(`  ⚠️  ${deleteResult.failureCount}명 삭제 실패`);
      }
    }

    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  return deletedCount;
}

/**
 * 모든 컬렉션 삭제
 */
async function deleteAllCollections() {
  console.log('\n🗑️  Firestore 데이터 삭제 시작...\n');

  const results: { [key: string]: number } = {};

  for (const collectionName of COLLECTIONS_TO_DELETE) {
    try {
      console.log(`📦 ${collectionName} 컬렉션 삭제 중...`);
      
      const deletedCount = await deleteCollection(
        collectionName,
        collectionName === 'users' ? SUPER_ADMIN_UID : null
      );
      
      results[collectionName] = deletedCount;
      
      if (deletedCount === 0) {
        console.log(`  ℹ️  ${collectionName}: 삭제할 문서 없음\n`);
      } else {
        console.log(`  ✅ ${collectionName}: 총 ${deletedCount}개 문서 삭제 완료\n`);
      }
    } catch (error: unknown) {
      console.error(`  ❌ ${collectionName} 삭제 실패:`, error);
      results[collectionName] = -1;
    }
  }

  return results;
}

/**
 * 결과 요약 출력
 */
function printSummary(results: { [key: string]: number }) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 삭제 결과 요약');
  console.log('='.repeat(60) + '\n');

  let totalDeleted = 0;
  let successCount = 0;
  let emptyCount = 0;
  let errorCount = 0;

  for (const [_collection, count] of Object.entries(results)) {
    if (count > 0) {
      console.log(`✅ ${_collection.padEnd(30)} : ${count}개 삭제`);
      totalDeleted += count;
      successCount++;
    } else if (count === 0) {
      console.log(`ℹ️  ${_collection.padEnd(30)} : 비어있음`);
      emptyCount++;
    } else {
      console.log(`❌ ${_collection.padEnd(30)} : 삭제 실패`);
      errorCount++;
    }
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`총 삭제된 문서: ${totalDeleted}개`);
  console.log(`성공한 컬렉션: ${successCount}개`);
  console.log(`비어있는 컬렉션: ${emptyCount}개`);
  if (errorCount > 0) {
    console.log(`실패한 컬렉션: ${errorCount}개`);
  }
  console.log('='.repeat(60) + '\n');

  if (SUPER_ADMIN_UID) {
    console.log(`✅ 최상위 관리자(${SUPER_ADMIN_EMAIL})는 보존되었습니다.`);
  }
  console.log('\n🎉 초기화 완료!\n');
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔥 Firestore 데이터 초기화 스크립트');
  console.log('='.repeat(60));

  try {
    // 1. 사용자 확인
    const confirmed = await confirmDeletion();
    if (!confirmed) {
      console.log('\n❌ 작업이 취소되었습니다.\n');
      process.exit(0);
    }

    // 2. 최상위 관리자 UID 찾기
    SUPER_ADMIN_UID = await findSuperAdminUid();

    // 3. 모든 컬렉션 삭제
    const results = await deleteAllCollections();

    // 4. Firebase Auth 사용자 삭제
    const deletedAuthUsers = await deleteAuthUsers(SUPER_ADMIN_UID);
    results['auth_users'] = deletedAuthUsers;

    // 5. 결과 요약
    printSummary(results);

    process.exit(0);
  } catch (error: unknown) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main();

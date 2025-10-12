/**
 * Firestore 스키마 자동 수정
 * 
 * 검증에서 발견된 이슈를 자동으로 수정합니다.
 * 
 * 사용법:
 * npx tsx scripts/fix-firestore-schema.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as readline from 'readline';

const serviceAccount = require('../serviceAccountKey.json');

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

/**
 * 사용자 확인 프롬프트
 */
async function confirmFix(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      '\n⚠️  경고: Firestore 데이터를 수정합니다!\n' +
      '자동으로 수정 가능한 이슈만 처리됩니다.\n' +
      '백업을 권장합니다.\n\n' +
      '계속하시겠습니까? (yes/no): ',
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes');
      }
    );
  });
}

/**
 * id 필드 일관성 수정
 */
async function fixIdFields(collectionName: string): Promise<number> {
  console.log(`\n🔧 ${collectionName}: id 필드 수정 중...`);
  
  const snapshot = await db.collection(collectionName).get();
  let fixedCount = 0;
  const batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // id 필드가 없거나 문서 ID와 다른 경우
    if (!data.id || data.id !== doc.id) {
      batch.update(doc.ref, { id: doc.id });
      batchCount++;
      fixedCount++;

      if (batchCount >= 500) {
        await batch.commit();
        console.log(`  ✅ ${fixedCount}개 수정됨...`);
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`  ✅ 총 ${fixedCount}개 수정 완료`);
  return fixedCount;
}

/**
 * 필수 필드 추가
 */
async function addMissingRequiredFields(collectionName: string, requiredFields: string[]): Promise<number> {
  console.log(`\n🔧 ${collectionName}: 필수 필드 추가 중...`);
  
  const snapshot = await db.collection(collectionName).get();
  let fixedCount = 0;
  const batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates: Record<string, any> = {};

    for (const field of requiredFields) {
      if (!(field in data) || data[field] === null || data[field] === undefined) {
        // 기본값 설정
        if (field === 'id') {
          updates.id = doc.id;
        } else if (field === 'status') {
          updates.status = 'pending';
        } else if (field === 'createdAt') {
          updates.createdAt = new Date().toISOString();
        } else if (field === 'displayName' && data.email) {
          updates.displayName = data.email.split('@')[0];
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      batchCount++;
      fixedCount++;

      if (batchCount >= 500) {
        await batch.commit();
        console.log(`  ✅ ${fixedCount}개 수정됨...`);
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`  ✅ 총 ${fixedCount}개 수정 완료`);
  return fixedCount;
}

/**
 * 잘못된 enum 값 수정
 */
async function fixInvalidEnums(
  collectionName: string, 
  field: string, 
  validValues: string[], 
  defaultValue: string
): Promise<number> {
  console.log(`\n🔧 ${collectionName}: ${field} enum 값 수정 중...`);
  
  const snapshot = await db.collection(collectionName).get();
  let fixedCount = 0;
  const batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    if (field in data && !validValues.includes(data[field])) {
      batch.update(doc.ref, { [field]: defaultValue });
      batchCount++;
      fixedCount++;
      console.log(`  ⚠️  ${doc.id}: ${data[field]} → ${defaultValue}`);

      if (batchCount >= 500) {
        await batch.commit();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`  ✅ 총 ${fixedCount}개 수정 완료`);
  return fixedCount;
}

/**
 * 예상치 못한 필드 제거
 */
async function removeUnexpectedFields(
  collectionName: string, 
  expectedFields: string[]
): Promise<number> {
  console.log(`\n🔧 ${collectionName}: 예상치 못한 필드 제거 중...`);
  
  const snapshot = await db.collection(collectionName).limit(10).get(); // 샘플만 확인
  const unexpectedFields = new Set<string>();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    for (const field of Object.keys(data)) {
      if (!expectedFields.includes(field)) {
        unexpectedFields.add(field);
      }
    }
  }

  if (unexpectedFields.size === 0) {
    console.log(`  ✅ 예상치 못한 필드 없음`);
    return 0;
  }

  console.log(`  ⚠️  발견된 예상치 못한 필드: ${Array.from(unexpectedFields).join(', ')}`);
  console.log(`  ℹ️  수동 확인 필요 - 자동 삭제하지 않음`);
  
  return 0;
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 Firestore 스키마 자동 수정');
  console.log('='.repeat(80));

  try {
    // 사용자 확인
    const confirmed = await confirmFix();
    if (!confirmed) {
      console.log('\n❌ 작업이 취소되었습니다.\n');
      process.exit(0);
    }

    let totalFixed = 0;

    // 1. users 컬렉션
    console.log('\n📦 users 컬렉션 수정');
    totalFixed += await fixIdFields('users');
    totalFixed += await addMissingRequiredFields('users', ['id', 'uid', 'email', 'displayName', 'role', 'status']);
    totalFixed += await fixInvalidEnums('users', 'status', ['pending', 'approved', 'rejected'], 'pending');

    // 2. clubs 컬렉션
    console.log('\n📦 clubs 컬렉션 수정');
    totalFixed += await fixIdFields('clubs');
    totalFixed += await addMissingRequiredFields('clubs', ['id', 'name']);

    // 3. members 컬렉션
    console.log('\n📦 members 컬렉션 수정');
    totalFixed += await fixIdFields('members');
    totalFixed += await addMissingRequiredFields('members', ['id', 'name', 'clubId', 'status']);
    totalFixed += await fixInvalidEnums('members', 'status', ['active', 'inactive', 'pending'], 'pending');
    totalFixed += await fixInvalidEnums('members', 'gender', ['male', 'female'], 'male');

    // 4. member_passes 컬렉션
    console.log('\n📦 member_passes 컬렉션 수정');
    totalFixed += await fixIdFields('member_passes');
    totalFixed += await fixInvalidEnums('member_passes', 'status', ['active', 'expired', 'pending'], 'pending');

    // 5. pass_templates 컬렉션
    console.log('\n📦 pass_templates 컬렉션 수정');
    totalFixed += await fixIdFields('pass_templates');
    totalFixed += await fixInvalidEnums('pass_templates', 'type', ['period', 'session'], 'period');

    // 결과 요약
    console.log('\n' + '='.repeat(80));
    console.log('📊 수정 완료');
    console.log('='.repeat(80));
    console.log(`\n총 ${totalFixed}개 이슈 수정됨\n`);
    console.log('✅ 스키마 수정 완료!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main();

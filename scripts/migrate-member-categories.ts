/**
 * 기존 회원 데이터에 memberCategory 필드 추가
 * 
 * 실행 방법:
 * npx ts-node scripts/migrate-member-categories.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// Firebase Admin 초기화
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

try {
  initializeApp({
    credential: cert(serviceAccountPath)
  });
} catch (error) {
  console.log('Firebase already initialized or error:', error);
}

const db = getFirestore();

/**
 * 생년월일로 나이 계산
 */
function calculateAge(dateOfBirth?: string): number {
  if (!dateOfBirth) return 0;
  
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * 회원 분류 결정
 */
function determineMemberCategory(dateOfBirth?: string): 'adult' | 'child' {
  const age = calculateAge(dateOfBirth);
  return age >= 19 ? 'adult' : 'child';
}

async function migrateMemberCategories() {
  console.log('🚀 회원 분류 마이그레이션 시작...\n');

  try {
    // 모든 회원 조회
    const membersSnapshot = await db.collection('members').get();
    
    if (membersSnapshot.empty) {
      console.log('⚠️  회원 데이터가 없습니다.');
      return;
    }

    console.log(`📊 총 ${membersSnapshot.size}명의 회원 발견\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit

    for (const doc of membersSnapshot.docs) {
      const member = doc.data();
      
      // 이미 memberCategory가 있으면 스킵
      if (member.memberCategory) {
        skippedCount++;
        console.log(`⏭️  ${member.name}: 이미 분류 설정됨 (${member.memberCategory})`);
        continue;
      }

      // memberCategory 결정
      const memberCategory = determineMemberCategory(member.dateOfBirth);
      const age = calculateAge(member.dateOfBirth);

      // 업데이트
      batch.update(doc.ref, {
        memberCategory,
        updatedAt: new Date().toISOString(),
      });

      batchCount++;
      updatedCount++;

      console.log(`✅ ${member.name}: ${age}세 → ${memberCategory === 'adult' ? '성인' : '주니어'}`);

      // Batch 크기 제한 확인
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`\n💾 ${batchCount}개 배치 커밋 완료\n`);
        batchCount = 0;
      }
    }

    // 남은 배치 커밋
    if (batchCount > 0) {
      await batch.commit();
      console.log(`\n💾 마지막 ${batchCount}개 배치 커밋 완료\n`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✨ 마이그레이션 완료!');
    console.log('='.repeat(50));
    console.log(`📊 통계:`);
    console.log(`  - 업데이트: ${updatedCount}명`);
    console.log(`  - 스킵: ${skippedCount}명`);
    console.log(`  - 오류: ${errorCount}명`);
    console.log(`  - 총: ${membersSnapshot.size}명`);
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    throw error;
  }
}

// 실행
migrateMemberCategories()
  .then(() => {
    console.log('✅ 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실패:', error);
    process.exit(1);
  });

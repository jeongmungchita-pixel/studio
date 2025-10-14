/**
 * 기존 이용권 템플릿과 수업에 targetCategory 필드 추가
 * 
 * 실행 방법:
 * npx ts-node scripts/migrate-target-category.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin 초기화
const app = initializeApp();
const db = getFirestore(app);

async function migratePassTemplates() {
  console.log('📋 이용권 템플릿 마이그레이션 시작...');
  
  const templatesSnapshot = await db.collection('pass_templates').get();
  const batch = db.batch();
  let count = 0;
  
  templatesSnapshot.forEach((doc) => {
    const data = doc.data();
    
    // targetCategory가 없는 경우에만 추가
    if (!data.targetCategory) {
      batch.update(doc.ref, {
        targetCategory: 'all', // 기본값: 전체
      });
      count++;
    }
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`✅ ${count}개의 이용권 템플릿에 targetCategory 추가 완료`);
  } else {
    console.log('✅ 이미 모든 이용권 템플릿에 targetCategory가 있습니다.');
  }
}

async function migrateGymClasses() {
  console.log('📋 수업 마이그레이션 시작...');
  
  const classesSnapshot = await db.collection('gym_classes').get();
  const batch = db.batch();
  let count = 0;
  
  classesSnapshot.forEach((doc) => {
    const data = doc.data();
    
    // targetCategory가 없는 경우에만 추가
    if (!data.targetCategory) {
      batch.update(doc.ref, {
        targetCategory: 'all', // 기본값: 전체
      });
      count++;
    }
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`✅ ${count}개의 수업에 targetCategory 추가 완료`);
  } else {
    console.log('✅ 이미 모든 수업에 targetCategory가 있습니다.');
  }
}

async function migrateMembers() {
  console.log('📋 회원 memberCategory 마이그레이션 시작...');
  
  const membersSnapshot = await db.collection('members').get();
  const batch = db.batch();
  let count = 0;
  
  membersSnapshot.forEach((doc) => {
    const data = doc.data();
    
    // memberCategory가 없는 경우 나이로 판단하여 추가
    if (!data.memberCategory && data.dateOfBirth) {
      const birthDate = new Date(data.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      const memberCategory = age >= 19 ? 'adult' : 'child';
      
      batch.update(doc.ref, {
        memberCategory,
      });
      count++;
    }
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`✅ ${count}명의 회원에 memberCategory 추가 완료`);
  } else {
    console.log('✅ 이미 모든 회원에 memberCategory가 있습니다.');
  }
}

async function main() {
  try {
    console.log('🚀 데이터 마이그레이션 시작\n');
    
    await migratePassTemplates();
    console.log('');
    
    await migrateGymClasses();
    console.log('');
    
    await migrateMembers();
    console.log('');
    
    console.log('✅ 모든 마이그레이션 완료!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

main();

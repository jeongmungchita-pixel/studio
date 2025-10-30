/**
 * Firebase Admin SDK 디버깅 유틸리티
 */

export function debugAdminSDK() {
  console.log('🔍 Firebase Admin SDK 디버깅 정보:');
  
  // 환경 변수 확인
  console.log('📋 환경 변수:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- FIREBASE_CONFIG:', process.env.FIREBASE_CONFIG ? '설정됨' : '없음');
  console.log('- GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? '설정됨' : '없음');
  
  // 서비스 계정 키 파일 확인
  const fs = require('fs');
  const path = require('path');
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
  console.log('- serviceAccountKey.json:', fs.existsSync(serviceAccountPath) ? '존재함' : '없음');
  
  // Firebase Admin Apps 확인
  try {
    const { getApps } = require('firebase-admin/app');
    const apps = getApps();
    console.log('- 초기화된 앱 수:', apps.length);
    
    if (apps.length > 0) {
      console.log('- 앱 이름들:', apps.map((app: any) => app.name));
    }
  } catch (error) {
    console.error('- Firebase Admin 앱 확인 실패:', error);
  }
}

export function testAdminConnection() {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('🧪 Firebase Admin 연결 테스트 시작...');
      
      const { adminAuth, adminDb } = await import('@/firebase/admin');
      
      if (!adminAuth || !adminDb) {
        throw new Error('Admin SDK가 초기화되지 않음');
      }
      
      // Firestore 연결 테스트
      console.log('📊 Firestore 연결 테스트...');
      const testCollection = adminDb.collection('_test');
      const testDoc = testCollection.doc('connection-test');
      
      await testDoc.set({
        timestamp: new Date(),
        test: true
      });
      
      const doc = await testDoc.get();
      if (!doc.exists) {
        throw new Error('Firestore 쓰기/읽기 실패');
      }
      
      await testDoc.delete();
      console.log('✅ Firestore 연결 성공');
      
      // Auth 연결 테스트
      console.log('🔐 Firebase Auth 연결 테스트...');
      const users = await adminAuth.listUsers(1);
      console.log('✅ Firebase Auth 연결 성공, 사용자 수:', users.users.length);
      
      resolve({
        success: true,
        firestore: true,
        auth: true,
        userCount: users.users.length
      });
      
    } catch (error) {
      console.error('❌ Admin 연결 테스트 실패:', error);
      reject(error);
    }
  });
}

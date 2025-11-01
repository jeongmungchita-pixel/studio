/**
 * Firebase Admin SDK 디버깅 유틸리티
 */

export function debugAdminSDK() {
  
  // 환경 변수 확인
  
  // 서비스 계정 키 파일 확인
  const fs = require('fs');
  const path = require('path');
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
  
  // Firebase Admin Apps 확인
  try {
    const { getApps } = require('firebase-admin/app');
    const apps = getApps();
    
    if (apps.length > 0) {
    }
  } catch (error: unknown) {
  }
}

export function testAdminConnection() {
  return new Promise(async (resolve, reject) => {
    try {
      
      const { adminAuth, adminDb } = await import('@/firebase/admin');
      
      if (!adminAuth || !adminDb) {
        throw new Error('Admin SDK가 초기화되지 않음');
      }
      
      // Firestore 연결 테스트
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
      
      // Auth 연결 테스트
      const users = await adminAuth.listUsers(1);
      
      resolve({
        success: true,
        firestore: true,
        auth: true,
        userCount: users.users.length
      });
      
    } catch (error: unknown) {
      reject(error);
    }
  });
}

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

let app: App;

if (!getApps().length) {
  try {
    // 서비스 계정 키 파일 경로
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
    
    // 파일이 존재하는지 확인
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      throw new Error('serviceAccountKey.json 파일을 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('Firebase Admin 초기화 실패:', error);
    throw error;
  }
} else {
  app = getApps()[0];
}

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

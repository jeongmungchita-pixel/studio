import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

let app: App;

if (!getApps().length) {
  try {
    // 프로덕션 환경에서는 Firebase App Hosting이 자동으로 인증 제공
    if (process.env.FIREBASE_CONFIG) {
      console.log('Firebase App Hosting 환경에서 Admin 초기화');
      app = initializeApp();
    } else {
      // 로컬 개발 환경에서는 서비스 계정 키 사용
      const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        console.log('서비스 계정 키로 Firebase Admin 초기화');
        app = initializeApp({
          credential: cert(serviceAccount),
        });
      } else {
        console.warn('serviceAccountKey.json 파일이 없습니다. 기본 인증 사용');
        app = initializeApp();
      }
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

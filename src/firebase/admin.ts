import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let app: App | undefined;

// Ensure this file is only evaluated in a server context
const isServer = typeof window === 'undefined';

if (isServer) {
  if (!getApps().length) {
    try {
      // 로컬 개발 환경에서는 서비스 계정 키 사용
      const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        console.log('🔑 서비스 계정 키 파일 발견, Admin SDK 초기화 중...');
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        app = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id,
        });
        console.log('✅ Firebase Admin SDK 초기화 완료');
      } else if (process.env.FIREBASE_CONFIG) {
        // 프로덕션 환경에서는 Firebase App Hosting이 자동으로 인증 제공
        console.log('🌐 프로덕션 환경, 자동 인증 사용');
        app = initializeApp();
      } else {
        console.warn('⚠️ 서비스 계정 키 또는 FIREBASE_CONFIG 없음, 기본 초기화 시도');
        app = initializeApp();
      }
    } catch (error) {
      console.error('❌ Firebase Admin SDK 초기화 실패:', error);
      throw error;
    }
  } else {
    app = getApps()[0];
    console.log('🔄 기존 Firebase Admin 앱 재사용');
  }
}

export const adminAuth = isServer && app ? getAuth(app) : (undefined as any);
export const adminDb = isServer && app ? getFirestore(app) : (undefined as any);

export function initializeAdmin() {
  // 이미 초기화되어 있으므로 아무것도 하지 않음
  return { adminAuth, adminDb };
}

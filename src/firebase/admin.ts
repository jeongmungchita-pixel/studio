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
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        app = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id,
        });
      } else if (process.env.FIREBASE_CONFIG) {
        // 프로덕션 환경에서는 Firebase App Hosting이 자동으로 인증 제공
        app = initializeApp();
      } else {
        app = initializeApp();
      }
    } catch (error: unknown) {
      throw error;
    }
  } else {
    app = getApps()[0];
  }
}
export const adminAuth = isServer && app ? getAuth(app) : (undefined as any);
export const adminDb = isServer && app ? getFirestore(app) : (undefined as any);
export function initializeAdmin() {
  // 이미 초기화되어 있으므로 아무것도 하지 않음
  return { adminAuth, adminDb };
}

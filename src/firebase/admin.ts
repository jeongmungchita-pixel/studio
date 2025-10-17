import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let app: App;

if (!getApps().length) {
  try {
    // 프로덕션 환경에서는 Firebase App Hosting이 자동으로 인증 제공
    if (process.env.FIREBASE_CONFIG) {
      app = initializeApp();
    } else {
      // 로컬 개발 환경에서는 서비스 계정 키 사용
      const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        app = initializeApp({
          credential: cert(serviceAccount),
        });
      } else {
        app = initializeApp();
      }
    }
  } catch (error) {
    throw error;
  }
} else {
  app = getApps()[0];
}

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

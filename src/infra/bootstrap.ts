/**
 * Firebase 인프라 싱글톤 부트스트랩
 * - SDK 인스턴스는 싱글톤 수명 유지
 * - 접근은 주입을 통해 제어
 * - Admin SDK만 사용 (클라이언트 SDK와 분리)
 */
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// Firebase Admin App 싱글톤
let _adminApp: App | null = null;
let _adminAuth: ReturnType<typeof getAuth> | null = null;
let _adminFirestore: ReturnType<typeof getFirestore> | null = null;
let _adminStorage: ReturnType<typeof getStorage> | null = null;

/**
 * Firebase Admin App 싱글톤
 */
export function adminAppSingleton(): App {
  if (_adminApp) return _adminApp;
  
  if (!getApps().length) {
    // 환경 변수에 따라 초기화
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      _adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      });
    } else {
      // 개발 환경에서는 기본 초기화
      _adminApp = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      });
    }
  } else {
    _adminApp = getApps()[0];
  }
  
  return _adminApp;
}

/**
 * Firebase Admin Auth 싱글톤
 */
export function authSingleton() {
  if (_adminAuth) return _adminAuth;
  _adminAuth = getAuth(adminAppSingleton());
  return _adminAuth;
}

/**
 * Firebase Admin Firestore 싱글톤
 */
export function firestoreSingleton(): ReturnType<typeof getFirestore> {
  if (_adminFirestore) return _adminFirestore;
  _adminFirestore = getFirestore(adminAppSingleton());
  return _adminFirestore;
}

/**
 * Firebase Admin Storage 싱글톤
 */
export function storageSingleton() {
  if (_adminStorage) return _adminStorage;
  _adminStorage = getStorage(adminAppSingleton());
  return _adminStorage;
}

/**
 * 테스트용 리셋 함수
 */
export function resetFirebaseSingletons() {
  _adminApp = null;
  _adminAuth = null;
  _adminFirestore = null;
  _adminStorage = null;
}

// 타입 내보내기 (Admin SDK 타입만)
export type AdminAuth = ReturnType<typeof authSingleton>;
export type AdminFirestore = ReturnType<typeof firestoreSingleton>;
export type AdminStorage = ReturnType<typeof storageSingleton>;

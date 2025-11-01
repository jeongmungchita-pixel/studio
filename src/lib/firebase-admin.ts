import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { userCache, cacheKeys } from '@/lib/cache';
let adminApp: App;
/**
 * Initialize Firebase Admin SDK
 * Service account key should be in environment variable
 */
export function initAdmin() {
  if (!adminApp) {
    // Check if any admin apps already exist
    const apps = getApps();
    if (apps.length > 0) {
      adminApp = apps[0];
    } else {
      // Initialize with service account if available
      const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKey) {
        try {
          const serviceAccount = JSON.parse(serviceAccountKey);
          adminApp = initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id,
          });
        } catch (error: unknown) {
          // Fallback to application default credentials
          adminApp = initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-2481293716-bdd83',
          });
        }
      } else {
        // Initialize with project ID only for local development
        // This will use Firebase Auth emulator if FIREBASE_AUTH_EMULATOR_HOST is set
        adminApp = initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-2481293716-bdd83',
        });
      }
    }
  }
  return adminApp;
}
/**
 * Get Admin Auth instance
 */
export function getAdminAuth() {
  initAdmin();
  return getAuth(adminApp);
}
/**
 * Get Admin Firestore instance
 */
export function getAdminFirestore() {
  initAdmin();
  return getFirestore(adminApp);
}
/**
 * Verify ID token and get user claims
 */
export async function verifyIdToken(token: string) {
  const auth = getAdminAuth();
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error: unknown) {
    return null;
  }
}
/**
 * Get user role from Firestore with caching
 * @param uid User ID
 * @param useCache Whether to use cache (default: true)
 * @returns User role and status information
 */
export async function getUserRole(uid: string, useCache: boolean = true) {
  // Try cache first if enabled
  if (useCache) {
    const cacheKey = cacheKeys.userRole(uid);
    const cached = userCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }
  // Fetch from Firestore
  const db = getAdminFirestore();
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc?.exists) {
    return null;
  }
  const userData = userDoc?.data();
  const userInfo = {
    role: userData?.role,
    status: userData?.status,
    clubId: userData?.clubId,
    clubName: userData?.clubName,
  };
  // Cache the result if caching is enabled
  if (useCache && userInfo) {
    const cacheKey = cacheKeys.userRole(uid);
    userCache.set(cacheKey, userInfo, 5 * 60 * 1000); // 5 minutes
  }
  return userInfo;
}

/**
 * Admin debug utilities
 * Minimal implementation for debug endpoint
 */
import { adminAuth, adminDb } from '@/firebase/admin';

/**
 * Debug Admin SDK configuration
 */
export function debugAdminSDK() {
  return {
    auth: {
      available: !!adminAuth,
      initialized: true
    },
    firestore: {
      available: !!adminDb,
      initialized: true
    }
  };
}

/**
 * Test Admin connection
 */
export async function testAdminConnection() {
  try {
    // Test Firestore connection
    const testDoc = await adminDb.collection('_test_').doc('connection').get();
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      firestoreConnected: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

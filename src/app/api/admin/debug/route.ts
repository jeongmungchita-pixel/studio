import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/firebase/admin';
import { debugAdminSDK, testAdminConnection } from '@/lib/admin-debug';
const SUPER_ADMIN_EMAIL = 'wo1109ok@me.com';
export async function GET(request: NextRequest) {
  try {
    // 1. 인증 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    const token = authHeader.substring(7);
    // Admin SDK 초기화 확인
    if (!adminAuth || !adminDb) {
      debugAdminSDK();
      return NextResponse.json(
        { 
          error: 'Firebase Admin SDK가 초기화되지 않음',
          debug: '콘솔 로그를 확인하세요'
        },
        { status: 500 }
      );
    }
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (tokenError: unknown) {
      return NextResponse.json(
        { 
          error: '토큰 검증 실패',
          details: tokenError instanceof Error ? tokenError.message : '알 수 없는 오류'
        },
        { status: 401 }
      );
    }
    // 2. 권한 확인
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc?.data();
    const isAuthorized = userData?.email === SUPER_ADMIN_EMAIL || 
                        userData?.role === 'SUPER_ADMIN';
    if (!isAuthorized) {
      return NextResponse.json(
        { error: '최상위 관리자만 접근할 수 있습니다.' },
        { status: 403 }
      );
    }
    // 3. 디버깅 정보 수집
    debugAdminSDK();
    // 4. 연결 테스트
    const connectionTest = await testAdminConnection();
    // 5. 컬렉션 통계
    const collections = [
      'users', 'clubs', 'members', 'member_passes', 'attendance',
      'classes', 'payments', 'announcements', 'events'
    ];
    const collectionStats: Record<string, number> = {};
    for (const collectionName of collections) {
      try {
        const snapshot = await adminDb.collection(collectionName).limit(1).get();
        const countSnapshot = await adminDb.collection(collectionName).count().get();
        collectionStats[collectionName] = countSnapshot.data().count;
      } catch (error: unknown) {
        collectionStats[collectionName] = -1;
      }
    }
    // 6. Auth 사용자 통계
    let authUserCount = 0;
    try {
      const listUsersResult = await adminAuth.listUsers(1000);
      authUserCount = listUsersResult.users.length;
    } catch (error: unknown) {
      authUserCount = -1;
    }
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      _user: {
        uid: decodedToken.uid,
        email: userData?.email,
        role: userData?.role,
      },
      adminSDK: {
        initialized: true,
        authAvailable: !!adminAuth,
        firestoreAvailable: !!adminDb,
      },
      connectionTest,
      statistics: {
        collections: collectionStats,
        authUsers: authUserCount,
        totalFirestoreDocuments: Object.values(collectionStats)
          .filter(count => count > 0)
          .reduce((sum, count) => sum + count, 0),
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasFirebaseConfig: !!process.env.FIREBASE_CONFIG,
        hasGoogleCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      }
    });
  } catch (error: unknown) {
    debugAdminSDK();
    return NextResponse.json(
      { 
        error: 'Debug API 실행 중 오류 발생',
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : '알 수 없는 오류',
        debug: '콘솔 로그를 확인하세요'
      },
      { status: 500 }
    );
  }
}

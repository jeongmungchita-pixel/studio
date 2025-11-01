import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/firebase/admin';
// 삭제할 컬렉션 목록
const COLLECTIONS_TO_DELETE = [
  'clubs',
  'members',
  'member_passes',
  'pass_templates',
  'attendance',
  'classes',
  'payments',
  'announcements',
  'level_tests',
  'competitions',
  'competition_registrations',
  'events',
  'event_registrations',
  'message_history',
  'media',
  'clubOwnerRequests',
  'federationAdminInvites',
  'memberRequests',
  'pass_renewal_requests',
  'committees',
  'committee_members',
];
const SUPER_ADMIN_EMAIL = 'wo1109ok@me.com';
/**
 * 컬렉션의 모든 문서 삭제 (배치 처리)
 */
async function deleteCollection(collectionName: string, preserveUid?: string | null) {
  const collectionRef = adminDb.collection(collectionName);
  const batchSize = 500;
  let deletedCount = 0;
  while (true) {
    const snapshot = await collectionRef.limit(batchSize).get();
    if (snapshot.empty) {
      break;
    }
    const batch = adminDb.batch();
    let batchCount = 0;
    for (const doc of snapshot.docs) {
      // users 컬렉션에서 최상위 관리자는 보존
      if (collectionName === 'users' && preserveUid && doc.id === preserveUid) {
        continue;
      }
      batch.delete(doc.ref);
      batchCount++;
    }
    if (batchCount > 0) {
      await batch.commit();
      deletedCount += batchCount;
    }
    if (snapshot.size < batchSize) {
      break;
    }
  }
  return deletedCount;
}
/**
 * 최상위 관리자 UID 찾기
 */
async function findSuperAdminUid(): Promise<string | null> {
  const usersSnapshot = await adminDb.collection('users').get();
  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    if (data.email === SUPER_ADMIN_EMAIL) {
      return doc.id;
    }
  }
  return null;
}
/**
 * Firebase Auth 사용자 삭제 (최상위 관리자 제외)
 */
async function deleteAuthUsers(superAdminUid: string | null): Promise<number> {
  let deletedCount = 0;
  let nextPageToken: string | undefined;
  do {
    // 최대 1000명씩 조회
    const listUsersResult = await adminAuth.listUsers(1000, nextPageToken);
    const uidsToDelete: string[] = [];
    for (const userRecord of listUsersResult.users) {
      // 최상위 관리자는 건너뛰기
      if (superAdminUid && userRecord.uid === superAdminUid) {
        continue;
      }
      uidsToDelete.push(userRecord.uid);
    }
    // 배치로 삭제
    if (uidsToDelete.length > 0) {
      const deleteResult = await adminAuth.deleteUsers(uidsToDelete);
      deletedCount += deleteResult.successCount;
      if (deleteResult.failureCount > 0) {
      }
    }
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);
  return deletedCount;
}
export async function POST(request: NextRequest) {
  try {
    // Admin SDK 초기화 확인
    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { 
          error: 'Firebase Admin SDK 초기화 오류',
          details: 'adminAuth 또는 adminDb가 undefined입니다.'
        },
        { status: 500 }
      );
    }
    // 1. 인증 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    const token = authHeader.substring(7);
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (tokenError: unknown) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }
    // 2. 최상위 관리자 권한 확인
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc?.data();
    if (!userData) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    // 이메일 또는 역할로 권한 확인
    const isAuthorized = userData.email === SUPER_ADMIN_EMAIL || 
                        userData.role === 'SUPER_ADMIN';
    if (!isAuthorized) {
      return NextResponse.json(
        { error: '최상위 관리자만 실행할 수 있습니다.' },
        { status: 403 }
      );
    }
    // 3. 최상위 관리자 UID 찾기
    const superAdminUid = await findSuperAdminUid();
    // 4. 모든 컬렉션 삭제
    const results: { [key: string]: number } = {};
    for (const collectionName of COLLECTIONS_TO_DELETE) {
      try {
        const deletedCount = await deleteCollection(collectionName);
        results[collectionName] = deletedCount;
      } catch (error: unknown) {
        results[collectionName] = -1;
      }
    }
    // 5. users 컬렉션 처리 (최상위 관리자 제외)
    try {
      const deletedCount = await deleteCollection('users', superAdminUid);
      results['users'] = deletedCount;
    } catch (error: unknown) {
      results['users'] = -1;
    }
    // 6. Firebase Auth 사용자 삭제 (최상위 관리자 제외)
    let deletedAuthUsers = 0;
    try {
      deletedAuthUsers = await deleteAuthUsers(superAdminUid);
      results['auth_users'] = deletedAuthUsers;
    } catch (error: unknown) {
      results['auth_users'] = -1;
    }
    // 7. 통계 계산
    const totalDeleted = Object.values(results).reduce((sum, count) => 
      count > 0 ? sum + count : sum, 0
    );
    return NextResponse.json({
      success: true,
      message: 'Firestore 데이터 및 Auth 계정이 초기화되었습니다.',
      results,
      totalDeleted,
      deletedAuthUsers,
      preservedAdmin: superAdminUid ? SUPER_ADMIN_EMAIL : null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { 
        error: '초기화 중 오류가 발생했습니다.',
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

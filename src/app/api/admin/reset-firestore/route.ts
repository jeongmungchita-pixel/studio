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
    console.log('🔥 Reset Firestore API 호출됨');
    console.log('🔧 Admin SDK 상태:', {
      adminAuth: !!adminAuth,
      adminDb: !!adminDb,
      nodeEnv: process.env.NODE_ENV,
      firebaseConfig: !!process.env.FIREBASE_CONFIG
    });

    // Admin SDK 초기화 확인
    if (!adminAuth || !adminDb) {
      console.error('❌ Firebase Admin SDK가 초기화되지 않음');
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
    console.log('🔑 Authorization 헤더:', authHeader ? '존재함' : '없음');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('🎫 토큰 길이:', token.length);

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log('✅ 토큰 검증 성공, UID:', decodedToken.uid);
    } catch (tokenError) {
      console.error('❌ 토큰 검증 실패:', tokenError);
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    // 2. 최상위 관리자 권한 확인
    console.log('👤 사용자 문서 조회 중...');
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();

    console.log('📄 사용자 데이터:', {
      exists: userDoc.exists,
      email: userData?.email,
      role: userData?.role,
      expectedEmail: SUPER_ADMIN_EMAIL
    });

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
      console.log('❌ 권한 없음:', {
        userEmail: userData.email,
        userRole: userData.role,
        requiredEmail: SUPER_ADMIN_EMAIL
      });
      return NextResponse.json(
        { error: '최상위 관리자만 실행할 수 있습니다.' },
        { status: 403 }
      );
    }

    console.log('✅ 권한 확인 완료');

    // 3. 최상위 관리자 UID 찾기
    console.log('🔍 최상위 관리자 UID 찾는 중...');
    const superAdminUid = await findSuperAdminUid();
    console.log('👑 최상위 관리자 UID:', superAdminUid);

    // 4. 모든 컬렉션 삭제
    console.log('🗑️ 컬렉션 삭제 시작...');
    const results: { [key: string]: number } = {};

    for (const collectionName of COLLECTIONS_TO_DELETE) {
      try {
        console.log(`📁 ${collectionName} 컬렉션 삭제 중...`);
        const deletedCount = await deleteCollection(collectionName);
        results[collectionName] = deletedCount;
        console.log(`✅ ${collectionName}: ${deletedCount}개 문서 삭제됨`);
      } catch (error) {
        console.error(`❌ ${collectionName} 삭제 실패:`, error);
        results[collectionName] = -1;
      }
    }

    // 5. users 컬렉션 처리 (최상위 관리자 제외)
    try {
      console.log('👥 users 컬렉션 삭제 중 (최상위 관리자 제외)...');
      const deletedCount = await deleteCollection('users', superAdminUid);
      results['users'] = deletedCount;
      console.log(`✅ users: ${deletedCount}개 문서 삭제됨`);
    } catch (error) {
      console.error('❌ users 컬렉션 삭제 실패:', error);
      results['users'] = -1;
    }

    // 6. Firebase Auth 사용자 삭제 (최상위 관리자 제외)
    let deletedAuthUsers = 0;
    try {
      console.log('🔐 Firebase Auth 사용자 삭제 중...');
      deletedAuthUsers = await deleteAuthUsers(superAdminUid);
      results['auth_users'] = deletedAuthUsers;
      console.log(`✅ Auth 사용자: ${deletedAuthUsers}개 계정 삭제됨`);
    } catch (error) {
      console.error('❌ Auth 사용자 삭제 실패:', error);
      results['auth_users'] = -1;
    }

    // 7. 통계 계산
    const totalDeleted = Object.values(results).reduce((sum, count) => 
      count > 0 ? sum + count : sum, 0
    );

    console.log('🎉 초기화 완료:', {
      totalDeleted,
      deletedAuthUsers,
      preservedAdmin: superAdminUid ? SUPER_ADMIN_EMAIL : null
    });

    return NextResponse.json({
      success: true,
      message: 'Firestore 데이터 및 Auth 계정이 초기화되었습니다.',
      results,
      totalDeleted,
      deletedAuthUsers,
      preservedAdmin: superAdminUid ? SUPER_ADMIN_EMAIL : null,
    });

  } catch (error) {
    console.error('💥 초기화 중 치명적 오류:', error);
    return NextResponse.json(
      { 
        error: '초기화 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

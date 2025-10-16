'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { UserProfile, Club, UserRole } from '@/types';

export interface UserHookResult {
  user: (User & UserProfile & { clubId?: string; _profileError?: boolean }) | null;
  isUserLoading: boolean;
}

export function useUser(): UserHookResult {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<(User & UserProfile & { clubId?: string }) | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
      // Firebase services are not available yet.
      // We will wait for them to be available, so we keep loading true.
      setIsUserLoading(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsUserLoading(true); // Set loading true at the start of auth state change
      if (firebaseUser) {
        const userRef = doc(firestore, 'users', firebaseUser.uid);
        try {
            const userSnap = await getDoc(userRef);
            let userProfileData: UserProfile & { clubId?: string };

            if (userSnap.exists()) {
              userProfileData = userSnap.data() as UserProfile;
            } else {
              // 프로필이 없는 경우: 비회원 가입 승인 확인
              console.log('🔍 프로필 없음, 승인된 가입 신청 확인 중...');
              
              let approvedRequest: any = null;
              let requestType: 'clubOwner' | 'superAdmin' | null = null;
              
              // clubOwnerRequests에서 승인된 요청 찾기
              try {
                const clubOwnerRequestsRef = collection(firestore, 'clubOwnerRequests');
                const q = query(
                  clubOwnerRequestsRef, 
                  where('email', '==', firebaseUser.email),
                  where('status', '==', 'approved')
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                  approvedRequest = querySnapshot.docs[0].data();
                  requestType = 'clubOwner';
                  console.log('✅ 승인된 클럽 오너 신청 발견:', approvedRequest);
                }
              } catch (error) {
                console.error('❌ 클럽 오너 승인 요청 조회 오류:', error);
              }
              
              // clubOwner가 아니면 superAdminRequests 확인
              if (!approvedRequest) {
                try {
                  const superAdminRequestsRef = collection(firestore, 'superAdminRequests');
                  const q = query(
                    superAdminRequestsRef,
                    where('email', '==', firebaseUser.email),
                    where('status', '==', 'approved')
                  );
                  const querySnapshot = await getDocs(q);
                  if (!querySnapshot.empty) {
                    approvedRequest = querySnapshot.docs[0].data();
                    requestType = 'superAdmin';
                    console.log('✅ 승인된 슈퍼 관리자 신청 발견:', approvedRequest);
                  }
                } catch (error) {
                  console.error('❌ 슈퍼 관리자 승인 요청 조회 오류:', error);
                }
              }
              
              let defaultProfile: UserProfile;
              
              if (approvedRequest && requestType === 'clubOwner') {
                // 승인된 클럽 오너 신청이 있으면 CLUB_OWNER로 설정
                // 클럽 ID 찾기
                let clubId = '';
                try {
                  const clubsRef = collection(firestore, 'clubs');
                  const clubQuery = query(clubsRef, where('name', '==', approvedRequest.clubName));
                  const clubSnapshot = await getDocs(clubQuery);
                  if (!clubSnapshot.empty) {
                    clubId = clubSnapshot.docs[0].id;
                    console.log('✅ 클럽 ID 찾음:', clubId);
                  }
                } catch (error) {
                  console.error('❌ 클럽 ID 조회 오류:', error);
                }
                
                defaultProfile = {
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  email: firebaseUser.email!,
                  displayName: approvedRequest.name || firebaseUser.displayName || firebaseUser.email!.split('@')[0],
                  phoneNumber: approvedRequest.phoneNumber,
                  photoURL: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/40/40`,
                  role: UserRole.CLUB_OWNER,
                  clubId: clubId || undefined,
                  clubName: approvedRequest.clubName,
                  provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
                  status: 'approved',
                };
                console.log('🏢 클럽 오너 프로필 생성:', defaultProfile);
              } else if (approvedRequest && requestType === 'superAdmin') {
                // 승인된 슈퍼 관리자 신청이 있으면 SUPER_ADMIN으로 설정
                defaultProfile = {
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  email: firebaseUser.email!,
                  displayName: approvedRequest.name || firebaseUser.displayName || firebaseUser.email!.split('@')[0],
                  phoneNumber: approvedRequest.phoneNumber,
                  photoURL: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/40/40`,
                  role: UserRole.SUPER_ADMIN,
                  provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
                  status: 'approved',
                };
                console.log('🛡️ 슈퍼 관리자 프로필 생성:', defaultProfile);
              } else {
                // 승인된 요청이 없으면 기본 MEMBER
                defaultProfile = {
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  email: firebaseUser.email!,
                  displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
                  photoURL: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/40/40`,
                  role: UserRole.MEMBER,
                  provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
                  status: 'approved',
                };
                console.log('👤 기본 회원 프로필 생성:', defaultProfile);
              }
              
              // Firestore에 저장
              await setDoc(userRef, defaultProfile);
              userProfileData = defaultProfile;
            }

            // If the user has a clubName, find their clubId
            if (userProfileData.clubName && (
                userProfileData.role === UserRole.CLUB_OWNER || 
                userProfileData.role === UserRole.CLUB_MANAGER
            )) {
                try {
                    const clubsRef = collection(firestore, 'clubs');
                    const q = query(clubsRef, where("name", "==", userProfileData.clubName));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const clubDoc = querySnapshot.docs[0];
                        userProfileData.clubId = clubDoc.id;
                        console.log('✅ clubId 조회 성공:', clubDoc.id);
                    } else {
                        console.warn('⚠️ clubName에 해당하는 클럽을 찾을 수 없습니다:', userProfileData.clubName);
                    }
                } catch (error) {
                    console.error('❌ clubId 조회 중 오류:', error);
                    // clubId 조회 실패해도 로그인은 계속 진행
                }
            }
            
            // FEDERATION_ADMIN은 clubId가 필요 없음 (전체 클럽 접근 가능)
            if (userProfileData.role === UserRole.FEDERATION_ADMIN || 
                userProfileData.role === UserRole.SUPER_ADMIN) {
                console.log('✅ 관리자 로그인:', userProfileData.role);
            }
            
            setUser({ 
              ...firebaseUser, 
              ...userProfileData,
              phoneNumber: firebaseUser.phoneNumber ?? userProfileData.phoneNumber
            } as User & UserProfile & { clubId?: string });

        } catch (error) {
            console.error("❌ 사용자 프로필 조회 오류:", error);
            
            // Firebase Auth 세션 유효성 체크
            try {
              await firebaseUser.reload(); // 세션 갱신 시도
              
              // 세션이 유효하면 기본 프로필 제공
              const basicProfile: UserProfile = {
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                email: firebaseUser.email!,
                displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
                photoURL: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/40/40`,
                role: UserRole.MEMBER,
                provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
                status: 'pending',
              };
              
              console.warn('⚠️ 프로필 조회 실패, 기본 프로필 사용');
              setUser({ 
                ...firebaseUser, 
                ...basicProfile,
                phoneNumber: firebaseUser.phoneNumber ?? undefined,
                _profileError: true // 프로필 에러 플래그
              } as User & UserProfile & { clubId?: string; _profileError?: boolean });
              
            } catch (reloadError) {
              // 세션도 무효하면 로그아웃
              console.error('❌ 세션 무효, 로그아웃 처리:', reloadError);
              await signOut(auth);
              setUser(null);
            }
        }
      } else {
        // No user is signed in.
        setUser(null);
      }
      setIsUserLoading(false); // Set loading false after all async operations are done
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth, firestore]);

  return { user, isUserLoading };
}

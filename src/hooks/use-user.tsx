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
              // This can happen if profile creation fails after signup or for a new social login.
              // Let's create a default profile.
              const defaultProfile: UserProfile = {
                id: firebaseUser.uid, // id와 uid를 동일하게 설정
                uid: firebaseUser.uid,
                email: firebaseUser.email!,
                displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
                photoURL:
                  firebaseUser.photoURL ||
                  `https://picsum.photos/seed/${firebaseUser.uid}/40/40`,
                role: UserRole.MEMBER, // Default role
                provider:
                  firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
                status: 'approved', // Default status for new members/social logins
              };
              // Save this default profile to Firestore
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

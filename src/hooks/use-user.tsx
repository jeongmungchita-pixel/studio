'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { UserProfile, Club, UserRole } from '@/types';

export interface UserHookResult {
  user: (User & UserProfile & { clubId?: string }) | null;
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
                userProfileData.role === UserRole.CLUB_MANAGER ||
                userProfileData.role === UserRole.FEDERATION_ADMIN
            )) {
                const clubsRef = collection(firestore, 'clubs');
                const q = query(clubsRef, where("name", "==", userProfileData.clubName));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const clubDoc = querySnapshot.docs[0];
                    userProfileData.clubId = clubDoc.id;
                }
            }
            
            setUser({ 
              ...firebaseUser, 
              ...userProfileData,
              phoneNumber: firebaseUser.phoneNumber ?? userProfileData.phoneNumber
            } as User & UserProfile & { clubId?: string });

        } catch (error) {
            console.error("Error fetching user profile:", error);
            // Handle error, maybe sign out user
            setUser(null);
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

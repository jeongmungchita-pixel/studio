'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import type { UserProfile } from '@/types';

export interface UserHookResult {
  user: (User & UserProfile) | null;
  isUserLoading: boolean;
}

export function useUser(): UserHookResult {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<(User & UserProfile) | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
      setIsUserLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(firestore, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userProfile = userSnap.data() as UserProfile;
          setUser({ ...firebaseUser, ...userProfile });
        } else {
          // This case might happen if profile creation fails after signup.
          // We can create a default profile here or handle it as an error.
          const defaultProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || 'New User',
            photoURL:
              firebaseUser.photoURL ||
              `https://picsum.photos/seed/${firebaseUser.uid}/40/40`,
            role: 'member',
            provider:
              (firebaseUser.providerData[0]?.providerId as
                | 'google'
                | 'email') || 'email',
          };
          // You might want to save this default profile to Firestore here.
          setUser({ ...firebaseUser, ...defaultProfile });
        }
      } else {
        setUser(null);
      }
      setIsUserLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return { user, isUserLoading };
}

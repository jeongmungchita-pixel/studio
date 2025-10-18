'use client';

import { ReactNode, useMemo } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './init';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * 클라이언트 컴포넌트에서 Firebase SDK 인스턴스를 초기화하고
 * 하위 트리에 컨텍스트로 전달합니다.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const services = useMemo(() => initializeFirebase(), []);

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      firestore={services.firestore}
      auth={services.auth}
      storage={services.storage}
    >
      {children}
    </FirebaseProvider>
  );
}

# 🛠️ KGF Nexus 구현 가이드 (Implementation Guide)

> AI Agent를 위한 단계별 코드 구현 가이드

## 📋 목차
1. [프로젝트 초기화](#1-프로젝트-초기화)
2. [핵심 컴포넌트 패턴](#2-핵심-컴포넌트-패턴)
3. [데이터 페칭 패턴](#3-데이터-페칭-패턴)
4. [인증 플로우 구현](#4-인증-플로우-구현)
5. [역할 기반 라우팅](#5-역할-기반-라우팅)
6. [Firestore 쿼리 패턴](#6-firestore-쿼리-패턴)
7. [에러 처리 패턴](#7-에러-처리-패턴)
8. [테스트 전략](#8-테스트-전략)

---

## 1. 프로젝트 초기화

### 1.1 기본 설정 명령어
```bash
# Next.js 프로젝트 생성
npx create-next-app@latest federation --typescript --tailwind --app

# 의존성 설치
npm install firebase firebase-admin
npm install @radix-ui/react-* # shadcn/ui 컴포넌트들
npm install react-hook-form zod @hookform/resolvers
npm install lucide-react date-fns
npm install @tanstack/react-table

# 개발 의존성
npm install -D @types/node
```

### 1.2 프로젝트 구조 생성 스크립트
```javascript
// scripts/create-structure.js
const fs = require('fs');
const path = require('path');

const directories = [
  'src/app/(auth)',
  'src/app/admin',
  'src/app/super-admin',
  'src/app/club-dashboard',
  'src/app/my-profile',
  'src/components/common',
  'src/components/layout',
  'src/components/ui',
  'src/hooks',
  'src/services',
  'src/types',
  'src/constants',
  'src/utils',
  'src/firebase',
  'scripts'
];

directories.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ Created: ${dir}`);
  }
});
```

---

## 2. 핵심 컴포넌트 패턴

### 2.1 페이지 컴포넌트 템플릿
```typescript
// src/app/[role]/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useRole } from '@/hooks/use-role';
import { Loader2 } from 'lucide-react';

export default function RoleDashboard() {
  const { user, isUserLoading } = useUser();
  const { hasRequiredRole } = useRole();
  const router = useRouter();

  // 접근 제어
  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (!hasRequiredRole) {
        router.push('/dashboard');
        return;
      }
    }
  }, [isUserLoading, user, hasRequiredRole, router]);

  // 로딩 상태
  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // 메인 컨텐츠
  return (
    <div className="container mx-auto p-6">
      {/* 페이지 컨텐츠 */}
    </div>
  );
}
```

### 2.2 폼 컴포넌트 패턴
```typescript
// src/components/forms/example-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(2, '최소 2자 이상'),
  email: z.string().email('유효한 이메일 주소를 입력하세요'),
});

type FormData = z.infer<typeof formSchema>;

export function ExampleForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      // 처리 로직
      console.log(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* 폼 필드들 */}
    </form>
  );
}
```

---

## 3. 데이터 페칭 패턴

### 3.1 Custom Hook 패턴
```typescript
// src/hooks/use-clubs.ts
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export function useClubs(userId?: string) {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const firestore = useFirestore();

  useEffect(() => {
    if (!firestore) return;

    const q = userId 
      ? query(collection(firestore, 'clubs'), where('ownerId', '==', userId))
      : collection(firestore, 'clubs');

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClubs(data);
        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, userId]);

  return { clubs, loading, error };
}
```

### 3.2 병렬 쿼리 패턴
```typescript
// src/hooks/use-dashboard-data.ts
export function useDashboardData() {
  const firestore = useFirestore();
  const { user } = useUser();

  const [data, setData] = useState({
    members: [],
    classes: [],
    payments: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !user?.clubId) return;

    const fetchData = async () => {
      try {
        const [membersSnap, classesSnap, paymentsSnap] = await Promise.all([
          getDocs(query(collection(firestore, 'members'), where('clubId', '==', user.clubId))),
          getDocs(query(collection(firestore, 'classes'), where('clubId', '==', user.clubId))),
          getDocs(query(collection(firestore, 'payments'), where('clubId', '==', user.clubId))),
        ]);

        setData({
          members: membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          classes: classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          payments: paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [firestore, user?.clubId]);

  return { ...data, loading };
}
```

---

## 4. 인증 플로우 구현

### 4.1 Firebase Context Provider
```typescript
// src/firebase/provider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const FirebaseContext = createContext({});

export function FirebaseProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [firestore, setFirestore] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const authInstance = getAuth(app);
    const firestoreInstance = getFirestore(app);

    setAuth(authInstance);
    setFirestore(firestoreInstance);

    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
      if (firebaseUser) {
        // 사용자 프로필 가져오기
        const userDoc = await getDoc(doc(firestoreInstance, 'users', firebaseUser.uid));
        const userProfile = userDoc.data();
        setUser({ ...firebaseUser, ...userProfile });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <FirebaseContext.Provider value={{ auth, firestore, user, loading }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => useContext(FirebaseContext);
```

### 4.2 회원가입 플로우
```typescript
// src/app/register/page.tsx
const handleRegister = async (data: RegisterForm) => {
  try {
    // 1. Firebase Auth 계정 생성
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );

    // 2. Firestore 프로필 생성
    await setDoc(doc(firestore, 'users', userCredential.user.uid), {
      email: data.email,
      displayName: data.name,
      role: data.role,
      status: 'pending', // 승인 대기
      createdAt: serverTimestamp(),
    });

    // 3. 역할별 추가 데이터 생성
    if (data.role === UserRole.CLUB_OWNER) {
      await addDoc(collection(firestore, 'clubOwnerRequests'), {
        userId: userCredential.user.uid,
        clubName: data.clubName,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    }

    // 4. 승인 대기 페이지로 이동
    router.push('/pending-approval');
  } catch (error) {
    handleError(error);
  }
};
```

---

## 5. 역할 기반 라우팅

### 5.1 미들웨어 설정
```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const roleRoutes = {
  super_admin: ['/super-admin', '/system'],
  federation_admin: ['/admin'],
  club_owner: ['/club-dashboard'],
  member: ['/my-profile'],
};

export function middleware(request: NextRequest) {
  // 세션 체크
  const session = request.cookies.get('session');
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 역할 기반 접근 제어
  const userRole = getUserRoleFromSession(session);
  const pathname = request.nextUrl.pathname;

  const allowedRoutes = roleRoutes[userRole] || [];
  const hasAccess = allowedRoutes.some(route => pathname.startsWith(route));

  if (!hasAccess) {
    return NextResponse.redirect(new URL('/403', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/super-admin/:path*',
    '/club-dashboard/:path*',
  ],
};
```

### 5.2 역할별 리다이렉트
```typescript
// src/hooks/use-role-redirect.ts
export function useRoleRedirect() {
  const router = useRouter();
  const { user } = useUser();

  const redirectToRoleDashboard = useCallback(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const redirectMap = {
      [UserRole.SUPER_ADMIN]: '/super-admin',
      [UserRole.FEDERATION_ADMIN]: '/admin',
      [UserRole.CLUB_OWNER]: '/club-dashboard',
      [UserRole.CLUB_MANAGER]: '/club-dashboard',
      [UserRole.MEMBER]: '/my-profile',
      [UserRole.PARENT]: '/my-profile',
    };

    const targetPath = redirectMap[user.role] || '/dashboard';
    router.push(targetPath);
  }, [user, router]);

  return { redirectToRoleDashboard };
}
```

---

## 6. Firestore 쿼리 패턴

### 6.1 복합 쿼리
```typescript
// 회원 검색 쿼리
const searchMembers = async (searchTerm: string, clubId: string) => {
  const membersRef = collection(firestore, 'members');
  
  const q = query(
    membersRef,
    where('clubId', '==', clubId),
    where('status', '==', 'active'),
    orderBy('name'),
    limit(20)
  );

  const snapshot = await getDocs(q);
  const members = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(member => 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return members;
};
```

### 6.2 트랜잭션 처리
```typescript
// 회원권 구매 트랜잭션
const purchasePass = async (memberId: string, templateId: string) => {
  const batch = writeBatch(firestore);

  // 1. 회원권 생성
  const passRef = doc(collection(firestore, 'member_passes'));
  batch.set(passRef, {
    memberId,
    templateId,
    startDate: new Date(),
    endDate: addMonths(new Date(), 1),
    status: 'active',
    createdAt: serverTimestamp(),
  });

  // 2. 결제 정보 생성
  const paymentRef = doc(collection(firestore, 'payments'));
  batch.set(paymentRef, {
    memberId,
    passId: passRef.id,
    amount: template.price,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  // 3. 회원 정보 업데이트
  const memberRef = doc(firestore, 'members', memberId);
  batch.update(memberRef, {
    hasActivePass: true,
    lastPassPurchase: serverTimestamp(),
  });

  await batch.commit();
  return passRef.id;
};
```

---

## 7. 에러 처리 패턴

### 7.1 에러 바운더리
```typescript
// src/components/error-boundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // 에러 로깅 서비스로 전송
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">오류가 발생했습니다</h2>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || '알 수 없는 오류'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn btn-primary"
            >
              다시 시도
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 7.2 API 에러 처리
```typescript
// src/utils/error-handler.ts
export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export const handleFirebaseError = (error: any): string => {
  const errorMessages: Record<string, string> = {
    'auth/user-not-found': '사용자를 찾을 수 없습니다.',
    'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
    'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
    'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
    'auth/invalid-email': '유효하지 않은 이메일 주소입니다.',
    'permission-denied': '권한이 없습니다.',
    'not-found': '요청한 데이터를 찾을 수 없습니다.',
  };

  return errorMessages[error.code] || '알 수 없는 오류가 발생했습니다.';
};
```

---

## 8. 테스트 전략

### 8.1 유닛 테스트
```typescript
// src/utils/__tests__/validation.test.ts
import { validateEmail, validatePhone } from '../validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('invalid')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate Korean phone number', () => {
      expect(validatePhone('010-1234-5678')).toBe(true);
    });
  });
});
```

### 8.2 통합 테스트
```typescript
// src/app/__tests__/login.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../login/page';

describe('Login Page', () => {
  it('should login with valid credentials', async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('로그인'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
  });
});
```

### 8.3 E2E 테스트
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('complete signup and login flow', async ({ page }) => {
    // 회원가입
    await page.goto('/register');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.fill('[name="name"]', 'Test User');
    await page.click('button[type="submit"]');

    // 승인 대기 확인
    await expect(page).toHaveURL('/pending-approval');

    // (관리자가 승인했다고 가정)
    // 로그인
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 대시보드 이동 확인
    await expect(page).toHaveURL('/dashboard');
  });
});
```

---

## 📊 성능 최적화 체크리스트

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    turbo: {
      resolveAlias: {
        '@': './src',
      },
    },
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};
```

---

## 🔐 보안 설정

### Firestore Security Rules
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 인증된 사용자만 읽기 가능
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 클럽 데이터는 소속 회원만 접근
    match /clubs/{clubId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.clubId == clubId;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['club_owner', 'club_manager'];
    }
  }
}
```

---

*이 구현 가이드와 PROJECT_BLUEPRINT.md를 함께 사용하면 AI Agent가 완전한 시스템을 구축할 수 있습니다.*

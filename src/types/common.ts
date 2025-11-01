/**
 * 공통으로 사용되는 타입 정의
 */

import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { UserRole } from './auth';

// Firebase 문서 타입
export type FirestoreDocument<T = DocumentData> = T & { id: string };

// API 요청/응답 타입
export interface RequestBody {
  [key: string]: unknown;
}

// 폼 필드 타입
export interface FormField<T = unknown> {
  name: string;
  value: T;
  onChange: (value: T) => void;
  error?: string;
}

// JWT 페이로드 타입
export interface JWTPayload {
  sub?: string;
  iat?: number;
  exp?: number;
  role?: UserRole;
  permissions?: string[];
  admin?: boolean;
  userId?: string;
  email?: string;
  [key: string]: unknown;
}

// 쿼리 필터 연산자 타입
export type QueryOperator = '<' | '<=' | '==' | '!=' | '>=' | '>' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';

// 에러 세부정보 타입
export interface ErrorDetails {
  field?: string;
  code?: string;
  message?: string;
  context?: Record<string, unknown>;
  stack?: string;
}

// React 컴포넌트 Props 타입
export type AnyComponent<P = {}> = React.ComponentType<P>;

// 모달 Props 타입
export interface ModalProps {
  onClose?: () => void;
  [key: string]: unknown;
}

// Firestore 스냅샷 타입
export interface FirestoreSnapshot<T = DocumentData> {
  id: string;
  data: T;
  docs?: QueryDocumentSnapshot<T>[];
}

// 콜백 함수 타입
export type FirestoreCallback<T> = (snapshot: T) => void;

// 승인 요청 타입 (유니온 타입)
export type ApprovalRequest = 
  | ClubOwnerRequest
  | SuperAdminRequest  
  | MemberRequest;

interface ClubOwnerRequest {
  type: 'clubOwner';
  id: string;
  clubId?: string;
  status: 'pending' | 'approved' | 'rejected';
  [key: string]: unknown;
}

interface SuperAdminRequest {
  type: 'superAdmin';
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  [key: string]: unknown;
}

interface MemberRequest {
  type: 'member';
  id: string;
  clubId?: string;
  status: 'pending' | 'approved' | 'rejected';
  [key: string]: unknown;
}

// 쿼리 클라이언트 타입
export interface QueryClientType {
  prefetchQuery: (options: {
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
    staleTime?: number;
  }) => Promise<void>;
  setQueryData: (queryKey: unknown[], data: unknown) => void;
}

// 비교 가능한 값 타입
export type ComparableValue = string | number | boolean | Date | null | undefined;

// 재시도 옵션 타입
export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  retryCondition?: (error: unknown) => boolean;
}

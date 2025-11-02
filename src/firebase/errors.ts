'use client';
import { getAuth } from 'firebase/auth';
import { User } from 'firebase/auth';
// ============================================
// 🔥 Firebase 에러 처리 유틸리티
// ============================================
interface FirebaseError {
  code: string;
  message: string;
}
/**
 * Firebase 에러인지 확인
 */
export function isFirebaseError(error: unknown): error is FirebaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as any).code === 'string'
  );
}
/**
 * Firebase 에러 메시지를 한국어로 변환
 */
export function getErrorMessage(error: unknown): string {
  if (isFirebaseError(error)) {
    switch (error.code) {
      case 'auth/user-not-found':
        return '사용자를 찾을 수 없습니다.';
      case 'auth/wrong-password':
        return '비밀번호가 올바르지 않습니다.';
      case 'auth/email-already-in-use':
        return '이미 사용 중인 이메일입니다.';
      case 'auth/weak-password':
        return '비밀번호가 너무 약합니다.';
      case 'auth/invalid-email':
        return '올바르지 않은 이메일 형식입니다.';
      case 'permission-denied':
        return '권한이 없습니다.';
      case 'not-found':
        return '요청한 데이터를 찾을 수 없습니다.';
      case 'already-exists':
        return '이미 존재하는 데이터입니다.';
      default:
        return '알 수 없는 오류가 발생했습니다.';
    }
  }
  if (error instanceof Error) {
    return (error as any).message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '알 수 없는 오류가 발생했습니다.';
}
/**
 * Firebase 에러를 처리하고 로깅
 */
export function handleFirebaseError(error: unknown): string {
  const message = getErrorMessage(error);
  if (isFirebaseError(error)) {
  } else {
  }
  return message;
}
type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};
interface FirebaseAuthToken {
  name: string | null;
  email: string | null;
  email_verified: boolean;
  phone_number: string | null;
  sub: string;
  firebase: {
    identities: Record<string, string[]>;
    sign_in_provider: string;
    tenant: string | null;
  };
}
interface FirebaseAuthObject {
  uid: string;
  token: FirebaseAuthToken;
}
interface SecurityRuleRequest {
  auth: FirebaseAuthObject | null;
  method: string;
  path: string;
  resource?: {
    data: unknown;
  };
}
/**
 * Builds a security-rule-compliant auth object from the Firebase User.
 * @param currentUser The currently authenticated Firebase user.
 * @returns An object that mirrors request.auth in security rules, or null.
 */
function buildAuthObject(currentUser: User | null): FirebaseAuthObject | null {
  if (!currentUser) {
    return null;
  }
  const token: FirebaseAuthToken = {
    name: currentUser.displayName,
    email: currentUser.email,
    email_verified: currentUser.emailVerified,
    phone_number: currentUser.phoneNumber,
    sub: currentUser.uid,
    firebase: {
      identities: currentUser.providerData.reduce((acc: Record<string, string[]>, p: unknown) => {
        const provider = p as any;
        if (provider.providerId) {
          acc[provider.providerId] = [provider.uid];
        }
        return acc;
      }, {} as Record<string, string[]>),
      sign_in_provider: currentUser.providerData[0]?.providerId || 'custom',
      tenant: currentUser.tenantId,
    },
  };
  return {
    uid: currentUser.uid,
    token: token,
  };
}
/**
 * Builds the complete, simulated request object for the error message.
 * It safely tries to get the current authenticated user.
 * @param context The context of the failed Firestore operation.
 * @returns A structured request object.
 */
function buildRequestObject(context: SecurityRuleContext): SecurityRuleRequest {
  let authObject: FirebaseAuthObject | null = null;
  try {
    // Safely attempt to get the current user.
    const firebaseAuth = getAuth();
    const currentUser = firebaseAuth.currentUser;
    if (currentUser) {
      authObject = buildAuthObject(currentUser);
    }
  } catch {
    // This will catch errors if the Firebase app is not yet initialized.
    // In this case, we'll proceed without auth information.
  }
  return {
    auth: authObject,
    method: context.operation,
    path: `/databases/(default)/documents/${context.path}`,
    resource: context.requestResourceData ? { data: context.requestResourceData } : undefined,
  };
}
/**
 * Builds the final, formatted error message for the LLM.
 * @param requestObject The simulated request object.
 * @returns A string containing the error message and the JSON payload.
 */
function buildErrorMessage(requestObject: SecurityRuleRequest): string {
  return `Missing or insufficient permissions: The following request was denied by Firestore Security Rules:
${JSON.stringify(requestObject, null, 2)}`;
}
/**
 * A custom error class designed to be consumed by an LLM for debugging.
 * It structures the error information to mimic the request object
 * available in Firestore Security Rules.
 */
export class FirestorePermissionError extends Error {
  public readonly request: SecurityRuleRequest;
  constructor(context: SecurityRuleContext) {
    const requestObject = buildRequestObject(context);
    super(buildErrorMessage(requestObject));
    this.name = 'FirebaseError';
    this.request = requestObject;
  }
}

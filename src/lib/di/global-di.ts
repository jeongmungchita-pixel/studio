/**
 * 전역 DI 컨테이너 및 Hook (순환 의존성 방지를 위해 임시 비활성화)
 */
// import { ServiceContainer } from '@/services/container';
import type { ServiceKey } from './interfaces';

// DI 컨테이너 인스턴스 (순환 의존성 방지를 위해 임시로 null)
export const diContainer = null as any;

// DI Hook들 (클라이언트 전용)
export function useService<T>(key: ServiceKey): T {
  // 임시로 null 반환 (DI 제거됨)
  return null as any;
}

export function useFirebaseService() {
  return useService('firebaseService');
}

export function useAuthService() {
  return useService('authService');
}

export function useQueryService() {
  return useService('queryService');
}

export function useAPIClient() {
  return useService('apiClient');
}

// 서비스 초기화
export function initializeDI(): void {
  // DI 제거됨: 아무것도 하지 않음
}

// 서비스 객체들 (편의성)
export const services = {
  firebase: () => null,
  auth: () => null,
  query: () => null,
  api: () => null,
};

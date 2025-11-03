import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { diContainer } from '@/services/container';
import { ServiceFactory } from '@/lib/di/service-factory';

// DI 테스트 유틸리티
export function createMockServiceContainer() {
  const serviceFactory = ServiceFactory.getInstance();
  serviceFactory.setTestMode(true);
  
  const services = {
    auth: {
      getUserProfile: vi.fn(),
      getRedirectUrlByRole: vi.fn(),
      canAccessRoute: vi.fn(),
      updateProfile: vi.fn(),
      requestApproval: vi.fn(),
      checkApprovalStatus: vi.fn(),
    },
    users: {
      getUsers: vi.fn(),
      getUser: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      updateStatus: vi.fn(),
      linkMember: vi.fn(),
    },
    members: {
      getMembers: vi.fn(),
      getMember: vi.fn(),
      createMember: vi.fn(),
      updateMember: vi.fn(),
      deleteMember: vi.fn(),
      updateMemberStatus: vi.fn(),
    },
    notifications: {
      getNotifications: vi.fn(),
      getSettings: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      updateSettings: vi.fn(),
    },
  };

  return {
    get: (key: string) => {
      switch (key) {
        case 'authService': return services.auth;
        case 'userService': return services.users;
        case 'memberService': return services.members;
        case 'notificationService': return services.notifications;
        default: return null;
      }
    },
    services
  };
}

// Simple render wrapper for component tests
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, options);
}

// DI 컨테이너와 함께 렌더링
export function renderWithDI(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // DI 컨테이너를 테스트 모드로 설정
  const serviceFactory = ServiceFactory.getInstance();
  serviceFactory.setTestMode(true);
  
  return render(ui, options);
}

// Mock 서비스 설정 헬퍼
export function setupMockServices(mocks: Record<string, any>) {
  diContainer.setMockServices(mocks);
}

// 테스트 후 정리
export function cleanupMockServices() {
  const serviceFactory = ServiceFactory.getInstance();
  serviceFactory.setTestMode(false);
  diContainer.reset();
}

// Simple utility functions for testing
export function clickButton(element: HTMLElement) {
  element.click();
}

export function expectButtonToBeDisabled(element: HTMLElement) {
  expect(element).toBeDisabled();
}

// API 테스트를 위한 유틸리티
export function createMockRequest(body: any, headers: Record<string, string> = {}) {
  return new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

export function createMockUser(role: string = 'MEMBER', uid: string = 'test-user') {
  return {
    uid,
    email: 'test@example.com',
    displayName: 'Test User',
    role,
    status: 'active',
    clubId: 'test-club',
    clubName: 'Test Club',
  };
}

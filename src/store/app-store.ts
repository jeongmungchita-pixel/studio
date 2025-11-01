'use client';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
export type Theme = 'light' | 'dark' | 'system';
export type Language = 'ko' | 'en';
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  autoClose?: boolean;
  duration?: number;
}
interface AppStore {
  // UI 상태
  theme: Theme;
  language: Language;
  sidebarCollapsed: boolean;
  isOnline: boolean;
  // 알림 상태
  notifications: Notification[];
  unreadCount: number;
  // 로딩 상태 (전역)
  globalLoading: boolean;
  loadingMessage: string | null;
  // 모달 상태
  modals: Record<string, boolean>;
  // 액션
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  // 알림 관리
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  // 로딩 관리
  setGlobalLoading: (loading: boolean, message?: string) => void;
  // 모달 관리
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  toggleModal: (modalId: string) => void;
  closeAllModals: () => void;
  // 유틸리티
  reset: () => void;
}
/**
 * 애플리케이션 전역 상태 관리 Store
 */
export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    // 초기 상태
    theme: 'system',
    language: 'ko',
    sidebarCollapsed: false,
    isOnline: true,
    notifications: [],
    unreadCount: 0,
    globalLoading: false,
    loadingMessage: null,
    modals: {},
    // 테마 설정
    setTheme: (theme) => {
      set({ theme });
      // 시스템 테마인 경우 실제 시스템 설정 감지
      if (theme === 'system') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const actualTheme = mediaQuery.matches ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', actualTheme === 'dark');
      } else {
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }
    },
    // 언어 설정
    setLanguage: (language) => {
      set({ language });
      document.documentElement.lang = language;
    },
    // 사이드바 상태
    setSidebarCollapsed: (sidebarCollapsed) => {
      set({ sidebarCollapsed });
    },
    // 온라인 상태
    setOnlineStatus: (isOnline) => {
      set({ isOnline });
    },
    // 알림 추가
    addNotification: (notification) => {
      const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNotification: Notification = {
        ...notification,
        id,
        timestamp: new Date(),
        read: false,
      };
      set((state) => ({
        notifications: [newNotification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      }));
      // 자동 닫기 설정
      if (notification.autoClose !== false) {
        const duration = notification.duration || 5000;
        setTimeout(() => {
          get().removeNotification(id);
        }, duration);
      }
    },
    // 알림 제거
    removeNotification: (id) => {
      set((state) => {
        const notification = state.notifications.find(n => n.id === id);
        const wasUnread = notification && !notification.read;
        return {
          notifications: state.notifications.filter(n => n.id !== id),
          unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
        };
      });
    },
    // 읽음 표시
    markAsRead: (id) => {
      set((state) => {
        const notification = state.notifications.find(n => n.id === id);
        if (!notification || notification.read) return state;
        return {
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: state.unreadCount - 1,
        };
      });
    },
    // 모두 읽음 표시
    markAllAsRead: () => {
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    },
    // 알림 모두 삭제
    clearNotifications: () => {
      set({
        notifications: [],
        unreadCount: 0,
      });
    },
    // 전역 로딩 설정
    setGlobalLoading: (globalLoading, loadingMessage?: string) => {
      set({ globalLoading, loadingMessage: loadingMessage || null });
    },
    // 모달 열기
    openModal: (modalId) => {
      set((state) => ({
        modals: { ...state.modals, [modalId]: true },
      }));
    },
    // 모달 닫기
    closeModal: (modalId) => {
      set((state) => ({
        modals: { ...state.modals, [modalId]: false },
      }));
    },
    // 모달 토글
    toggleModal: (modalId) => {
      set((state) => ({
        modals: { ...state.modals, [modalId]: !state.modals[modalId] },
      }));
    },
    // 모든 모달 닫기
    closeAllModals: () => {
      set({ modals: {} });
    },
    // 상태 초기화
    reset: () => {
      set({
        theme: 'system',
        language: 'ko',
        sidebarCollapsed: false,
        isOnline: true,
        notifications: [],
        unreadCount: 0,
        globalLoading: false,
        loadingMessage: null,
        modals: {},
      });
    },
  }))
);
// 편의를 위한 선택자들
export const useTheme = () => useAppStore((state) => state.theme);
export const useLanguage = () => useAppStore((state) => state.language);
export const useSidebarCollapsed = () => useAppStore((state) => state.sidebarCollapsed);
export const useOnlineStatus = () => useAppStore((state) => state.isOnline);
export const useNotifications = () => useAppStore((state) => state.notifications);
export const useUnreadCount = () => useAppStore((state) => state.unreadCount);
export const useGlobalLoading = () => useAppStore((state) => ({
  isLoading: state.globalLoading,
  message: state.loadingMessage,
}));
export const useModal = (modalId: string) => useAppStore((state) => ({
  isOpen: state.modals[modalId] || false,
  open: () => state.openModal(modalId),
  close: () => state.closeModal(modalId),
  toggle: () => state.toggleModal(modalId),
}));

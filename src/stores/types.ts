/**
 * Zustand 스토어 타입 정의
 */
import { UserProfile, UserRole } from '@/types/auth';
import { Club } from '@/types/club';
import type { Query, DocumentData, DocumentReference } from 'firebase/firestore';
// 기본 상태 타입
export interface BaseState {
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}
// 페이지네이션 상태
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}
// 필터 상태
export interface FilterState<T = unknown> {
  filters: T;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
// 선택 상태
export interface SelectionState<T = any> {
  selectedItems: Set<T>;
  selectAll: boolean;
}
// 사용자 스토어 상태
export interface UserStoreState extends BaseState {
  // 현재 사용자
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  // 사용자 목록
  users: UserProfile[];
  userMap: Map<string, UserProfile>;
  // 페이지네이션
  pagination: PaginationState;
  // 필터
  filters: {
    role?: UserRole;
    status?: 'pending' | 'active' | 'inactive' | 'deleted';
    clubId?: string;
    search?: string;
  };
  // 선택
  selectedUsers: Set<string>;
  // 캐시
  cache: {
    timestamp: number;
    ttl: number;
  };
}
// 클럽 스토어 상태
export interface ClubStoreState extends BaseState {
  clubs: Club[];
  currentClub: Club | null;
  pagination: PaginationState;
  filters: {
    status?: string;
    region?: string;
    search?: string;
  };
}
// 알림 스토어 상태
export interface NotificationStoreState {
  notifications: Notification[];
  unreadCount: number;
  isVisible: boolean;
}
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}
// UI 스토어 상태
export interface UIStoreState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  modalStack: ModalState[];
  toasts: ToastState[];
}
export interface ModalState {
  id: string;
  component: React.ComponentType<any>;
  props?: Record<string, unknown>;
  onClose?: () => void;
}
export interface ToastState {
  id: string;
  type: 'default' | 'success' | 'error' | 'warning';
  title: string;
  description?: string;
  duration?: number;
}
// 실시간 동기화 상태
export interface RealtimeState {
  connections: Map<string, RealtimeConnection>;
  subscriptions: Map<string, RealtimeSubscription>;
}
export interface RealtimeConnection {
  id: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastPing: Date;
  retryCount: number;
}
export interface RealtimeSubscription {
  id: string;
  _collection: string;
  query?: Query<DocumentData> | DocumentReference<DocumentData>;
  callback: (data: unknown) => void;
  unsubscribe?: () => void;
}

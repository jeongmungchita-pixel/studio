/**
 * UI 상태 관리 스토어
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { UIStoreState, ModalState, ToastState } from './types';
interface UIStoreActions {
  // 테마 액션
  setTheme: (theme: UIStoreState['theme']) => void;
  toggleTheme: () => void;
  // 사이드바 액션
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  // 모달 액션
  openModal: (modal: Omit<ModalState, 'id'>) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  // 토스트 액션
  showToast: (toast: Omit<ToastState, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}
type UIStore = UIStoreState & UIStoreActions;
const initialState: UIStoreState = {
  theme: 'system',
  sidebarOpen: true,
  modalStack: [],
  toasts: []
};
export const useUIStore = create<UIStore>()(
  devtools(
    immer((set) => ({
      ...initialState,
      // 테마 액션
      setTheme: (theme) => set((state) => {
        state.theme = theme;
        // 실제 테마 적용
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement;
          root.classList.remove('light', 'dark');
          if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light';
            root.classList.add(systemTheme);
          } else {
            root.classList.add(theme);
          }
        }
      }),
      toggleTheme: () => set((state) => {
        const themes: UIStoreState['theme'][] = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(state.theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        state.theme = nextTheme;
        // 실제 테마 적용
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement;
          root.classList.remove('light', 'dark');
          if (nextTheme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light';
            root.classList.add(systemTheme);
          } else {
            root.classList.add(nextTheme);
          }
        }
      }),
      // 사이드바 액션
      setSidebarOpen: (open) => set((state) => {
        state.sidebarOpen = open;
      }),
      toggleSidebar: () => set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      }),
      // 모달 액션
      openModal: (modal) => {
        const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newModal: ModalState = { ...modal, id };
        set((state) => {
          state.modalStack.push(newModal);
        });
        return id;
      },
      closeModal: (id) => set((state) => {
        const index = state.modalStack.findIndex(m => m.id === id);
        if (index !== -1) {
          const modal = state.modalStack[index];
          modal.onClose?.();
          state.modalStack.splice(index, 1);
        }
      }),
      closeAllModals: () => set((state) => {
        state.modalStack.forEach(modal => modal.onClose?.());
        state.modalStack = [];
      }),
      // 토스트 액션
      showToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast: ToastState = {
          ...toast,
          id,
          duration: toast.duration ?? 5000
        };
        set((state) => {
          state.toasts.push(newToast);
        });
        // 자동 제거
        if (newToast.duration && newToast.duration > 0) {
          setTimeout(() => {
            useUIStore.getState().removeToast(id);
          }, newToast.duration);
        }
        return id;
      },
      removeToast: (id) => set((state) => {
        const index = state.toasts.findIndex(t => t.id === id);
        if (index !== -1) {
          state.toasts.splice(index, 1);
        }
      }),
      clearToasts: () => set((state) => {
        state.toasts = [];
      })
    })),
    {
      name: 'UIStore'
    }
  )
);
// 선택자 (Selectors)
export const useTheme = () => useUIStore((state) => state.theme);
export const useSidebarOpen = () => useUIStore((state) => state.sidebarOpen);
export const useModals = () => useUIStore((state) => state.modalStack);
export const useToasts = () => useUIStore((state) => state.toasts);
// 헬퍼 함수
export const toast = {
  success: (title: string, description?: string) => {
    return useUIStore.getState().showToast({
      type: 'success',
      title,
      description
    });
  },
  error: (title: string, description?: string) => {
    return useUIStore.getState().showToast({
      type: 'error',
      title,
      description
    });
  },
  warning: (title: string, description?: string) => {
    return useUIStore.getState().showToast({
      type: 'warning',
      title,
      description
    });
  },
  info: (title: string, description?: string) => {
    return useUIStore.getState().showToast({
      type: 'default',
      title,
      description
    });
  }
};
// 모달 헬퍼
export const modal = {
  open: <P extends Record<string, unknown> = {}>(component: React.ComponentType<P>, props?: P, onClose?: () => void) => {
    return useUIStore.getState().openModal({ component: component as React.ComponentType<any>, props, onClose });
  },
  close: (id: string) => {
    useUIStore.getState().closeModal(id);
  },
  closeAll: () => {
    useUIStore.getState().closeAllModals();
  }
};

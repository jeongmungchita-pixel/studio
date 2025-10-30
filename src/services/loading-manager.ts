/**
 * 글로벌 로딩 상태 관리 시스템
 * 모든 로딩 상태를 중앙에서 관리하고 추적합니다.
 */

export interface LoadingState {
  key: string;
  message?: string;
  progress?: number;
  startTime: number;
  estimatedTime?: number;
}

export interface LoadingOptions {
  message?: string;
  estimatedTime?: number;
  showProgress?: boolean;
}

type LoadingListener = (states: Map<string, LoadingState>) => void;

export class LoadingManager {
  private static instance: LoadingManager;
  private loadingStates: Map<string, LoadingState> = new Map();
  private listeners: Set<LoadingListener> = new Set();
  private defaultMessages: Record<string, string> = {
    'auth': '인증 확인 중...',
    'data-fetch': '데이터를 불러오는 중...',
    'data-save': '저장 중...',
    'file-upload': '파일 업로드 중...',
    'file-download': '파일 다운로드 중...',
    'navigation': '페이지 이동 중...',
    'initialization': '초기화 중...',
    'processing': '처리 중...'
  };

  private constructor() {}

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): LoadingManager {
    if (!LoadingManager.instance) {
      LoadingManager.instance = new LoadingManager();
    }
    return LoadingManager.instance;
  }

  /**
   * 로딩 시작
   */
  startLoading(key: string, options: LoadingOptions = {}): void {
    const state: LoadingState = {
      key,
      message: options.message || this.getDefaultMessage(key),
      progress: options.showProgress ? 0 : undefined,
      startTime: Date.now(),
      estimatedTime: options.estimatedTime
    };

    this.loadingStates.set(key, state);
    this.notifyListeners();

    // 디버깅 로그
    if (process.env.NODE_ENV === 'development') {
      console.log('⏳ Loading started:', key, state);
    }

    // 예상 시간이 있으면 자동 진행률 업데이트
    if (options.estimatedTime && options.showProgress) {
      this.startProgressSimulation(key, options.estimatedTime);
    }
  }

  /**
   * 로딩 종료
   */
  stopLoading(key: string): void {
    const state = this.loadingStates.get(key);
    if (state) {
      const duration = Date.now() - state.startTime;
      
      // 디버깅 로그
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Loading completed:', key, `(${duration}ms)`);
      }

      this.loadingStates.delete(key);
      this.notifyListeners();
    }
  }

  /**
   * 진행률 업데이트
   */
  updateProgress(key: string, progress: number, message?: string): void {
    const state = this.loadingStates.get(key);
    if (state) {
      state.progress = Math.min(100, Math.max(0, progress));
      if (message) {
        state.message = message;
      }
      this.loadingStates.set(key, state);
      this.notifyListeners();
    }
  }

  /**
   * 메시지 업데이트
   */
  updateMessage(key: string, message: string): void {
    const state = this.loadingStates.get(key);
    if (state) {
      state.message = message;
      this.loadingStates.set(key, state);
      this.notifyListeners();
    }
  }

  /**
   * 로딩 중인지 확인
   */
  isLoading(key?: string): boolean {
    if (key) {
      return this.loadingStates.has(key);
    }
    return this.loadingStates.size > 0;
  }

  /**
   * 특정 패턴의 로딩 상태 확인
   */
  isLoadingPattern(pattern: string): boolean {
    for (const key of this.loadingStates.keys()) {
      if (key.includes(pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 모든 로딩 상태 가져오기
   */
  getLoadingStates(): LoadingState[] {
    return Array.from(this.loadingStates.values());
  }

  /**
   * 특정 로딩 상태 가져오기
   */
  getLoadingState(key: string): LoadingState | undefined {
    return this.loadingStates.get(key);
  }

  /**
   * 활성 로딩 개수
   */
  getActiveCount(): number {
    return this.loadingStates.size;
  }

  /**
   * 모든 로딩 종료
   */
  stopAll(): void {
    this.loadingStates.clear();
    this.notifyListeners();
  }

  /**
   * 리스너 등록
   */
  subscribe(listener: LoadingListener): () => void {
    this.listeners.add(listener);
    // 즉시 현재 상태 전달
    listener(this.loadingStates);
    
    // unsubscribe 함수 반환
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 리스너들에게 알림
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.loadingStates);
      } catch (error) {
        console.error('Error in loading listener:', error);
      }
    });
  }

  /**
   * 기본 메시지 가져오기
   */
  private getDefaultMessage(key: string): string {
    // 키에서 카테고리 추출
    const category = key.split('-')[0];
    return this.defaultMessages[category] || '로딩 중...';
  }

  /**
   * 진행률 시뮬레이션
   */
  private startProgressSimulation(key: string, estimatedTime: number): void {
    const interval = 100; // 100ms마다 업데이트
    const steps = estimatedTime / interval;
    const increment = 90 / steps; // 90%까지만 자동 진행
    let currentProgress = 0;

    const timer = setInterval(() => {
      if (!this.loadingStates.has(key)) {
        clearInterval(timer);
        return;
      }

      currentProgress += increment;
      if (currentProgress >= 90) {
        clearInterval(timer);
        currentProgress = 90;
      }

      this.updateProgress(key, currentProgress);
    }, interval);
  }

  /**
   * 로딩 시간 측정
   */
  measureLoading<T>(key: string, fn: () => Promise<T>, options?: LoadingOptions): Promise<T> {
    this.startLoading(key, options);
    
    return fn()
      .then(result => {
        this.stopLoading(key);
        return result;
      })
      .catch(error => {
        this.stopLoading(key);
        throw error;
      });
  }

  /**
   * 여러 작업 동시 로딩
   */
  async parallel<T>(
    tasks: Array<{ key: string; fn: () => Promise<T>; options?: LoadingOptions }>
  ): Promise<T[]> {
    // 모든 로딩 시작
    tasks.forEach(task => {
      this.startLoading(task.key, task.options);
    });

    try {
      // 모든 작업 실행
      const results = await Promise.all(
        tasks.map(task => 
          task.fn().finally(() => this.stopLoading(task.key))
        )
      );
      return results;
    } catch (error) {
      // 에러 발생 시 모든 로딩 중지
      tasks.forEach(task => this.stopLoading(task.key));
      throw error;
    }
  }

  /**
   * 순차적 작업 로딩
   */
  async sequential<T>(
    tasks: Array<{ key: string; fn: () => Promise<T>; options?: LoadingOptions }>
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (const task of tasks) {
      this.startLoading(task.key, task.options);
      try {
        const result = await task.fn();
        results.push(result);
      } finally {
        this.stopLoading(task.key);
      }
    }
    
    return results;
  }

  /**
   * 디버그 정보 출력
   */
  debug(): void {
    console.log('🔍 LoadingManager Debug:', {
      activeCount: this.loadingStates.size,
      states: Array.from(this.loadingStates.entries()).map(([key, state]) => ({
        key,
        message: state.message,
        progress: state.progress,
        duration: Date.now() - state.startTime
      })),
      listenersCount: this.listeners.size
    });
  }
}

// 전역 인스턴스 export
export const loadingManager = LoadingManager.getInstance();

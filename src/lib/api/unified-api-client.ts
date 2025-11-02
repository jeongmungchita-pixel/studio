/**
 * 통합 API 클라이언트
 * services/api-client.ts와 utils/api-client.ts를 통합
 */
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { RequestBody, ErrorDetails } from '@/types/common';
import { errorManager } from '@/lib/error/error-manager';
import { loadingManager } from '@/services/loading-manager';
import { getAuth } from 'firebase/auth';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  withAuth?: boolean;
  loadingKey?: string;
  cache?: RequestCache;
  retryable?: boolean;
  retryOptions?: {
    maxRetries?: number;
    delay?: number;
    backoff?: 'linear' | 'exponential';
  };
}

/**
 * 통합 API 클라이언트 클래스
 */
export class UnifiedAPIClient {
  private static instance: UnifiedAPIClient;
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private abortControllers: Map<string, AbortController> = new Map();

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): UnifiedAPIClient {
    if (!UnifiedAPIClient.instance) {
      UnifiedAPIClient.instance = new UnifiedAPIClient();
    }
    return UnifiedAPIClient.instance;
  }

  /**
   * 인증 토큰 가져오기
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return null;
      }
      return await currentUser.getIdToken();
    } catch (error) {
      errorManager.handleError(error, {
        action: 'get-auth-token',
        component: 'UnifiedAPIClient'
      });
      return null;
    }
  }

  /**
   * API 요청 실행 (기본 메서드)
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      headers = {},
      params,
      withAuth = true,
      loadingKey,
      cache,
      retryable = true,
      retryOptions = {}
    } = options;

    // 로딩 시작
    if (loadingKey) {
      loadingManager.startLoading(loadingKey, {
        message: `${method} ${endpoint}`
      });
    }

    try {
      // URL 구성
      let url = `${this.baseUrl}${endpoint}`;
      if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value === undefined || value === null) {
            return;
          }
          if (Array.isArray(value)) {
            value.forEach(item => {
              if (item !== undefined && item !== null) {
                searchParams.append(key, String(item));
              }
            });
          } else {
            searchParams.append(key, String(value));
          }
        });
        const queryString = searchParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      // 헤더 구성
      const requestHeaders: Record<string, string> = {
        ...this.defaultHeaders,
        ...headers
      };

      // 인증 토큰 추가
      if (withAuth) {
        const token = await this.getAuthToken();
        if (!token) {
          throw new Error('User not authenticated');
        }
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }

      // AbortController 설정
      const abortController = new AbortController();
      const requestKey = `${method}-${endpoint}`;
      
      // 기존 요청 취소
      if (this.abortControllers.has(requestKey)) {
        this.abortControllers.get(requestKey)?.abort();
      }
      this.abortControllers.set(requestKey, abortController);

      // 요청 옵션
      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
        cache,
        signal: abortController.signal
      };

      // Body 처리
      if (body && method !== 'GET') {
        fetchOptions.body = JSON.stringify(body);
      }

      // 재시도 로직 적용
      const executeRequest = async (): Promise<Response> => {
        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
          const data = await response.json();
          const error = new Error(data.error || data.details || 'Request failed');
          (error as any).statusCode = response.status;
          (error as any).data = data;
          throw error;
        }
        
        return response;
      };

      let response: Response;
      
      if (retryable) {
        response = await errorManager.withRetry(
          () => executeRequest(),
          retryOptions
        );
      } else {
        response = await executeRequest();
      }

      const data = await response.json();

      return {
        success: true,
        data,
        message: data.message || 'Success',
        timestamp: new Date().toISOString()
      };
    } catch (error: unknown) {
      // AbortError는 특별 처리
      if ((error as any)?.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'REQUEST_CANCELLED',
            message: 'Request was cancelled',
            statusCode: 0
          },
          timestamp: new Date().toISOString()
        };
      }

      // 에러 처리
      const errorInfo = errorManager.handleError(error, {
        action: `api-request-${method}`,
        component: 'UnifiedAPIClient',
        metadata: { endpoint }
      });

      return {
        success: false,
        error: {
          code: errorInfo.code || 'UNKNOWN_ERROR',
          message: errorInfo.userMessage,
          details: {
            originalMessage: errorInfo.message,
            type: errorInfo.type
          } as ErrorDetails,
          statusCode: (error as any)?.statusCode || 500
        },
        timestamp: new Date().toISOString()
      };
    } finally {
      // 로딩 종료
      if (loadingKey) {
        loadingManager.stopLoading(loadingKey);
      }
      
      // AbortController 정리
      const requestKey = `${method}-${endpoint}`;
      this.abortControllers.delete(requestKey);
    }
  }

  /**
   * GET 요청
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, unknown>,
    options?: Omit<RequestOptions, 'method' | 'body' | 'params'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
      params
    });
  }

  /**
   * POST 요청
   */
  async post<T = any>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body
    });
  }

  /**
   * PUT 요청
   */
  async put<T = any>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body
    });
  }

  /**
   * DELETE 요청
   */
  async delete<T = any>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE'
    });
  }

  /**
   * 페이지네이션 요청
   */
  async paginated<T = any>(
    endpoint: string,
    page: number = 1,
    pageSize: number = 20,
    params?: Record<string, unknown>,
    options?: Omit<RequestOptions, 'method' | 'params'>
  ): Promise<PaginatedResponse<T>> {
    const response = await this.get<PaginatedResponse<T>>(
      endpoint,
      {
        ...params,
        page,
        pageSize
      },
      options
    );

    if (response.success && response.data) {
      return response.data;
    }

    return {
      items: [],
      total: 0,
      page,
      pageSize,
      hasNext: false,
      hasPrev: false
    };
  }

  /**
   * 파일 업로드
   */
  async upload(
    endpoint: string,
    file: File,
    additionalData?: Record<string, unknown>,
    options?: Omit<RequestOptions, 'method' | 'body' | 'headers'>
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {} // Content-Type은 브라우저가 자동 설정
    });
  }

  /**
   * 파일 다운로드
   */
  async download(
    endpoint: string,
    filename?: string,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<void> {
    try {
      const token = await this.getAuthToken();
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers,
        cache: options?.cache
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      errorManager.handleError(error, {
        action: 'download',
        component: 'UnifiedAPIClient',
        metadata: { endpoint }
      });
      throw error;
    }
  }

  /**
   * 요청 취소
   */
  cancelRequest(endpoint: string, method: string = 'GET'): void {
    const requestKey = `${method}-${endpoint}`;
    const controller = this.abortControllers.get(requestKey);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestKey);
    }
  }

  /**
   * 모든 요청 취소
   */
  cancelAllRequests(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }
}

// 싱글톤 인스턴스 export
export const apiClient = UnifiedAPIClient.getInstance();

/**
 * Admin API 메서드들 (utils/api-client.ts에서 통합)
 */
export const adminAPI = {
  approvals: {
    /**
     * 성인 회원가입 승인
     */
    approveAdult: async (requestId: string) => {
      return apiClient.post('/admin/approvals/adult', { requestId });
    },
    
    /**
     * 가족 회원가입 승인
     */
    approveFamily: async (requestId: string) => {
      return apiClient.post('/admin/approvals/family', { requestId });
    },
    
    /**
     * 일반 회원가입 승인
     */
    approveMember: async (requestId: string) => {
      return apiClient.post('/admin/approvals/member', { requestId });
    },
    
    /**
     * 회원가입 거부
     */
    reject: async (requestId: string, type: 'adult' | 'family' | 'member', reason?: string) => {
      return apiClient.post('/admin/approvals/reject', { requestId, type, reason });
    },
  },

  registrations: {
    /**
     * 성인 회원가입 신청
     */
    submitAdult: async (data: RequestBody) => {
      return apiClient.post('/admin/registrations/adult', data);
    },
    
    /**
     * 가족 회원가입 신청
     */
    submitFamily: async (data: RequestBody) => {
      return apiClient.post('/admin/registrations/family', data);
    },
  },

  users: {
    /**
     * 사용자 상태 업데이트
     */
    updateStatus: async (userId: string, status: string) => {
      return apiClient.post('/admin/users/update-status', { userId, status });
    },
    
    /**
     * 사용자-멤버 연결
     */
    linkMember: async (userId: string, memberId: string, forceUpdate?: boolean) => {
      return apiClient.post('/admin/users/link-member', { userId, memberId, forceUpdate });
    },
    
    /**
     * 가족 관계 복구
     */
    fixFamilyRelationships: async (userId: string) => {
      return apiClient.post('/admin/users/fix-family', { userId });
    },
  },

  passes: {
    /**
     * 이용권 요청
     */
    requestPass: async (data: {
      type: 'new' | 'renewal';
      templateId: string;
      memberId: string;
      paymentMethod: string;
      amount: number;
      notes?: string;
    }) => {
      return apiClient.post('/admin/passes/request', data);
    },
    
    /**
     * 이용권 승인
     */
    approve: async (requestId: string) => {
      return apiClient.post('/admin/passes/approve', { requestId });
    },
    
    /**
     * 이용권 거부
     */
    reject: async (requestId: string, reason?: string) => {
      return apiClient.post('/admin/passes/reject', { requestId, reason });
    },
    
    /**
     * 이용권 취소
     */
    cancel: async (passId: string, reason?: string) => {
      return apiClient.post('/admin/passes/cancel', { passId, reason });
    },
  },
};

// 편의 메서드들 export
export const get = apiClient.get.bind(apiClient);
export const post = apiClient.post.bind(apiClient);
export const put = apiClient.put.bind(apiClient);
export const del = apiClient.delete.bind(apiClient);
export const upload = apiClient.upload.bind(apiClient);
export const download = apiClient.download.bind(apiClient);

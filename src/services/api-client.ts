/**
 * API 클라이언트 서비스
 * 모든 API 호출을 중앙에서 관리합니다.
 */

import { ApiResponse, PaginatedResponse } from '@/types/api';
import { errorHandler } from './error-handler';
import { loadingManager } from './loading-manager';
import { getAuth } from 'firebase/auth';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  withAuth?: boolean;
  loadingKey?: string;
  cache?: RequestCache;
}

export class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * API 요청 실행
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
      cache
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
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
      }

      // 헤더 구성
      const requestHeaders: Record<string, string> = {
        ...this.defaultHeaders,
        ...headers
      };

      // 인증 토큰 추가
      if (withAuth) {
        const token = await this.getAuthToken();
        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`;
        }
      }

      // 요청 옵션
      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
        cache
      };

      // 본문 추가
      if (body && method !== 'GET') {
        fetchOptions.body = JSON.stringify(body);
      }

      // API 호출
      const response = await fetch(url, fetchOptions);
      const data = await response.json();

      // 에러 처리
      if (!response.ok || !data.success) {
        const error = new Error(data.error?.message || 'API 요청 실패');
        (error as any).code = data.error?.code;
        (error as any).statusCode = response.status;
        throw error;
      }

      return data;
    } catch (error) {
      // 에러 핸들러로 전달
      const errorInfo = errorHandler.handle(error, {
        action: 'api-request',
        component: 'ApiClient',
        metadata: { endpoint, method }
      });

      // API 응답 형식으로 변환
      return {
        success: false,
        error: {
          code: errorInfo.code || 'UNKNOWN',
          message: errorInfo.userMessage,
          statusCode: (error as any).statusCode || 500,
          details: errorInfo.context
        },
        timestamp: new Date().toISOString()
      };
    } finally {
      // 로딩 종료
      if (loadingKey) {
        loadingManager.stopLoading(loadingKey);
      }
    }
  }

  /**
   * GET 요청
   */
  async get<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    const response = await this.request<T>(endpoint, { ...options, method: 'GET' });
    if (!response.success) {
      throw new Error(response.error?.message || 'GET 요청 실패');
    }
    return response.data!;
  }

  /**
   * POST 요청
   */
  async post<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    const response = await this.request<T>(endpoint, { ...options, method: 'POST', body });
    if (!response.success) {
      throw new Error(response.error?.message || 'POST 요청 실패');
    }
    return response.data!;
  }

  /**
   * PUT 요청
   */
  async put<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    const response = await this.request<T>(endpoint, { ...options, method: 'PUT', body });
    if (!response.success) {
      throw new Error(response.error?.message || 'PUT 요청 실패');
    }
    return response.data!;
  }

  /**
   * DELETE 요청
   */
  async delete<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    const response = await this.request<T>(endpoint, { ...options, method: 'DELETE' });
    if (!response.success) {
      throw new Error(response.error?.message || 'DELETE 요청 실패');
    }
    return response.data!;
  }

  /**
   * PATCH 요청
   */
  async patch<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    const response = await this.request<T>(endpoint, { ...options, method: 'PATCH', body });
    if (!response.success) {
      throw new Error(response.error?.message || 'PATCH 요청 실패');
    }
    return response.data!;
  }

  /**
   * 페이지네이션 요청
   */
  async getPaginated<T = any>(
    endpoint: string,
    params?: {
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      [key: string]: any;
    },
    options?: Omit<RequestOptions, 'method' | 'params'>
  ): Promise<PaginatedResponse<T>> {
    return this.get<PaginatedResponse<T>>(endpoint, { ...options, params });
  }

  /**
   * 파일 업로드
   */
  async upload(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    // 추가 데이터 포함
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    // Content-Type 헤더 제거 (브라우저가 자동 설정)
    const headers = { ...options?.headers };
    delete headers['Content-Type'];

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      body: formData,
      headers: {
        ...headers,
        ...(options?.withAuth !== false && {
          Authorization: `Bearer ${await this.getAuthToken()}`
        })
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || '파일 업로드 실패');
    }

    return data.data;
  }

  /**
   * 파일 다운로드
   */
  async download(endpoint: string, filename?: string): Promise<void> {
    const token = await this.getAuthToken();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      throw new Error('파일 다운로드 실패');
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
  }

  /**
   * 인증 토큰 가져오기
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return null;
      return await user.getIdToken();
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * 기본 헤더 설정
   */
  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  /**
   * 기본 헤더 제거
   */
  removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  /**
   * 베이스 URL 변경
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }
}

// 전역 인스턴스 export
export const apiClient = ApiClient.getInstance();

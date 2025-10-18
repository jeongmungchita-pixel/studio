// ============================================
// 🤖 BEFS Hybrid Agent API 서비스
// ============================================

import { API_CONFIG } from '@/constants/config';
import { BefsHealthResponse, BefsSummaryResponse, BefsTask, CreateTaskRequest, TaskMetadata, TaskStatus, TaskPriority, BefsApiResponse, BefsErrorResponse } from '@/types/befs';

/**
 * BEFS Hybrid Agent API 클라이언트
 */
export class BefsAgentService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = API_CONFIG.BEFS_AGENT.BASE_URL;
    this.timeout = API_CONFIG.BEFS_AGENT.TIMEOUT;
  }

  /**
   * API 요청 헬퍼
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<BefsApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: BefsErrorResponse = await response.json();
        return {
          success: false,
          error: {
            ...error,
            status_code: response.status,
          },
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        return {
          success: false,
          error: {
            detail: error.name === 'AbortError' 
              ? 'Request timeout' 
              : error.message,
            status_code: 0,
          },
        };
      }

      return {
        success: false,
        error: {
          detail: 'Unknown error occurred',
          status_code: 0,
        },
      };
    }
  }

  /**
   * 헬스 체크
   */
  async checkHealth(): Promise<BefsApiResponse<BefsHealthResponse>> {
    return this.request<BefsHealthResponse>(
      API_CONFIG.BEFS_AGENT.ENDPOINTS.HEALTH
    );
  }

  /**
   * 세션 요약 가져오기
   */
  async getSummary(): Promise<BefsApiResponse<BefsSummaryResponse>> {
    return this.request<BefsSummaryResponse>(
      API_CONFIG.BEFS_AGENT.ENDPOINTS.SUMMARY
    );
  }

  /**
   * 모든 Task 가져오기
   */
  async getTasks(): Promise<BefsApiResponse<BefsTask[]>> {
    return this.request<BefsTask[]>(
      API_CONFIG.BEFS_AGENT.ENDPOINTS.TASKS
    );
  }

  /**
   * 새 Task 생성
   */
  async createTask(task: CreateTaskRequest): Promise<BefsApiResponse<BefsTask>> {
    return this.request<BefsTask>(
      API_CONFIG.BEFS_AGENT.ENDPOINTS.TASKS,
      {
        method: 'POST',
        body: JSON.stringify(task),
      }
    );
  }

  /**
   * Task 토글 (todo ↔ done)
   */
  async toggleTask(taskId: number): Promise<BefsApiResponse<{ updated: number; status: string }>> {
    return this.request<{ updated: number; status: string }>(
      API_CONFIG.BEFS_AGENT.ENDPOINTS.TASK_BY_ID(taskId),
      {
        method: 'PUT',
      }
    );
  }

  /**
   * Task 삭제
   */
  async deleteTask(taskId: number): Promise<BefsApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(
      API_CONFIG.BEFS_AGENT.ENDPOINTS.TASK_BY_ID(taskId),
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Task 메타데이터 파싱 헬퍼
   */
  parseTaskMetadata(task: BefsTask): TaskMetadata | null {
    if (!task.metadata) return null;
    try {
      return JSON.parse(task.metadata);
    } catch {
      return null;
    }
  }

  /**
   * 우선순위 레이블 가져오기
   */
  getPriorityLabel(priority: TaskPriority): string {
    const labels: Record<TaskPriority, string> = {
      1: '🔥 긴급',
      2: '⚡ 높음',
      3: '📌 보통',
      4: '📋 낮음',
      5: '💤 매우 낮음',
    };
    return labels[priority] || '📌 보통';
  }

  /**
   * 상태 레이블 가져오기
   */
  getStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      todo: '📝 할 일',
      doing: '🔄 진행 중',
      done: '✅ 완료',
      blocked: '🚫 차단됨',
      dropped: '❌ 취소됨',
    };
    return labels[status] || '📝 할 일';
  }

  /**
   * 서버 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    const result = await this.checkHealth();
    return result.success && result.data.ok;
  }

  /**
   * 서버 정보 가져오기
   */
  async getServerInfo(): Promise<BefsApiResponse<{ version: string; healthy: boolean }>> {
    const healthResult = await this.checkHealth();
    
    if (!healthResult.success) {
      return healthResult as BefsApiResponse<{ version: string; healthy: boolean }>;
    }

    return {
      success: true,
      data: {
        version: healthResult.data.version,
        healthy: healthResult.data.ok,
      },
    };
  }
}

// 싱글톤 인스턴스 export
export const befsAgentService = new BefsAgentService();

// 편의 함수들
export const checkBefsHealth = () => befsAgentService.checkHealth();
export const getBefsSummary = () => befsAgentService.getSummary();
export const getBefsTasks = () => befsAgentService.getTasks();
export const createBefsTask = (task: CreateTaskRequest) => befsAgentService.createTask(task);
export const toggleBefsTask = (taskId: number) => befsAgentService.toggleTask(taskId);
export const deleteBefsTask = (taskId: number) => befsAgentService.deleteTask(taskId);
export const testBefsConnection = () => befsAgentService.testConnection();

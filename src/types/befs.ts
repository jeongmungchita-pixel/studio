// ============================================
// 🤖 BEFS Hybrid Agent API 타입 정의
// ============================================

/**
 * BEFS Agent 헬스 체크 응답
 */
export interface BefsHealthResponse {
  ok: boolean;
  version: string;
}

/**
 * BEFS Agent 요약 응답
 */
export interface BefsSummaryResponse {
  summary: string;
}

/**
 * Task 상태
 */
export type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked' | 'dropped';

/**
 * Task 우선순위 (1=hot, 5=low)
 */
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

/**
 * Task 객체
 */
export interface BefsTask {
  id: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: string | null; // JSON blob
}

/**
 * Task 생성 요청
 */
export interface CreateTaskRequest {
  title: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_at?: string;
  metadata?: string; // JSON string
}

/**
 * Task 업데이트 요청
 */
export interface UpdateTaskRequest {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_at?: string;
  metadata?: string;
}

/**
 * Task 메타데이터 (파싱된 형태)
 */
export interface TaskMetadata {
  area?: string;
  notes?: string;
  project?: string;
  labels?: string[];
  [key: string]: any;
}

/**
 * API 에러 응답
 */
export interface BefsErrorResponse {
  detail: string;
  status_code?: number;
}

/**
 * API 응답 래퍼
 */
export type BefsApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: BefsErrorResponse };

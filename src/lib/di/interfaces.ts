/**
 * DI 인터페이스 정의
 */
import { User } from 'firebase/auth';
import { Firestore, DocumentData, DocumentReference, CollectionReference, Query, QueryConstraint, WithFieldValue, UpdateData } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { UserProfile, UserRole } from '@/types/auth';
import { Club } from '@/types/club';
import { ClubEvent } from '@/types/club';
import { Member } from '@/types/member';
import { MemberPass } from '@/types/business';
import { ApiResponse, QueryOptions, PaginationOptions, PaginatedResponse } from '@/types/api';
import { AuditLog } from '@/services/audit-service';

// Firebase 서비스 인터페이스
export interface IFirebaseService {
  getCurrentUser(): User | null;
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
  signOut(): Promise<void>;
  getFirestore(): Firestore | null;
}

// 인증 서비스 인터페이스
export interface IAuthService {
  getUserProfile(user: User, firestore: Firestore): Promise<UserProfile | null>;
  hasPendingRequests(uid: string, firestore: Firestore): Promise<boolean>;
  createUserProfile(userData: Partial<UserProfile>, firestore: Firestore): Promise<string>;
  updateUserProfile(uid: string, userData: Partial<UserProfile>, firestore: Firestore): Promise<void>;
  deleteUserProfile(uid: string, firestore: Firestore): Promise<void>;
  getRedirectUrlByRole(role: UserRole, status?: string): string;
}

// 캐시 서비스 인터페이스
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

// 쿼리 서비스 인터페이스
export interface IQueryService {
  getDocs<T = DocumentData>(query: Query<T>): Promise<T[]>;
  getDoc<T = DocumentData>(docRef: DocumentReference<T>): Promise<T | null>;
  onSnapshot<T = DocumentData>(
    query: Query<T>,
    callback: (data: T[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void;
}

// API 클라이언트 인터페이스
export interface IAPIClient {
  get<T = any>(url: string, options?: RequestInit): Promise<T>;
  post<T = any>(url: string, data?: any, options?: RequestInit): Promise<T>;
  put<T = any>(url: string, data?: any, options?: RequestInit): Promise<T>;
  patch<T = any>(url: string, data?: any, options?: RequestInit): Promise<T>;
  delete<T = any>(url: string, options?: RequestInit): Promise<T>;
}

// Base API 서비스 인터페이스
export interface IBaseAPIService<T = DocumentData> {
  create(data: WithFieldValue<T>, id?: string): Promise<ApiResponse<T & { id: string }>>;
  findById(id: string): Promise<ApiResponse<(T & { id: string }) | null>>;
  update(id: string, data: UpdateData<T>): Promise<ApiResponse<T & { id: string }>>;
  delete(id: string): Promise<ApiResponse<boolean>>;
  findMany(options?: QueryOptions): Promise<ApiResponse<(T & { id: string })[]>>;
  findManyPaginated(options?: PaginationOptions): Promise<PaginatedResponse<T & { id: string }>>;
}

// 클럽 API 서비스 인터페이스
export interface IClubAPIService extends IBaseAPIService<Club> {
  getClubByName(name: string): Promise<ApiResponse<Club | null>>;
  getClubByCode(code: string): Promise<ApiResponse<Club | null>>;
  addMember(clubId: string, memberId: string): Promise<ApiResponse<boolean>>;
  removeMember(clubId: string, memberId: string): Promise<ApiResponse<boolean>>;
}

// 사용자 API 서비스 인터페이스
export interface IUserAPIService extends IBaseAPIService<UserProfile> {
  getUserByEmail(email: string): Promise<ApiResponse<UserProfile | null>>;
  getUserByRole(role: UserRole): Promise<ApiResponse<UserProfile[]>>;
  updateUserRole(userId: string, role: UserRole): Promise<ApiResponse<boolean>>;
}

// 이벤트 API 서비스 인터페이스
export interface IEventAPIService extends IBaseAPIService<ClubEvent> {
  getEventByName(name: string): Promise<ApiResponse<ClubEvent | null>>;
  getEventsByClub(clubId: string): Promise<ApiResponse<ClubEvent[]>>;
  registerEvent(eventId: string, userId: string): Promise<ApiResponse<boolean>>;
  unregisterEvent(eventId: string, userId: string): Promise<ApiResponse<boolean>>;
}

// 이벤트 서비스 인터페이스 (별칭)
export interface IEventService extends IEventAPIService {}

// 알림 서비스 인터페이스
export interface INotificationService {
  getNotifications(userId: string, page?: number, pageSize?: number, filters?: any): Promise<PaginatedResponse<any>>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  send(data: any): Promise<void>;
}

// 멤버 서비스 인터페이스
export interface IMemberService {
  getMemberById(id: string): Promise<Member | null>;
  getMembersByClub(clubId: string): Promise<Member[]>;
  getMembersByGuardian(guardianId: string): Promise<Member[]>;
  getMemberPasses(memberIds: string[]): Promise<{ data: MemberPass[] }>;
  purchasePass(data: { memberId: string; templateId: string; paymentMethod: string; notes?: string }): Promise<void>;
  createMember(member: Omit<Member, 'id'>): Promise<Member>;
  updateMember(id: string, updates: Partial<Member>): Promise<Member>;
  deleteMember(id: string): Promise<boolean>;
}

// 네비게이션 서비스 인터페이스
export interface INavigationService {
  push(path: string): void;
  replace(path: string): void;
  back(): void;
  forward(): void;
  refresh(): void;
  prefetch(path: string): Promise<void>;
}

// API 헬퍼 서비스 인터페이스
export interface IAPIHelperService {
  validateRequest(request: NextRequest): Promise<boolean>;
  handleError(error: any): Promise<NextResponse>;
  createSuccessResponse<T>(data: T): NextResponse;
  createErrorResponse(message: string, status: number): NextResponse;
}

// 로딩 서비스 인터페이스
export interface ILoadingService {
  show(message?: string): void;
  hide(): void;
  isLoading(): boolean;
}

// API 클라이언트 인터페이스
export interface IAPIClient {
  get<T>(endpoint: string, options?: any): Promise<any>;
  post<T>(endpoint: string, data?: any, options?: any): Promise<any>;
  put<T>(endpoint: string, data?: any, options?: any): Promise<any>;
  delete<T>(endpoint: string, options?: any): Promise<any>;
  upload<T>(endpoint: string, file: File, options?: any): Promise<any>;
  download(endpoint: string, filename?: string): Promise<void>;
}

// 감사 서비스 인터페이스
export interface IAuditService {
  log(log: Omit<AuditLog, 'timestamp' | 'ipAddress' | 'userAgent'>): Promise<void>;
  getLogs(filters?: any): Promise<any[]>;
  clearLogs(): Promise<void>;
}

// 검증 서비스 인터페이스
export interface IValidationService {
  validateEmail(email: string): boolean;
  validatePassword(password: string): { isValid: boolean; errors: string[] };
  validatePhoneNumber(phone: string): boolean;
  validateRequired(value: any, fieldName: string): { isValid: boolean; error?: string };
  sanitizeInput(input: string): string;
}

// 유틸리티 서비스 인터페이스
export interface IUtilsService {
  cn(...inputs: any[]): string;
  formatDate(date: Date, format?: string): string;
  debounce<T extends (...args: any[]) => any>(func: T, wait: number): T;
  throttle<T extends (...args: any[]) => any>(func: T, limit: number): T;
  generateId(length?: number): string;
  deepClone<T>(obj: T): T;
}

// 보안 감사 서비스 인터페이스
export interface ISecurityAuditService {
  logEvent(type: string, data?: any, context?: any): void;
  getEvents(filter?: any): any[];
  getSecurityStats(period?: string): any;
  exportEvents(format: string): string;
  clearEvents(): void;
}

// RBAC (Role-Based Access Control) 서비스 인터페이스
export interface IRBACService {
  hasRole(userRole: UserRole, requiredRole: UserRole): boolean;
  hasPermission(userRole: UserRole, permission: string): boolean;
  canAccessResource(userRole: UserRole, resource: string, action: string): boolean;
  getPermissions(role: UserRole): string[];
  getResourcesWithAccess(role: UserRole): string[];
}

// 데이터 암호화 서비스 인터페이스
export interface IDataEncryptionService {
  encrypt(data: string, key?: string): string;
  decrypt(encryptedData: string, key?: string): string;
  encryptObject<T>(obj: T, key?: string): string;
  decryptObject<T>(encryptedData: string, key?: string): T;
  generateKey(): string;
  hash(data: string): string;
}

// 성능 모니터링 서비스 인터페이스
export interface IPerformanceService {
  trackMetric(name: string, value: number, tags?: Record<string, string>): void;
  trackEvent(name: string, data?: Record<string, any>): void;
  trackError(error: Error, context?: Record<string, any>): void;
  getMetrics(): Promise<any[]>;
  getHealthStatus(): Promise<{ status: 'healthy' | 'degraded' | 'down'; timestamp: string }>;
}

// 모니터링 서비스 인터페이스
export interface IMonitoringService {
  trackMetric(name: string, value: number, tags?: Record<string, string>): void;
  trackEvent(name: string, data?: Record<string, any>): void;
  trackError(error: Error, context?: Record<string, any>): void;
  getMetrics(): Promise<any[]>;
  getHealthStatus(): Promise<{ status: 'healthy' | 'degraded' | 'down'; timestamp: string }>;
}

// 로거 서비스 인터페이스
export interface ILoggerService {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

// 에러 관리 서비스 인터페이스
export interface IErrorService {
  handleError(error: unknown, context?: Partial<ErrorContext>): ErrorInfo;
  logError(error: unknown, context?: Partial<ErrorContext>): ErrorInfo;
  clearErrors(): void;
  getErrors(): ErrorInfo[];
}

// 에러 컨텍스트 타입
export interface ErrorContext {
  action?: string;
  resource?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
  component?: string;
}

// 에러 타입 enum
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  FIREBASE = 'FIREBASE',
  SYSTEM = 'SYSTEM',
  UNKNOWN = 'UNKNOWN'
}

// 에러 심각도 enum
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// 에러 정보 타입
export interface ErrorInfo {
  type: ErrorType;
  severity: ErrorSeverity;
  code: string;
  message: string;
  userMessage: string;
  context?: Partial<ErrorContext>;
  timestamp: string;
  stack?: string;
  originalError?: Error;
  recoverable: boolean;
  retryable: boolean;
}

// API 팩토리 서비스 인터페이스
export interface IAPIFactoryService {
  createUserAPI(firestore?: Firestore): any;
  createClubAPI(firestore?: Firestore): any;
}

// 서비스 키 타입
export type ServiceKey = 
  | 'firebaseService'
  | 'authService'
  | 'queryService'
  | 'apiClient'
  | 'userService'
  | 'errorManager'
  | 'loadingManager'
  | (string & {});

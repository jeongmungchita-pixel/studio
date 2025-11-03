/**
 * Firebase 어댑터 구현 (Admin SDK only)
 * - 포트(인터페이스)의 Firebase Admin SDK 구현체
 * - 인프라 싱글톤을 주입받아 사용
 */

// 개별 어댑터 파일들 import
export { FirebaseAuthAdapter } from './auth';
export { FirebaseUserRepositoryAdapter } from './user';
export { FirebaseMemberRepositoryAdapter } from './member';
export { FirebaseClubRepositoryAdapter } from './club';
export { FirebaseStatisticsAdapter } from './statistics';
export { FirebaseAuditAdapter } from './audit';
export { FirebaseNotificationAdapter } from './notification';
export { FirebaseStorageAdapter } from './storage';
export { FirebaseSearchAdapter } from './search';

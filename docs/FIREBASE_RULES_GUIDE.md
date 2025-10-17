# Firebase 보안 규칙 가이드

리팩토링된 도메인 기반 아키텍처에 맞춰 업데이트된 Firebase 보안 규칙 가이드입니다.

## 📋 개요

### 도메인 구조
- **Auth**: 인증 및 사용자 관리
- **Member**: 회원 데이터 및 운영
- **Club**: 클럽 데이터 및 운영
- **Business**: 재무 및 관리 데이터

### 역할 정의 (`/src/constants/roles.ts`)
```typescript
SUPER_ADMIN      // 전체 시스템 접근
FEDERATION_ADMIN // 연맹 차원 접근
CLUB_OWNER       // 클럽 관리 접근
CLUB_MANAGER     // 클럽 운영 접근
COACH            // 수업 및 회원 관리
MEMBER           // 개인 데이터만 접근
```

## 🔐 Firestore 보안 규칙

### 주요 변경사항
1. **COACH 역할 추가**: 수업 및 회원 관리 권한
2. **도메인별 주석**: 각 컬렉션이 속한 도메인 명시
3. **세분화된 권한**: 회원의 개인정보 수정 제한
4. **향상된 보안**: 중요 필드 수정 권한 분리

### 컬렉션별 접근 권한

#### Members Collection (Member Domain)
```javascript
match /members/{memberId} {
  // 읽기: 관리자, 클럽 스태프, 본인
  allow read: if isAdmin() || isClubStaff() || isOwner();
  
  // 생성: 관리자 또는 클럽 스태프
  allow create: if isAdmin() || isClubStaff();
  
  // 수정: 제한적 (본인은 개인정보만)
  allow update: if isAdmin() || isClubStaff() || isLimitedSelfUpdate();
}
```

#### Clubs Collection (Club Domain)
```javascript
match /clubs/{clubId} {
  // 읽기: 인증된 사용자 누구나
  allow read: if isAuthenticated();
  
  // 수정: 관리자 또는 클럽 오너
  allow update: if isAdmin() || isClubOwner(clubId);
}
```

## 🗂️ Storage 보안 규칙

### 디렉토리 구조
```
/users/{userId}/profile/*     - 사용자 프로필 이미지
/members/{memberId}/*         - 회원 문서 및 미디어
/clubs/{clubId}/*             - 클럽 로고 및 문서
/events/{eventId}/*           - 이벤트 사진 및 문서
/classes/{classId}/*          - 수업 자료
/financial/{clubId}/*         - 재무 문서
/public/*                     - 공개 자산
```

### 접근 권한 매트릭스

| 경로 | 읽기 | 쓰기 | 삭제 |
|------|------|------|------|
| `/users/{userId}/profile/*` | 인증된 사용자 | 본인/관리자 | 본인/관리자 |
| `/members/{memberId}/*` | 관리자/클럽스태프/본인 | 관리자/클럽스태프 | 관리자 |
| `/clubs/{clubId}/*` | 인증된 사용자 | 관리자/해당클럽스태프 | 관리자/클럽오너 |
| `/financial/{clubId}/*` | 관리자/해당클럽스태프 | 관리자/해당클럽스태프 | 관리자 |
| `/public/*` | 누구나 | 관리자 | 관리자 |

## 📊 Firestore 인덱스

### 도메인별 인덱스 최적화

#### Member Domain
```json
{
  "collectionGroup": "members",
  "fields": [
    { "fieldPath": "clubId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

#### Business Domain
```json
{
  "collectionGroup": "payments",
  "fields": [
    { "fieldPath": "memberId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### 배열 필드 인덱스
```json
{
  "collectionGroup": "members",
  "fieldPath": "guardianIds",
  "indexes": [
    { "arrayConfig": "CONTAINS", "queryScope": "COLLECTION" }
  ]
}
```

## 🚀 배포 가이드

### 1. 규칙 검증
```bash
# Firestore 규칙 검증
firebase firestore:rules:validate

# Storage 규칙 검증  
firebase storage:rules:validate
```

### 2. 인덱스 배포
```bash
# 인덱스 배포
firebase deploy --only firestore:indexes

# 진행 상황 확인
firebase firestore:indexes
```

### 3. 규칙 배포
```bash
# 모든 규칙 배포
firebase deploy --only firestore:rules,storage:rules

# 개별 배포
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## ⚠️ 주의사항

### 보안 고려사항
1. **최소 권한 원칙**: 필요한 최소한의 권한만 부여
2. **데이터 검증**: 클라이언트 데이터 검증 규칙 추가
3. **감사 로그**: 중요한 작업에 대한 로깅 구현

### 성능 최적화
1. **인덱스 최적화**: 자주 사용되는 쿼리에 대한 복합 인덱스
2. **규칙 최적화**: 중복 검증 최소화
3. **캐싱**: 사용자 데이터 캐싱으로 규칙 평가 최적화

### 테스트
```bash
# 규칙 테스트 실행
npm run test:rules

# 특정 도메인 테스트
npm run test:rules -- --domain=member
```

## 📚 참고 자료

- [Firebase Security Rules 공식 문서](https://firebase.google.com/docs/rules)
- [Firestore 보안 규칙 가이드](https://firebase.google.com/docs/firestore/security/get-started)
- [Storage 보안 규칙 가이드](https://firebase.google.com/docs/storage/security)
- [인덱스 최적화 가이드](https://firebase.google.com/docs/firestore/query-data/indexing)

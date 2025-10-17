# 🔒 보안 가이드

## 개요

이 문서는 체조 연맹 관리 시스템의 보안 정책과 구현 사항을 설명합니다.

## 보안 아키텍처

### 1. 네트워크 보안

#### HTTPS 강제 적용
- 모든 통신은 HTTPS로 암호화
- HSTS (HTTP Strict Transport Security) 헤더 적용
- 인증서 자동 갱신 설정

```javascript
// next.config.js
{
  key: 'Strict-Transport-Security',
  value: 'max-age=31536000; includeSubDomains; preload'
}
```

#### CSP (Content Security Policy)
- XSS 공격 방지를 위한 엄격한 CSP 정책
- 신뢰할 수 있는 소스만 허용
- 인라인 스크립트 제한

### 2. 인증 및 권한 관리

#### Firebase Authentication
- 다중 인증 방식 지원 (이메일/비밀번호, 소셜 로그인)
- JWT 토큰 기반 인증
- 세션 관리 및 자동 만료

#### 역할 기반 접근 제어 (RBAC)
```typescript
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  FEDERATION_ADMIN = 'FEDERATION_ADMIN',
  CLUB_OWNER = 'CLUB_OWNER',
  COACH = 'COACH',
  MEMBER = 'MEMBER'
}
```

#### 권한 계층 구조
- SUPER_ADMIN (최고 관리자)
- FEDERATION_ADMIN (연맹 관리자)
- CLUB_OWNER (클럽 소유자)
- COACH (코치)
- MEMBER (일반 회원)

### 3. API 보안

#### Rate Limiting
- IP별 분당 100회 요청 제한
- 과도한 요청 시 429 상태 코드 반환
- Retry-After 헤더 제공

#### 요청 검증
- Content-Type 검증
- Origin 헤더 검증 (CSRF 방지)
- 입력 데이터 검증 및 새니타이징

#### API 키 관리
- 환경 변수를 통한 API 키 관리
- 개발/스테이징/프로덕션 환경별 분리
- 정기적인 키 로테이션

### 4. 데이터 보안

#### Firestore 보안 규칙
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자는 자신의 데이터만 읽기/쓰기 가능
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 관리자만 모든 사용자 데이터 접근 가능
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['SUPER_ADMIN', 'FEDERATION_ADMIN'];
    }
  }
}
```

#### 개인정보 보호
- 민감한 정보 암호화 저장
- PII (개인식별정보) 최소 수집
- GDPR 준수 데이터 처리

### 5. 클라이언트 보안

#### XSS 방지
- React의 기본 XSS 보호 활용
- dangerouslySetInnerHTML 사용 금지
- 사용자 입력 검증 및 이스케이핑

#### CSRF 방지
- SameSite 쿠키 설정
- Origin 헤더 검증
- CSRF 토큰 사용

#### 클릭재킹 방지
- X-Frame-Options: DENY 헤더
- CSP frame-ancestors 지시어

## 보안 체크리스트

### 개발 단계
- [ ] 모든 사용자 입력 검증
- [ ] SQL 인젝션 방지 (Firestore 사용으로 자동 방지)
- [ ] XSS 방지 코드 작성
- [ ] 민감한 정보 하드코딩 금지
- [ ] 환경 변수 사용

### 배포 단계
- [ ] HTTPS 인증서 설정
- [ ] 보안 헤더 적용
- [ ] Firestore 보안 규칙 배포
- [ ] API 키 환경 변수 설정
- [ ] 로그 모니터링 설정

### 운영 단계
- [ ] 정기적인 보안 스캔
- [ ] 의존성 취약점 모니터링
- [ ] 로그 분석 및 이상 탐지
- [ ] 백업 및 복구 계획
- [ ] 인시던트 대응 계획

## 보안 모니터링

### 로그 수집
```typescript
// 보안 이벤트 로깅
export function logSecurityEvent(event: SecurityEvent) {
  console.log(`[SECURITY] ${event.type}: ${event.message}`, {
    timestamp: new Date().toISOString(),
    userId: event.userId,
    ip: event.ip,
    userAgent: event.userAgent
  });
}
```

### 알림 설정
- 실패한 로그인 시도 모니터링
- 비정상적인 API 호출 패턴 감지
- 권한 상승 시도 감지

## 인시던트 대응

### 1단계: 탐지 및 분석
- 보안 이벤트 로그 분석
- 영향 범위 평가
- 공격 벡터 식별

### 2단계: 격리 및 차단
- 의심스러운 IP 차단
- 영향받은 계정 비활성화
- 시스템 격리 (필요시)

### 3단계: 복구 및 복원
- 시스템 무결성 검증
- 데이터 복구
- 서비스 재개

### 4단계: 사후 분석
- 근본 원인 분석
- 보안 정책 업데이트
- 재발 방지 대책 수립

## 규정 준수

### GDPR (일반 데이터 보호 규정)
- 개인정보 처리 방침 공개
- 사용자 동의 관리
- 데이터 삭제 권리 보장
- 데이터 이동권 지원

### 개인정보보호법
- 개인정보 수집 최소화
- 목적 외 사용 금지
- 안전성 확보 조치
- 개인정보 영향평가

## 보안 교육

### 개발자 교육
- 보안 코딩 가이드라인
- OWASP Top 10 교육
- 정기적인 보안 워크샵

### 사용자 교육
- 안전한 비밀번호 정책
- 피싱 공격 인식
- 개인정보 보호 의식

## 연락처

보안 관련 문의나 취약점 신고:
- 이메일: security@federation.com
- 전화: 02-1234-5678
- 긴급상황: 24/7 보안 핫라인

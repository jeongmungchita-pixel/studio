# 승인 프로세스 가이드

> 최종 업데이트: 2025-10-15

---

## 🎯 개요

KGF 넥서스는 **두 가지 독립적인 승인 프로세스**를 운영합니다:

1. **회원 가입 승인** - 새로운 회원의 클럽 가입 승인
2. **이용권 갱신 승인** - 기존 회원의 이용권 갱신 승인

---

## 👥 1. 회원 가입 승인 프로세스

### 📍 담당 페이지
- **신청**: `/register/member-with-contract` (계약서 포함)
- **승인**: `/club-dashboard/member-approvals`

### 📊 데이터 흐름

```
사용자 (회원/보호자)
    ↓
1. 가입 신청서 작성
   - 기본 정보 입력
   - 약관 동의
   - 전자 서명
    ↓
2. memberRegistrationRequests 컬렉션에 저장
   - status: 'pending'
   - clubId: 선택한 클럽 ID
    ↓
클럽 오너/매니저
    ↓
3. /club-dashboard/member-approvals에서 확인
   - 신청자 정보 검토
   - 계약서 및 서명 확인
    ↓
4-A. 승인 시:
   → members 컬렉션에 회원 생성
      - status: 'active'
      - clubId: 클럽 ID
      - guardianIds: [] (향후 구현)
   
   → memberRegistrationRequests 상태 업데이트
      - status: 'approved'
      - approvedBy: 승인자 UID
      - approvedAt: 승인 시간

4-B. 거절 시:
   → memberRegistrationRequests 상태 업데이트
      - status: 'rejected'
      - rejectedBy: 거절자 UID
      - rejectedAt: 거절 시간
      - rejectionReason: 거절 사유
```

### 🔑 주요 필드

**memberRegistrationRequests**:
```typescript
{
  id: string;
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  phoneNumber: string;
  clubId: string;
  clubName: string;
  isMinor: boolean;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  agreements: {
    personalInfo: boolean;
    terms: boolean;
    safety: boolean;
    portrait: boolean;
    agreedAt: string;
  };
  signature: string; // Base64 이미지
  signedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}
```

### ⚠️ 현재 제한사항

1. **보호자 계정 연결 미구현**
   - `guardianIds` 배열이 비어있음
   - 향후 보호자가 로그인하여 자녀를 등록하는 플로우 필요

2. **간단한 가입 신청** (`/register/member`)
   - 계약서 없는 간단한 버전
   - 동일하게 `memberRegistrationRequests`에 저장
   - 일부 필드가 누락될 수 있음

---

## 🎫 2. 이용권 갱신 승인 프로세스

### 📍 담당 페이지
- **신청**: `/members/[id]` (회원 상세 페이지)
- **승인**: `/club-dashboard/approvals`

### 📊 데이터 흐름

```
회원/보호자
    ↓
1. 회원 상세 페이지에서 이용권 갱신 신청
   - 만료된 이용권 확인
   - 이용권 템플릿 선택
    ↓
2. pass_renewal_requests 컬렉션에 저장
   - status: 'pending'
   - memberId: 회원 ID
   - passTemplateId: 선택한 템플릿 ID
    ↓
클럽 오너/매니저
    ↓
3. /club-dashboard/approvals에서 확인
   - 회원 정보 확인
   - 이용권 템플릿 확인
    ↓
4-A. 승인 시:
   → member_passes 컬렉션에 새 이용권 생성
      - status: 'active'
      - startDate: 현재 시간
      - endDate: startDate + durationDays
      - totalSessions: 템플릿의 총 횟수
      - remainingSessions: 템플릿의 총 횟수
      - attendanceCount: 0
   
   → pass_renewal_requests 상태 업데이트
      - status: 'approved'

4-B. 거절 시:
   → pass_renewal_requests 상태 업데이트
      - status: 'rejected'
      - rejectionReason: 거절 사유
```

### 🔑 주요 필드

**pass_renewal_requests**:
```typescript
{
  id: string;
  memberId: string;
  memberName: string;
  clubId: string;
  passTemplateId: string;
  passTemplateName: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}
```

**member_passes** (승인 시 생성):
```typescript
{
  id: string;
  memberId: string;
  clubId: string;
  passName: string;
  passType: 'period' | 'session' | 'unlimited';
  startDate: string;
  endDate?: string;
  totalSessions?: number;
  attendableSessions?: number;
  remainingSessions?: number;
  attendanceCount: number;
  status: 'active' | 'expired' | 'pending';
}
```

---

## 🔐 권한 체계

### Firestore Rules

**memberRegistrationRequests**:
```javascript
// 읽기: 관리자 또는 해당 클럽 스태프
allow read: if isAdmin() || (isClubStaff() && belongsToClub(resource.data.clubId));

// 생성: 누구나 (회원 가입 신청)
allow create: if true;

// 수정/삭제: 관리자 또는 해당 클럽 스태프
allow update, delete: if isAdmin() || (isClubStaff() && belongsToClub(resource.data.clubId));
```

**pass_renewal_requests**:
```javascript
// 읽기: 관리자, 클럽 스태프, 본인
allow read: if isAdmin() || isClubStaff() || 
            (isAuthenticated() && resource.data.memberId == request.auth.uid);

// 생성: 인증된 사용자
allow create: if isAuthenticated();

// 수정/삭제: 관리자 또는 클럽 스태프
allow update, delete: if isAdmin() || isClubStaff();
```

---

## 📝 컬렉션 정리

### ✅ 사용 중인 컬렉션

| 컬렉션 | 용도 | 페이지 |
|--------|------|--------|
| `memberRegistrationRequests` | 회원 가입 신청 | `/register/member-with-contract` |
| `pass_renewal_requests` | 이용권 갱신 신청 | `/members/[id]` |
| `members` | 승인된 회원 | 승인 후 생성 |
| `member_passes` | 활성 이용권 | 승인 후 생성 |

### ❌ Deprecated 컬렉션

| 컬렉션 | 상태 | 대체 |
|--------|------|------|
| `memberRequests` | 사용 중단 | `memberRegistrationRequests` |

---

## 🚀 향후 개선 사항

### 1. 보호자-자녀 계정 연결
```typescript
// 목표: 보호자가 로그인하여 자녀 등록
// 구현 필요:
// - 보호자 계정 생성 플로우
// - 자녀 등록 시 guardianIds 자동 연결
// - 보호자 대시보드에서 자녀 관리
```

### 2. 알림 시스템
- 가입 신청 시 클럽에 알림
- 승인/거절 시 신청자에게 이메일/SMS 알림

### 3. 결제 연동
- 이용권 갱신 승인 시 결제 프로세스 추가
- `payments` 컬렉션과 연동

### 4. 자동 승인 옵션
- 특정 조건 충족 시 자동 승인
- 클럽 설정에서 활성화/비활성화

---

## 🔍 트러블슈팅

### Q: 회원 가입 신청이 보이지 않아요
**A**: 다음을 확인하세요:
1. `user.clubId`가 올바르게 설정되어 있는지
2. Firestore Rules에서 권한이 있는지
3. `memberRegistrationRequests` 컬렉션에 데이터가 있는지

### Q: 이용권 갱신 버튼이 보이지 않아요
**A**: 다음을 확인하세요:
1. 현재 활성 이용권이 만료되었는지 (`activePass` 확인)
2. `pass_templates` 컬렉션에 템플릿이 있는지
3. 회원 상세 페이지 접근 권한이 있는지

### Q: 승인 후 회원이 로그인할 수 없어요
**A**: 현재 회원 가입 승인은 `members` 컬렉션에만 추가됩니다. 
로그인을 위해서는 별도로 Firebase Auth 계정이 필요합니다.
향후 통합 예정입니다.

---

**참고 문서**:
- `docs/DATA_STRUCTURE.md` - 데이터 스키마
- `docs/DATA_FLOW.md` - 전체 데이터 흐름
- `firestore.rules` - 보안 규칙

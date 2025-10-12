# Firestore 데이터 초기화 가이드

> Firestore의 모든 데이터를 삭제하고 새로 시작하는 방법

---

## ⚠️ 주의사항

이 작업은 **되돌릴 수 없습니다!**

### 삭제되는 것
- ✅ Firestore의 모든 컬렉션 데이터
- ✅ 회원, 클럽, 이용권, 출석 등 모든 데이터

### 보존되는 것
- ✅ 최상위 관리자 (wo1109ok@me.com) Firestore 프로필
- ✅ Firebase Auth의 모든 사용자 계정
- ✅ Firebase Storage의 파일들

---

## 📋 사전 준비

### 1. Firebase Admin SDK 서비스 계정 키 다운로드

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택
3. **프로젝트 설정** → **서비스 계정** 탭
4. **새 비공개 키 생성** 클릭
5. 다운로드한 JSON 파일을 프로젝트 루트에 `serviceAccountKey.json`으로 저장

```bash
# 프로젝트 구조
studio/
├── serviceAccountKey.json  ← 여기에 저장
├── scripts/
│   └── reset-firestore.ts
└── ...
```

### 2. 필요한 패키지 설치

```bash
npm install firebase-admin
npm install -D tsx @types/node
```

---

## 🚀 실행 방법

### 1. 스크립트 실행

```bash
npx tsx scripts/reset-firestore.ts
```

### 2. 확인 프롬프트

```
⚠️  경고: 이 작업은 되돌릴 수 없습니다!
최상위 관리자(wo1109ok@me.com)를 제외한 모든 Firestore 데이터가 삭제됩니다.

계속하시겠습니까? (yes/no):
```

**`yes`** 입력 후 Enter

### 3. 삭제 진행

```
🔍 최상위 관리자 찾는 중... (wo1109ok@me.com)
✅ 최상위 관리자 발견: abc123xyz

🗑️  Firestore 데이터 삭제 시작...

📦 users 컬렉션 삭제 중...
  ⏭️  최상위 관리자 보존: abc123xyz
  🗑️  users: 45개 문서 삭제됨...
  ✅ users: 총 45개 문서 삭제 완료

📦 clubs 컬렉션 삭제 중...
  🗑️  clubs: 12개 문서 삭제됨...
  ✅ clubs: 총 12개 문서 삭제 완료

...
```

### 4. 완료

```
============================================================
📊 삭제 결과 요약
============================================================

✅ users                          : 45개 삭제
✅ clubs                          : 12개 삭제
✅ members                        : 234개 삭제
✅ member_passes                  : 156개 삭제
...

------------------------------------------------------------
총 삭제된 문서: 1,234개
성공한 컬렉션: 18개
비어있는 컬렉션: 4개
============================================================

✅ 최상위 관리자(wo1109ok@me.com)는 보존되었습니다.
✅ Firebase Auth 사용자는 유지됩니다.

🎉 Firestore 초기화 완료!
```

---

## 🔄 초기화 후 작업

### 1. 최상위 관리자로 로그인

```
이메일: wo1109ok@me.com
비밀번호: [기존 비밀번호]
```

### 2. 새로운 데이터 생성

#### 클럽 오너 등록
1. `/register/club-owner` 접속
2. 클럽 정보 입력
3. 최상위 관리자가 `/super-admin`에서 승인

#### 회원 등록
1. `/register/member` 접속
2. 회원 정보 입력
3. 클럽 오너가 `/club-dashboard/approvals`에서 승인

#### 이용권 템플릿 생성
1. `/club-dashboard/pass-templates` 접속
2. 이용권 템플릿 생성

---

## 🛠️ 문제 해결

### serviceAccountKey.json 파일이 없는 경우

```
Error: Cannot find module '../serviceAccountKey.json'
```

**해결**: Firebase Console에서 서비스 계정 키를 다운로드하고 프로젝트 루트에 저장

### 권한 오류

```
Error: Permission denied
```

**해결**: 서비스 계정에 Firestore 관리 권한이 있는지 확인

### 최상위 관리자를 찾을 수 없는 경우

```
⚠️  최상위 관리자를 찾을 수 없습니다. 모든 users 데이터가 삭제됩니다.
```

**해결**: 
1. Firebase Console에서 직접 확인
2. 또는 스크립트 실행 후 수동으로 최상위 관리자 생성

---

## 📝 스크립트 커스터마이징

### 특정 컬렉션만 삭제

```typescript
// scripts/reset-firestore.ts 수정
const COLLECTIONS_TO_DELETE = [
  'members',        // 회원만 삭제
  'member_passes',  // 이용권만 삭제
];
```

### 여러 사용자 보존

```typescript
const PRESERVE_EMAILS = [
  'wo1109ok@me.com',
  'admin@example.com',
];
```

---

## 🔒 보안 주의사항

### serviceAccountKey.json 관리

```bash
# .gitignore에 추가 (이미 추가되어 있어야 함)
serviceAccountKey.json
```

**절대 Git에 커밋하지 마세요!**

### 프로덕션 환경

프로덕션 환경에서는 **절대 실행하지 마세요!**

개발/테스트 환경에서만 사용하세요.

---

## 📊 삭제되는 컬렉션 목록

1. `users` - 사용자 프로필 (최상위 관리자 제외)
2. `clubs` - 클럽 정보
3. `members` - 회원 정보
4. `member_passes` - 이용권
5. `pass_templates` - 이용권 템플릿
6. `attendance` - 출석 기록
7. `classes` - 수업 정보
8. `payments` - 결제 내역
9. `announcements` - 공지사항
10. `level_tests` - 승급 심사
11. `competitions` - 대회
12. `competition_registrations` - 대회 신청
13. `events` - 이벤트
14. `event_registrations` - 이벤트 신청
15. `message_history` - 메시지 기록
16. `media` - 미디어 파일 메타데이터
17. `clubOwnerRequests` - 클럽 오너 신청
18. `federationAdminInvites` - 연맹 관리자 초대
19. `memberRequests` - 회원 가입 신청
20. `pass_renewal_requests` - 이용권 갱신 신청
21. `committees` - 위원회
22. `committee_members` - 위원회 멤버

---

## 🎯 사용 시나리오

### 시나리오 1: 완전 초기화
```bash
# 모든 데이터 삭제 후 새로 시작
npx tsx scripts/reset-firestore.ts
```

### 시나리오 2: 테스트 데이터 정리
```bash
# 테스트 후 데이터 정리
npx tsx scripts/reset-firestore.ts
```

### 시나리오 3: 데모 준비
```bash
# 데모를 위한 깨끗한 환경 구성
npx tsx scripts/reset-firestore.ts
# 이후 데모 데이터 수동 생성
```

---

## ⚡ 빠른 참조

```bash
# 1. 서비스 계정 키 다운로드 및 저장
# → serviceAccountKey.json

# 2. 스크립트 실행
npx tsx scripts/reset-firestore.ts

# 3. 확인
yes

# 4. 완료 후 최상위 관리자로 로그인
# → wo1109ok@me.com
```

---

**주의**: 이 작업은 되돌릴 수 없습니다. 신중하게 사용하세요!

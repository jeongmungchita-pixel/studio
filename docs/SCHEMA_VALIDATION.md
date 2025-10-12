# Firestore 스키마 검증 및 수정 가이드

> Firebase Console에서 수동으로 만든 데이터를 코드와 일관성 있게 맞추기

---

## 🎯 목적

Firebase Console(Studio)에서 프로토타입 작업 중 수동으로 만든 데이터가 코드의 타입 정의와 일치하지 않을 수 있습니다. 이 도구들은:

1. **검증**: 실제 데이터와 코드 타입의 불일치 찾기
2. **수정**: 자동으로 일관성 있게 수정
3. **리포트**: 수동 확인이 필요한 부분 알림

---

## 🚀 사용 방법

### 1단계: 스키마 검증

```bash
npm run validate:schema
```

**출력 예시:**
```
🔍 users 검증 중...
  ⚠️  3개 이슈 발견

🔍 members 검증 중...
  ⚠️  12개 이슈 발견

📊 검증 결과
총 이슈: 15개

🔧 수정 제안
================================================================================

📦 users (3개 이슈)
--------------------------------------------------------------------------------

  ⚠️  필수 필드 누락 (2건)
    - 문서: abc123
      필드: displayName
      제안: displayName 필드를 추가해야 합니다.

  ⚠️  id 필드가 문서 ID와 불일치 (1건)
    - 문서: xyz789
      필드: id
      현재값: "old-id"
      제안: id를 xyz789로 변경해야 합니다.
```

### 2단계: 자동 수정

```bash
npm run fix:schema
```

**확인 프롬프트:**
```
⚠️  경고: Firestore 데이터를 수정합니다!
자동으로 수정 가능한 이슈만 처리됩니다.
백업을 권장합니다.

계속하시겠습니까? (yes/no): yes
```

**수정 진행:**
```
📦 users 컬렉션 수정

🔧 users: id 필드 수정 중...
  ✅ 5개 수정됨...
  ✅ 총 5개 수정 완료

🔧 users: 필수 필드 추가 중...
  ✅ 3개 수정됨...
  ✅ 총 3개 수정 완료

📊 수정 완료
총 8개 이슈 수정됨

✅ 스키마 수정 완료!
```

---

## 🔍 검증 항목

### 1. 필수 필드 체크

**users 컬렉션:**
- `id`, `uid`, `email`, `displayName`, `role`, `status`

**clubs 컬렉션:**
- `id`, `name`, `contactName`, `contactEmail`, `contactPhoneNumber`, `location`

**members 컬렉션:**
- `id`, `name`, `clubId`, `status`

**member_passes 컬렉션:**
- `id`, `memberId`, `clubId`, `passTemplateId`, `status`

### 2. Enum 값 검증

**status 필드:**
- users: `pending`, `approved`, `rejected`
- members: `active`, `inactive`, `pending`
- member_passes: `active`, `expired`, `pending`

**gender 필드:**
- members: `male`, `female`

**role 필드:**
- users: `SUPER_ADMIN`, `FEDERATION_ADMIN`, `CLUB_OWNER`, `CLUB_MANAGER`, `MEMBER`, `PARENT`

### 3. ID 일관성 체크

모든 문서의 `id` 필드가 Firestore 문서 ID와 일치해야 합니다.

```typescript
// ✅ 올바른 예
doc.id === 'abc123'
doc.data().id === 'abc123'

// ❌ 잘못된 예
doc.id === 'abc123'
doc.data().id === 'old-id'  // 불일치!
```

### 4. 예상치 못한 필드

코드에 정의되지 않은 필드가 있으면 경고합니다.

---

## 🔧 자동 수정 가능한 이슈

### 1. ID 필드 불일치
```typescript
// 수정 전
{ id: 'old-id', name: 'Test' }

// 수정 후
{ id: 'abc123', name: 'Test' }  // 문서 ID와 일치
```

### 2. 필수 필드 누락 (기본값 추가)
```typescript
// 수정 전
{ name: 'Test User' }

// 수정 후
{
  id: 'abc123',           // 문서 ID
  name: 'Test User',
  status: 'pending',      // 기본값
  createdAt: '2025-...'   // 현재 시간
}
```

### 3. 잘못된 Enum 값
```typescript
// 수정 전
{ status: 'unknown' }

// 수정 후
{ status: 'pending' }  // 기본값으로 변경
```

---

## ⚠️ 수동 확인 필요한 이슈

### 1. 예상치 못한 필드

```
⚠️  발견된 예상치 못한 필드: oldField, deprecatedField
ℹ️  수동 확인 필요 - 자동 삭제하지 않음
```

**조치:**
1. Firebase Console에서 해당 필드 확인
2. 필요 없으면 수동 삭제
3. 필요하면 코드 타입 정의에 추가

### 2. 복잡한 데이터 타입

날짜, 배열, 중첩 객체 등은 수동 확인이 필요할 수 있습니다.

---

## 📊 일반적인 문제와 해결

### 문제 1: Firebase Console에서 만든 문서에 id 필드가 없음

**증상:**
```
⚠️  필수 필드 누락: id
```

**해결:**
```bash
npm run fix:schema
```

자동으로 문서 ID를 `id` 필드에 추가합니다.

### 문제 2: status 값이 일관성 없음

**증상:**
```
⚠️  잘못된 enum 값
현재값: "active"
허용된 값: pending, approved, rejected
```

**해결:**
```bash
npm run fix:schema
```

기본값(`pending`)으로 자동 변경됩니다.

### 문제 3: 이메일만 있고 displayName이 없음

**증상:**
```
⚠️  필수 필드 누락: displayName
```

**해결:**
```bash
npm run fix:schema
```

이메일의 @ 앞부분을 displayName으로 자동 설정합니다.

---

## 🎯 권장 워크플로우

### 새 프로젝트 시작 시

1. **검증 실행**
   ```bash
   npm run validate:schema
   ```

2. **이슈 확인**
   - 자동 수정 가능한 것들 확인
   - 수동 확인 필요한 것들 메모

3. **자동 수정**
   ```bash
   npm run fix:schema
   ```

4. **재검증**
   ```bash
   npm run validate:schema
   ```

5. **수동 수정**
   - Firebase Console에서 남은 이슈 수동 처리

### 정기적인 검증

```bash
# 매주 또는 배포 전
npm run validate:schema
```

---

## 🔒 안전 장치

### 1. 백업 권장

수정 전에 Firebase Console에서 데이터 내보내기:
```
Firestore Database → 데이터 내보내기
```

### 2. 확인 프롬프트

모든 수정 작업은 사용자 확인이 필요합니다:
```
계속하시겠습니까? (yes/no):
```

### 3. 배치 처리

500개씩 배치로 처리하여 안전성 확보

### 4. 로깅

모든 수정 작업이 콘솔에 로깅됩니다.

---

## 📝 커스터마이징

### 스키마 정의 수정

`scripts/validate-firestore-schema.ts`에서 스키마 정의를 수정할 수 있습니다:

```typescript
const EXPECTED_SCHEMAS = {
  users: {
    required: ['id', 'uid', 'email'],  // 필수 필드
    optional: ['phoneNumber'],          // 선택 필드
    enums: {
      status: ['pending', 'approved'],  // 허용된 값
    }
  },
  // 새 컬렉션 추가
  my_collection: {
    required: ['id', 'name'],
    optional: ['description'],
  }
};
```

### 자동 수정 로직 추가

`scripts/fix-firestore-schema.ts`에서 커스텀 수정 로직 추가:

```typescript
// 커스텀 수정 함수
async function fixCustomIssue(collectionName: string): Promise<number> {
  // 수정 로직
}

// main 함수에 추가
totalFixed += await fixCustomIssue('my_collection');
```

---

## 🎉 예상 결과

### Before (Firebase Console에서 수동 작업)
```json
{
  "name": "홍길동",
  "email": "hong@example.com",
  "status": "active"  // 잘못된 enum
  // id 필드 없음
  // displayName 없음
}
```

### After (자동 수정 후)
```json
{
  "id": "abc123",
  "name": "홍길동",
  "email": "hong@example.com",
  "displayName": "hong",
  "status": "pending",
  "role": "MEMBER",
  "createdAt": "2025-10-12T..."
}
```

---

## 💡 팁

1. **개발 환경에서 먼저 테스트**
   - 프로덕션 전에 개발 환경에서 검증

2. **정기적인 검증**
   - CI/CD 파이프라인에 추가 고려

3. **타입 정의 우선**
   - 코드의 타입 정의를 먼저 확정
   - 데이터는 타입에 맞춤

4. **문서화**
   - 스키마 변경 시 문서 업데이트

---

## 🆘 문제 해결

### 에러: serviceAccountKey.json not found

```bash
# Firebase Console에서 서비스 계정 키 다운로드
# 프로젝트 루트에 저장
```

### 에러: Permission denied

서비스 계정에 Firestore 읽기/쓰기 권한 확인

### 너무 많은 이슈

```bash
# 샘플만 확인
# scripts/validate-firestore-schema.ts 수정
.limit(10)  // 10개만 확인
```

---

**스키마 검증으로 데이터 일관성을 유지하세요!** ✨

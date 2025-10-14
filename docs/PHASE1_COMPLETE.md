# Phase 1: 데이터 구조 추가 완료

> 완료일: 2025-10-15

---

## ✅ 완료된 작업

### 1. 타입 정의 업데이트

#### PassTemplate
```typescript
export type PassTemplate = {
  // ... 기존 필드
  targetCategory?: 'adult' | 'child' | 'all'; // 새로 추가
}
```

#### GymClass
```typescript
export type GymClass = {
  // ... 기존 필드
  targetCategory?: 'adult' | 'child' | 'all'; // 새로 추가
  ageRange?: {
    min?: number;
    max?: number;
  };
}
```

### 2. 헬퍼 함수 생성

**`/src/lib/member-utils.ts`**

- `calculateAge()`: 생년월일로 나이 계산
- `canUsePassTemplate()`: 회원이 이용권 사용 가능 여부
- `canJoinClass()`: 회원이 수업 참여 가능 여부
- `getMemberCategoryLabel()`: 회원 분류 라벨
- `getMemberCategoryColor()`: 회원 분류 색상
- `getTargetCategoryLabel()`: 대상 분류 라벨

### 3. 마이그레이션 스크립트

**`/scripts/migrate-target-category.ts`**

- 기존 이용권 템플릿에 `targetCategory: 'all'` 추가
- 기존 수업에 `targetCategory: 'all'` 추가
- 기존 회원에 `memberCategory` 자동 설정 (나이 기반)

---

## 🎯 사용 방법

### 헬퍼 함수 사용 예시

```typescript
import { canUsePassTemplate, getMemberCategoryLabel } from '@/lib/member-utils';

// 회원이 이용권 사용 가능 여부 확인
const canUse = canUsePassTemplate(member, passTemplate);

// 회원 분류 라벨 가져오기
const label = getMemberCategoryLabel(member.memberCategory); // "성인" or "주니어"
```

### 마이그레이션 실행

```bash
# Firebase Admin SDK 설정 필요
npx ts-node scripts/migrate-target-category.ts
```

---

## 📋 필드 설명

### targetCategory

| 값 | 설명 | 사용 예시 |
|---|---|---|
| `'adult'` | 성인 전용 | 성인 요가 클래스, 성인 이용권 |
| `'child'` | 주니어 전용 | 키즈 체조 클래스, 주니어 이용권 |
| `'all'` | 전체 (기본값) | 가족 이용권, 통합 클래스 |

### memberCategory

| 값 | 기준 | 설명 |
|---|---|---|
| `'adult'` | 19세 이상 | 성인 회원 |
| `'child'` | 18세 이하 | 주니어 회원 |

---

## 🔄 다음 단계: Phase 2

이제 Phase 2로 진행합니다:
- 이용권 템플릿 생성 시 대상 선택 UI
- 이용권 갱신 시 필터링 로직
- 이용권 목록 UI 개선

---

## 📝 참고사항

### 기존 데이터 호환성

- `targetCategory`가 없는 기존 이용권/수업은 자동으로 `'all'`로 처리
- `memberCategory`가 없는 기존 회원은 나이로 자동 판단
- 하위 호환성 보장

### 색상 체계

- **성인**: 파란색 (`blue-100`, `blue-600`)
- **주니어**: 초록색 (`green-100`, `green-600`)
- **전체**: 회색 (`gray-100`, `gray-600`)

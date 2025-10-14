# Phase 3: 고급 기능 구현 완료

> 완료일: 2025-10-15

---

## ✅ 완료된 작업

### 1. 수업(GymClass) 대상 분류 및 연령 범위 설정

**파일:** `/src/app/club-dashboard/classes/page.tsx`

#### 구현 내용
- 수업 생성/수정 시 대상 분류 선택 (성인 전용/주니어 전용/전체)
- 연령 범위 설정 (최소/최대 나이)
- 수업 목록에 대상 분류 및 연령 범위 배지 표시

#### 주요 기능
```typescript
const classFormSchema = z.object({
  name: z.string().min(1, '클래스 이름을 입력해주세요.'),
  dayOfWeek: z.enum(['월', '화', '수', '목', '금', '토', '일']),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  capacity: z.number().int().positive(),
  targetCategory: z.enum(['adult', 'child', 'all']).optional(),
  ageMin: z.number().int().min(0).max(100).optional().nullable(),
  ageMax: z.number().int().min(0).max(100).optional().nullable(),
});
```

#### UI 개선
- **대상 분류 선택**: Select 컴포넌트로 성인/주니어/전체 선택
- **연령 범위 입력**: 최소/최대 나이 입력 필드 (선택사항)
- **목록 표시**: 각 수업의 대상 분류 배지 및 연령 범위 표시
- **아이콘**: User (성인), Baby (주니어), Users (전체)

---

### 2. 수업 등록 시 회원 자격 검증

**파일:** `/src/app/club-dashboard/classes/[id]/page.tsx`

#### 구현 내용
- 수업에 회원 추가 시 자격 요건 자동 검증
- `canJoinClass()` 헬퍼 함수 활용
- 자격 미달 회원은 선택 불가 처리

#### 주요 로직
```typescript
// Get available members with eligibility check
const availableMembers = useMemo(() => {
  if (!allMembers || !classData) return [];
  return allMembers
    .filter(member => !classData.memberIds.includes(member.id))
    .map(member => ({
      ...member,
      canJoin: canJoinClass(member, classData),
    }))
    .sort((a, b) => {
      // Sort eligible members first
      if (a.canJoin && !b.canJoin) return -1;
      if (!a.canJoin && b.canJoin) return 1;
      return 0;
    });
}, [allMembers, classData]);
```

#### UI 개선
- **자격 검증 표시**: 자격 미달 회원은 회색으로 표시 + 비활성화
- **경고 메시지**: 자격 미달 사유 표시 ("⚠️ 이 클래스의 자격 요건을 충족하지 않습니다")
- **Alert 컴포넌트**: 클래스 제한 사항 명확히 표시
- **정렬**: 자격 충족 회원을 목록 상단에 표시

---

### 3. 회원 분류별 통계 대시보드

**파일:** `/src/app/club-dashboard/page.tsx`

#### 구현 내용
- 클럽 대시보드 메인에 통계 카드 추가
- 전체/성인/주니어 회원 수 및 활동률 표시
- 실시간 통계 계산

#### 통계 계산 로직
```typescript
const memberStats = useMemo(() => {
  if (!members) return { total: 0, active: 0, adult: 0, child: 0, adultActive: 0, childActive: 0 };
  
  const stats = {
    total: members.length,
    active: 0,
    adult: 0,
    child: 0,
    adultActive: 0,
    childActive: 0,
  };
  
  members.forEach(member => {
    const memberCategory = member.memberCategory || 
      (calculateAge(member.dateOfBirth) >= 19 ? 'adult' : 'child');
    
    if (member.status === 'active') {
      stats.active++;
      if (memberCategory === 'adult') stats.adultActive++;
      else stats.childActive++;
    }
    
    if (memberCategory === 'adult') stats.adult++;
    else stats.child++;
  });
  
  return stats;
}, [members]);
```

#### 통계 카드
1. **전체 회원**: 총 회원 수 + 활동중 회원 수
2. **성인 회원**: 성인 회원 수 + 활동률 (%)
3. **주니어 회원**: 주니어 회원 수 + 활동률 (%)
4. **클래스**: 운영중인 클래스 수

---

## 🎨 UI/UX 개선 사항

### 수업 관리
- **대상 분류 배지**: 성인(파란색), 주니어(초록색), 전체(회색)
- **연령 범위 표시**: 배지 하단에 "7세 ~ 13세" 형식으로 표시
- **아이콘 통일**: User, Baby, Users 아이콘 일관성 있게 사용

### 회원 추가 다이얼로그
- **자격 검증 시각화**: 
  - 자격 충족: 일반 스타일 + 클릭 가능
  - 자격 미달: 회색 + 불투명도 50% + 클릭 불가
- **경고 Alert**: 클래스 제한 사항을 상단에 명확히 표시
- **정렬**: 자격 충족 회원을 먼저 표시

### 통계 대시보드
- **색상 체계**: 
  - 전체: 기본 색상
  - 성인: 파란색 (text-blue-600)
  - 주니어: 초록색 (text-green-600)
- **활동률 표시**: 백분율로 활동 회원 비율 표시
- **아이콘**: 각 카드에 의미있는 아이콘 배치

---

## 📊 적용된 페이지

### 1. 수업 관리 페이지
- **경로**: `/club-dashboard/classes`
- **개선**: 대상 분류 및 연령 범위 설정, 목록에 배지 표시

### 2. 수업 상세 페이지
- **경로**: `/club-dashboard/classes/[id]`
- **개선**: 회원 추가 시 자격 검증, 자격 미달 회원 표시

### 3. 클럽 대시보드
- **경로**: `/club-dashboard`
- **개선**: 회원 분류별 통계 카드 추가

---

## 🔧 사용된 헬퍼 함수

### `/src/lib/member-utils.ts`

```typescript
// 회원이 수업에 참여할 수 있는지 확인
canJoinClass(member: Member, gymClass: GymClass): boolean

// 나이 계산
calculateAge(dateOfBirth?: string): number

// 회원 분류 라벨
getMemberCategoryLabel(category?: 'adult' | 'child'): string

// 회원 분류 색상
getMemberCategoryColor(category?: 'adult' | 'child')

// 대상 분류 라벨
getTargetCategoryLabel(category?: 'adult' | 'child' | 'all'): string
```

---

## 🎯 주요 기능 요약

### 1. 수업 대상 설정
✅ **대상 분류**: 성인 전용/주니어 전용/전체  
✅ **연령 범위**: 최소/최대 나이 설정 (선택)  
✅ **시각적 표시**: 배지와 아이콘으로 명확히 표시  

### 2. 자격 검증
✅ **자동 검증**: 회원 추가 시 자격 자동 확인  
✅ **시각적 피드백**: 자격 미달 회원 회색 처리  
✅ **정렬**: 자격 충족 회원 우선 표시  

### 3. 통계 대시보드
✅ **실시간 통계**: 회원 분류별 실시간 집계  
✅ **활동률**: 각 분류별 활동 회원 비율 표시  
✅ **시각화**: 색상과 아이콘으로 직관적 표시  

---

## 📝 데이터 구조

### GymClass 타입 (업데이트)
```typescript
export type GymClass = {
  id: string;
  clubId: string;
  name: string;
  dayOfWeek: '월' | '화' | '수' | '목' | '금' | '토' | '일';
  time: string;
  capacity: number;
  targetCategory?: 'adult' | 'child' | 'all'; // 새로 추가
  ageRange?: {                                  // 새로 추가
    min?: number;
    max?: number;
  };
  memberIds: string[];
};
```

---

## 🔄 검증 로직

### canJoinClass 함수
```typescript
export function canJoinClass(member: Member, gymClass: GymClass): boolean {
  // 1. 회원 분류 체크
  if (gymClass.targetCategory && gymClass.targetCategory !== 'all') {
    const memberCategory = member.memberCategory || 
      (calculateAge(member.dateOfBirth) >= 19 ? 'adult' : 'child');
    
    if (gymClass.targetCategory !== memberCategory) {
      return false;
    }
  }
  
  // 2. 연령 범위 체크
  if (gymClass.ageRange) {
    const age = calculateAge(member.dateOfBirth);
    
    if (gymClass.ageRange.min && age < gymClass.ageRange.min) {
      return false;
    }
    
    if (gymClass.ageRange.max && age > gymClass.ageRange.max) {
      return false;
    }
  }
  
  return true;
}
```

---

## 💡 사용 시나리오

### 시나리오 1: 키즈 체조 클래스 생성
1. 클래스 관리 페이지에서 "새 클래스 생성" 클릭
2. 이름: "키즈 체조"
3. 대상: "주니어 전용" 선택
4. 연령 범위: 최소 7세, 최대 13세
5. 저장 → 주니어 회원만 등록 가능

### 시나리오 2: 회원 등록 시도
1. "키즈 체조" 클래스 상세 페이지 진입
2. "회원 추가" 클릭
3. 자격 충족 회원 (7-13세 주니어)는 정상 표시
4. 자격 미달 회원 (성인 또는 연령 범위 외)는 회색 + 경고 메시지
5. 자격 충족 회원만 선택 가능

### 시나리오 3: 통계 확인
1. 클럽 대시보드 접속
2. 상단 통계 카드에서 한눈에 확인:
   - 전체 회원: 50명 (활동중 45명)
   - 성인: 30명 (활동중 28명, 93%)
   - 주니어: 20명 (활동중 17명, 85%)
   - 클래스: 5개

---

## 🎨 색상 및 아이콘 체계

### 색상
- **성인**: `text-blue-600`, `bg-blue-100`
- **주니어**: `text-green-600`, `bg-green-100`
- **전체**: `text-gray-600`, `bg-gray-100`

### 아이콘 (lucide-react)
- **성인**: `User`
- **주니어**: `Baby`
- **전체**: `Users`
- **경고**: `AlertTriangle`

---

## ✨ 완료 요약

Phase 3에서는 회원 분류 시스템을 수업 관리와 통계에 통합했습니다:

1. ✅ **수업 대상 설정**: 대상 분류 및 연령 범위 설정 기능
2. ✅ **자격 검증**: 수업 등록 시 자동 자격 검증 및 시각적 피드백
3. ✅ **통계 대시보드**: 회원 분류별 실시간 통계 및 활동률 표시

모든 기능은 기존 시스템과 완벽히 통합되었으며, 하위 호환성이 보장됩니다.

---

## 🚀 다음 단계 (선택사항)

Phase 3가 완료되었습니다. 필요시 추가 기능을 구현할 수 있습니다:

### 추가 기능 옵션
- [ ] 분류별 일괄 메시지 발송
- [ ] 분류별 출석률 분석 차트
- [ ] 회원 분류 변경 기능 (관리자용)
- [ ] 분류별 이용권 사용 통계
- [ ] 연령대별 수업 추천 시스템

---

**완료일**: 2025-10-15  
**Phase 1-3 전체 완료**: 데이터 구조 → UI 개선 → 고급 기능  
**다음 단계**: 운영 모니터링 또는 추가 기능 구현

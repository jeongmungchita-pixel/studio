# 🎯 초보자를 위한 통합 가이드

## ✅ 완료된 작업

### 1단계: 타입 시스템 통합 ✨ 완료!

windsurf의 우수한 역할 시스템이 studio에 통합되었습니다!

**추가된 기능:**
- ✅ 13개 계층적 역할 시스템 (SUPER_ADMIN ~ VENDOR)
- ✅ 권한 레벨 시스템 (10 ~ 100)
- ✅ 권한 체크 헬퍼 함수 3개
- ✅ 위원회 관리 타입
- ✅ 벤더 및 공동구매 타입
- ✅ 레거시 호환성 유지

**파일 위치:**
- `/src/types/index.ts` - 모든 타입이 여기에 있습니다!

---

## 🚀 다음 단계 (순서대로 진행)

### 2단계: 역할 시스템 사용하기

이제 코드에서 새로운 역할을 사용할 수 있습니다!

#### 예제 1: 권한 체크하기
```typescript
import { UserRole, hasEqualOrHigherRole } from '@/types';

// 사용자가 관리자 권한이 있는지 확인
if (hasEqualOrHigherRole(user.role, UserRole.FEDERATION_ADMIN)) {
  // 관리자만 볼 수 있는 UI 표시
  console.log('관리자입니다!');
}
```

#### 예제 2: 역할별 UI 표시
```typescript
import { UserRole, roleHierarchy } from '@/types';

function DashboardMenu({ userRole }: { userRole: UserRole }) {
  return (
    <div>
      {/* 모든 사용자에게 표시 */}
      <MenuItem>내 프로필</MenuItem>
      
      {/* 클럽 매니저 이상만 표시 */}
      {roleHierarchy[userRole] >= roleHierarchy[UserRole.CLUB_MANAGER] && (
        <MenuItem>클럽 관리</MenuItem>
      )}
      
      {/* 연맹 관리자만 표시 */}
      {roleHierarchy[userRole] >= roleHierarchy[UserRole.FEDERATION_ADMIN] && (
        <MenuItem>전체 관리</MenuItem>
      )}
    </div>
  );
}
```

#### 예제 3: 레거시 코드 호환
```typescript
import { convertLegacyRole, LegacyUserRole } from '@/types';

// 기존 코드가 'admin', 'member' 같은 역할을 사용하는 경우
const oldRole: LegacyUserRole = 'admin';
const newRole = convertLegacyRole(oldRole); // UserRole.FEDERATION_ADMIN
```

---

### 3단계: Firestore 보안 규칙 업그레이드

windsurf의 상세한 보안 규칙을 적용합니다.

**작업 내용:**
1. `/firestore.rules` 파일 업데이트
2. 역할 기반 접근 제어 강화
3. Firebase Console에 배포

**명령어:**
```bash
cd /Users/daewookjeong/federation/studio
firebase deploy --only firestore:rules
```

---

### 4단계: 위원회 관리 기능 추가

새로운 위원회 시스템을 UI에 추가합니다.

**추가할 페이지:**
- `/src/app/committees/page.tsx` - 위원회 목록
- `/src/app/committees/[id]/page.tsx` - 위원회 상세
- `/src/components/committees/` - 위원회 컴포넌트

**위원회 종류:**
- 대회 위원회 (COMPETITION)
- 교육 위원회 (EDUCATION)
- 마케팅 위원회 (MARKETING)

---

### 5단계: 벤더 및 공동구매 기능 추가

협력업체와 공동구매 시스템을 추가합니다.

**추가할 페이지:**
- `/src/app/vendors/page.tsx` - 벤더 목록
- `/src/app/group-orders/page.tsx` - 공동구매 목록
- `/src/components/vendors/` - 벤더 컴포넌트

---

## 📚 13개 역할 설명

| 역할 | 레벨 | 설명 | 사용 예시 |
|------|------|------|-----------|
| **SUPER_ADMIN** | 100 | 시스템 최고 관리자 | 전체 시스템 설정 |
| **FEDERATION_ADMIN** | 90 | 연맹 관리자 | 클럽/위원회 관리 |
| **FEDERATION_SECRETARIAT** | 80 | 연맹 사무국 | 연맹 업무 처리 |
| **COMMITTEE_CHAIR** | 70 | 위원회 위원장 | 위원회 운영 |
| **COMMITTEE_MEMBER** | 60 | 위원회 위원 | 위원회 활동 |
| **CLUB_OWNER** | 50 | 클럽 소유자 | 클럽 전체 관리 |
| **CLUB_MANAGER** | 45 | 클럽 관리자 | 클럽 운영 |
| **CLUB_STAFF** | 40 | 클럽 직원 | 업무 지원 |
| **MEDIA_MANAGER** | 40 | 미디어 관리자 | 콘텐츠 관리 |
| **HEAD_COACH** | 35 | 수석 코치 | 코치진 관리 |
| **ASSISTANT_COACH** | 30 | 보조 코치 | 회원 지도 |
| **MEMBER** | 20 | 회원 (선수) | 본인 정보 관리 |
| **PARENT** | 15 | 학부모 | 자녀 정보 조회 |
| **VENDOR** | 10 | 협력업체 | 제품 정보 관리 |

---

## 🎓 초보자 팁

### 1. 타입 자동완성 사용하기
VSCode에서 타입을 입력하면 자동완성이 나타납니다:
```typescript
import { UserRole } from '@/types';

const role = UserRole. // <- 여기서 점을 찍으면 13개 역할이 나타남!
```

### 2. 권한 체크 함수 3가지
```typescript
// 1. 더 높은 권한인가?
hasHigherRole(UserRole.FEDERATION_ADMIN, UserRole.CLUB_MANAGER) // true

// 2. 같거나 높은 권한인가?
hasEqualOrHigherRole(UserRole.CLUB_MANAGER, UserRole.CLUB_MANAGER) // true

// 3. 사용자를 관리할 수 있는가?
canManageUser(UserRole.CLUB_OWNER, UserRole.MEMBER) // true
```

### 3. 실제 사용 예시
```typescript
// 컴포넌트에서 사용
'use client';
import { useAuth } from '@/firebase';
import { UserRole, hasEqualOrHigherRole } from '@/types';

export function AdminPanel() {
  const { user } = useAuth();
  
  // 관리자가 아니면 표시 안 함
  if (!user || !hasEqualOrHigherRole(user.role, UserRole.FEDERATION_ADMIN)) {
    return null;
  }
  
  return <div>관리자 패널</div>;
}
```

---

## 🔧 문제 해결

### Q: 타입 오류가 나요!
**A:** TypeScript가 새로운 타입을 인식하도록 서버를 재시작하세요:
```bash
# 개발 서버 중지 (Ctrl + C)
# 다시 시작
npm run dev
```

### Q: 기존 코드가 깨졌어요!
**A:** `convertLegacyRole` 함수를 사용하세요:
```typescript
import { convertLegacyRole } from '@/types';

// 기존: role: 'admin'
// 새로운: role: convertLegacyRole('admin')
```

### Q: 어떤 역할을 사용해야 하나요?
**A:** 위의 13개 역할 표를 참고하세요. 대부분의 경우:
- 관리자 → `FEDERATION_ADMIN` 또는 `CLUB_MANAGER`
- 일반 회원 → `MEMBER`
- 학부모 → `PARENT`

---

## 📝 체크리스트

통합 진행 상황을 체크하세요:

- [x] 1단계: 타입 시스템 통합 ✅
- [ ] 2단계: 역할 시스템 사용 시작
- [ ] 3단계: 보안 규칙 업그레이드
- [ ] 4단계: 위원회 기능 추가
- [ ] 5단계: 벤더/공동구매 기능 추가

---

## 🎉 축하합니다!

1단계 완료! 이제 studio 앱에 windsurf의 강력한 역할 시스템이 통합되었습니다.

**다음 할 일:**
1. 개발 서버를 재시작하세요: `npm run dev`
2. 코드에서 새로운 `UserRole`을 사용해보세요
3. 권한 체크 함수를 테스트해보세요

**도움이 필요하면:**
- 이 가이드를 다시 읽어보세요
- 예제 코드를 복사해서 사용하세요
- 천천히 한 단계씩 진행하세요!

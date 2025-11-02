# 테스트 커버리지 90% 달성 로드맵
> Federation 프로젝트 테스트 커버리지 개선 및 리팩토링 종합 계획

## 📊 현재 상태 분석

### 메트릭스
| 항목 | 현재 | 목표 | 갭 |
|------|------|------|-----|
| Statements | 9.89% | 90% | 80.11% |
| Branches | 7.82% | 85% | 77.18% |
| Functions | 9.98% | 90% | 80.02% |
| Lines | 9.97% | 90% | 80.03% |
| 총 코드 라인 | 11,610 | - | 9,300 라인 테스트 필요 |

### 프로젝트 구조 분석
```
총 파일: 약 400개
- 컴포넌트: 150개 (37.5%)
- 서비스/유틸: 80개 (20%)
- API Routes: 40개 (10%)
- Hooks: 30개 (7.5%)
- 타입 정의: 50개 (12.5%)
- 기타: 50개 (12.5%)
```

## 🎯 전체 목표 및 원칙

### 목표
1. **8주 내 90% 커버리지 달성**
2. **코드 품질 개선 및 기술 부채 청산**
3. **지속 가능한 테스트 문화 구축**
4. **CI/CD 파이프라인 강화**

### 원칙
- **점진적 개선**: 작은 단위로 지속적 개선
- **우선순위 기반**: 비즈니스 임팩트가 큰 부분부터
- **실용적 접근**: 100% 보다는 의미있는 90%
- **자동화 우선**: 수동 테스트 최소화

## 📅 Phase 1: 기반 구축 (Week 1-2)
> 목표 커버리지: 10% → 40%

### Week 1: 핵심 서비스 레이어
#### 작업 내용
```typescript
// 1. Authentication & User Services (100% 목표)
- src/services/auth-service.ts
  - 로그인/로그아웃 플로우
  - 토큰 관리
  - 역할 기반 접근 제어
  - 프로필 캐싱
  
- src/services/user-service.ts
  - 사용자 CRUD
  - 프로필 관리
  - 권한 검증
  - 상태 전환

// 2. API Client & Error Handling (100% 목표)
- src/services/api-client.ts
  - HTTP 메서드 테스트
  - 에러 변환
  - 재시도 로직
  - 헤더 관리
  
- src/utils/error/error-handler.ts
  - 에러 매핑
  - 재시도 정책
  - 타임아웃 처리
  - 로깅
```

#### 예상 산출물
- 테스트 파일: 20개
- 테스트 케이스: 200개
- 커버리지 증가: +15%

### Week 2: 유틸리티 및 헬퍼
#### 작업 내용
```typescript
// 1. Form & Validation (100% 목표)
- src/utils/form-helpers.ts
- src/lib/validation/server-validator.ts
- src/utils/type-guards.ts

// 2. Navigation & Routing (100% 목표)  
- src/services/navigation-manager.ts
- src/utils/route-guard.ts
- src/constants/routes.ts

// 3. Security & Audit (80% 목표)
- src/lib/security/security-audit.ts
- src/services/audit-service.ts
```

#### 예상 산출물
- 테스트 파일: 15개
- 테스트 케이스: 150개
- 커버리지 증가: +15%

### 리팩토링 작업
1. **의존성 주입 패턴 도입**
```typescript
// services/container.ts
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services = new Map<string, any>();
  
  register<T>(name: string, factory: () => T): void {
    this.services.set(name, factory());
  }
  
  resolve<T>(name: string): T {
    return this.services.get(name);
  }
}
```

2. **Repository 패턴 구현**
```typescript
// repositories/base.repository.ts
export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
```

## 📅 Phase 2: 도메인 로직 (Week 3-4)
> 목표 커버리지: 40% → 60%

### Week 3: 도메인 서비스
#### 작업 내용
```typescript
// 1. Member Domain (90% 목표)
- src/domains/member/services/member.service.ts
- src/domains/member/utils/*.ts
- src/domains/member/validators/*.ts

// 2. Club Domain (90% 목표)
- src/domains/club/services/club.service.ts
- src/domains/club/utils/*.ts
- src/domains/club/validators/*.ts

// 3. Event Domain (85% 목표)
- src/domains/event/services/event.service.ts
- src/domains/event/utils/*.ts
```

#### 통합 테스트
```typescript
// API Routes 통합 테스트
- src/app/api/admin/**/__tests__
- src/app/api/user/**/__tests__
- src/app/api/club/**/__tests__
```

### Week 4: 비즈니스 로직
#### 작업 내용
```typescript
// 1. 승인 플로우
- 성인 회원 승인 프로세스
- 가족 회원 승인 프로세스
- 클럽 가입 승인

// 2. 이용권 시스템
- 이용권 신청
- 이용권 승인/거부
- 이용권 사용 추적

// 3. 재무 관리
- 결제 처리
- 환불 처리
- 보고서 생성
```

### 리팩토링 작업
1. **비즈니스 로직 추출**
```typescript
// Before
function ApprovalPage() {
  const handleApprove = async () => {
    // 30줄의 복잡한 로직
    const user = await getUser();
    const member = await createMember();
    await updateStatus();
    await sendNotification();
  };
}

// After
function ApprovalPage() {
  const { approve } = useApprovalService();
  const handleApprove = () => approve(requestId);
}
```

2. **상태 머신 패턴 도입**
```typescript
// state-machines/approval.machine.ts
export const approvalMachine = createMachine({
  initial: 'pending',
  states: {
    pending: { on: { APPROVE: 'approved', REJECT: 'rejected' }},
    approved: { type: 'final' },
    rejected: { type: 'final' }
  }
});
```

## 📅 Phase 3: Hooks & 상태 관리 (Week 5)
> 목표 커버리지: 60% → 75%

### 작업 내용
```typescript
// 1. Custom Hooks (95% 목표)
- hooks/use-user.tsx
- hooks/use-role.tsx
- hooks/use-onboarding.tsx
- hooks/use-draft.ts
- hooks/use-realtime-permissions.tsx
- hooks/use-session-manager.tsx

// 2. Store Management (90% 목표)
- store/user-store.ts
- store/club-store.ts
- store/app-store.ts
- stores/ui-store.ts

// 3. Context Providers (85% 목표)
- providers/auth-provider.tsx
- providers/firebase-provider.tsx
- providers/theme-provider.tsx
```

### 테스트 전략
```typescript
// Hook 테스트 패턴
import { renderHook, waitFor } from '@testing-library/react';

describe('useUser', () => {
  it('should handle user state transitions', async () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper()
    });
    
    await waitFor(() => {
      expect(result.current.user).toBeDefined();
    });
  });
});
```

## 📅 Phase 4: UI 컴포넌트 (Week 6-7)
> 목표 커버리지: 75% → 85%

### Week 6: 공통 컴포넌트
#### 작업 내용
```typescript
// 1. Layout Components (90% 목표)
- components/layout/header.tsx
- components/layout/sidebar.tsx
- components/layout/footer.tsx

// 2. Common Components (85% 목표)
- components/common/data-table.tsx
- components/common/empty-state.tsx
- components/common/loading-states.tsx
- components/common/page-header.tsx

// 3. Form Components (90% 목표)
- components/forms/member-form.tsx
- components/forms/club-form.tsx
- components/forms/event-form.tsx
```

### Week 7: 페이지 컴포넌트
#### 작업 내용
```typescript
// 1. 핵심 페이지 (80% 목표)
- app/(auth)/register/adult/page.tsx
- app/(auth)/register/family/page.tsx
- app/club-dashboard/member-approvals/page.tsx
- app/my-profile/page.tsx
- app/admin/page.tsx

// 2. 서브 페이지 (70% 목표)
- app/club-dashboard/classes/page.tsx
- app/club-dashboard/passes/page.tsx
- app/my-profile/family/page.tsx
```

### 컴포넌트 테스트 전략
```typescript
// 컴포넌트 테스트 패턴
import { render, screen, fireEvent } from '@testing-library/react';

describe('MemberApprovalPage', () => {
  it('should approve member request', async () => {
    render(<MemberApprovalPage />, { wrapper: TestProviders });
    
    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/approved successfully/i)).toBeInTheDocument();
    });
  });
});
```

## 📅 Phase 5: 통합 및 E2E 테스트 (Week 8)
> 목표 커버리지: 85% → 90%+

### 작업 내용
#### E2E 테스트 시나리오
```typescript
// 1. 회원가입 플로우
test('Adult registration flow', async ({ page }) => {
  await page.goto('/register/adult');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/register/adult/step-1');
  // ... 전체 플로우
});

// 2. 승인 플로우
test('Member approval by club admin', async ({ page }) => {
  await loginAsClubAdmin(page);
  await page.goto('/club-dashboard/member-approvals');
  await page.click('[data-testid="approve-btn-1"]');
  
  await expect(page.locator('.toast')).toContainText('승인 완료');
});

// 3. 이용권 신청 플로우
test('Pass request and approval', async ({ page }) => {
  await loginAsMember(page);
  await page.goto('/my-profile');
  await page.click('[data-testid="request-pass"]');
  // ... 전체 플로우
});
```

#### 성능 테스트
```typescript
// 1. 대량 데이터 처리
test('Should handle 1000+ members efficiently', async () => {
  const members = generateMembers(1000);
  const startTime = Date.now();
  
  await memberService.bulkCreate(members);
  
  expect(Date.now() - startTime).toBeLessThan(5000);
});

// 2. 동시성 테스트
test('Should handle concurrent approval requests', async () => {
  const requests = Array.from({ length: 10 }, (_, i) => 
    approvalService.approve(`request-${i}`)
  );
  
  const results = await Promise.allSettled(requests);
  expect(results.every(r => r.status === 'fulfilled')).toBe(true);
});
```

## 🔧 리팩토링 상세 계획

### 1. 아키텍처 개선
```typescript
// src/architecture/
├── core/
│   ├── domain/           # 도메인 모델
│   ├── application/       # 유스케이스
│   ├── infrastructure/    # 외부 연동
│   └── presentation/      # UI 레이어
├── shared/
│   ├── interfaces/        # 공통 인터페이스
│   ├── exceptions/        # 예외 처리
│   └── utils/            # 유틸리티
└── config/
    ├── di.config.ts      # 의존성 주입 설정
    └── test.config.ts    # 테스트 설정
```

### 2. 패턴 적용
#### Factory 패턴
```typescript
// factories/user.factory.ts
export class UserFactory {
  static createMember(data: MemberData): Member {
    return new Member(data);
  }
  
  static createAdmin(data: AdminData): Admin {
    return new Admin(data);
  }
}
```

#### Observer 패턴
```typescript
// observers/event.observer.ts
export class EventObserver {
  private subscribers: Map<string, Function[]> = new Map();
  
  subscribe(event: string, callback: Function) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(callback);
  }
  
  emit(event: string, data: any) {
    this.subscribers.get(event)?.forEach(cb => cb(data));
  }
}
```

### 3. 테스트 유틸리티
```typescript
// test-utils/builders/
export class UserBuilder {
  private user: Partial<User> = {};
  
  withRole(role: UserRole) {
    this.user.role = role;
    return this;
  }
  
  withStatus(status: UserStatus) {
    this.user.status = status;
    return this;
  }
  
  build(): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      ...this.user
    } as User;
  }
}
```

## 📊 예상 메트릭스

### 주차별 진행도
| 주차 | 커버리지 | 테스트 파일 | 테스트 케이스 | 리팩토링 |
|------|----------|------------|--------------|---------|
| Week 1 | 25% | 20 | 200 | DI 패턴 |
| Week 2 | 40% | 35 | 350 | Repository |
| Week 3 | 50% | 50 | 500 | 도메인 분리 |
| Week 4 | 60% | 65 | 650 | 상태 머신 |
| Week 5 | 75% | 80 | 800 | Hook 최적화 |
| Week 6 | 80% | 100 | 1000 | 컴포넌트 분리 |
| Week 7 | 85% | 120 | 1200 | 페이지 최적화 |
| Week 8 | 90%+ | 140 | 1400 | E2E 완성 |

### 품질 지표
| 지표 | 현재 | 목표 | 개선율 |
|------|------|------|--------|
| 버그 밀도 | 15/KLOC | 3/KLOC | 80% ⬇️ |
| 코드 복잡도 | 25 | 10 | 60% ⬇️ |
| 기술 부채 | 65% | 20% | 69% ⬇️ |
| 빌드 시간 | 180s | 90s | 50% ⬇️ |
| 배포 실패율 | 10% | 2% | 80% ⬇️ |

## 💰 투자 및 ROI

### 투자
- **인력**: 시니어 개발자 1명 × 8주
- **시간**: 320시간 (주 40시간)
- **비용**: 약 $40,000 (시간당 $125 기준)

### 수익 (연간)
- **버그 수정 시간 절감**: 500시간 × $125 = $62,500
- **신규 기능 개발 가속**: 300시간 × $125 = $37,500
- **프로덕션 장애 감소**: 100시간 × $250 = $25,000
- **총 수익**: $125,000

### ROI
- **투자 회수 기간**: 3.8개월
- **연간 ROI**: 212%

## 🚦 위험 요소 및 대응

### 위험 요소
1. **시간 부족**: 예상보다 긴 개발 시간
2. **기술적 난이도**: Firebase/Next.js 테스트 복잡도
3. **팀 저항**: 새로운 패턴에 대한 학습 곡선
4. **레거시 코드**: 리팩토링 어려운 부분

### 대응 전략
1. **단계적 접근**: 우선순위 기반 진행
2. **도구 활용**: 테스트 생성 AI 도구 사용
3. **교육 제공**: 팀 워크샵 및 페어 프로그래밍
4. **점진적 마이그레이션**: 새 코드부터 적용

## ✅ 체크리스트

### 매주 검토 사항
- [ ] 목표 커버리지 달성 여부
- [ ] 테스트 실행 시간 (5분 이내)
- [ ] CI/CD 파이프라인 정상 동작
- [ ] 코드 리뷰 완료
- [ ] 문서 업데이트

### 마일스톤
- [ ] Week 2: 40% 커버리지 달성
- [ ] Week 4: 60% 커버리지 달성
- [ ] Week 6: 80% 커버리지 달성
- [ ] Week 8: 90% 커버리지 달성

## 📚 참고 자료

### 도구
- [Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [MSW](https://mswjs.io/)
- [Playwright](https://playwright.dev/)

### 베스트 프랙티스
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [React Testing Patterns](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Next.js Testing](https://nextjs.org/docs/testing)

## 🎯 최종 목표

8주 후 달성할 상태:
1. **90% 이상 테스트 커버리지**
2. **완전한 CI/CD 파이프라인**
3. **리팩토링된 깨끗한 아키텍처**
4. **문서화된 테스트 전략**
5. **지속 가능한 품질 문화**

---

*이 문서는 살아있는 문서로, 진행 상황에 따라 지속적으로 업데이트됩니다.*

*마지막 업데이트: 2025-11-01*

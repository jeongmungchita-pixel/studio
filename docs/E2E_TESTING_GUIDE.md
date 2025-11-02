# E2E 테스트 가이드

## 🎯 개요

Federation 프로젝트의 E2E(End-to-End) 테스트 환경 설정 및 실행 가이드입니다.

## 📦 설치된 도구

- **Playwright**: E2E 테스트 프레임워크
- **Chromium**: 테스트용 브라우저
- **TypeScript**: 타입 안전한 테스트 코드

## 🗂️ 파일 구조

```
├── playwright.config.ts      # Playwright 설정 파일
├── tests/e2e/
│   ├── basic-auth.spec.ts     # 기본 인증 테스트
│   └── firebase-auth.spec.ts  # Firebase 인증 테스트
└── test-results/              # 테스트 결과 저장소
```

## 🚀 실행 방법

### 1. 개발 서버 시작
```bash
npm run dev
```

### 2. E2E 테스트 실행

#### 전체 테스트 실행
```bash
npm run test:e2e
```

#### UI 모드로 실행 (브라우저 보면서 테스트)
```bash
npm run test:e2e:ui
```

#### 디버그 모드 실행 (단계별 실행)
```bash
npm run test:e2e:debug
```

#### 특정 테스트만 실행
```bash
npx playwright test tests/e2e/basic-auth.spec.ts
```

#### 특정 브라우저로 실행
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## 📊 현재 테스트 커버리지

| 테스트 그룹 | 테스트 수 | 상태 | 설명 |
|------------|----------|------|------|
| **기본 인증** | 7개 | ✅ 성공 | 페이지 로딩, 로그인, 리다이렉트 등 |
| **Firebase 인증** | 0개 | ⏳ 준비중 | 실제 인증 흐름 테스트 |
| **전체** | 7/9개 | ✅ 78% | 기본 기능 검증 완료 |

### ✅ 성공한 테스트
- 홈페이지 로드 확인
- 로그인 페이지 접근
- 대시보드 리다이렉트 테스트
- 네비게이션 메뉴 확인
- 반응형 레이아웃 확인
- 404 페이지 확인
- API 엔드포인트 상태 확인

### ⚠️ 개선 필요한 테스트
- 회원가입 페이지 접근 (단계별 폼 구조 고려 필요)
- 관리자 페이지 접근 제어 (비동기 리다이렉트 대기 필요)

## 🛠️ 테스트 작성 가이드

### 기본 테스트 구조
```typescript
import { test, expect } from '@playwright/test';

test.describe('테스트 그룹', () => {
  test('테스트 이름', async ({ page }) => {
    // 1. 페이지 이동
    await page.goto('/target-page');
    
    // 2. 페이지 로드 대기
    await page.waitForLoadState('domcontentloaded');
    
    // 3. 요소 확인 및 상호작용
    await expect(page.locator('selector')).toBeVisible();
    await page.fill('input[name="field"]', 'value');
    
    // 4. 결과 검증
    await expect(page).toHaveURL(/expected-pattern/);
  });
});
```

### 팁 & 모범 사례

1. **선택자 최적화**
   ```typescript
   // 좋은 예
   page.locator('button').filter({ hasText: '로그인' }).first()
   
   // 나쁜 예
   page.locator('button[type="submit"]') // 여러 개일 수 있음
   ```

2. **대기 전략**
   ```typescript
   // 페이지 로드 대기
   await page.waitForLoadState('domcontentloaded');
   
   // 특정 요소 대기
   await page.waitForSelector('loading-indicator', { state: 'hidden' });
   ```

3. **React 앱 특화**
   ```typescript
   // React Hook Form 대응
   await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 });
   ```

## 🔧 설정 옵션

### playwright.config.ts 주요 설정
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## 📋 추가 테스트 아이디어

### 우선순위 높은 테스트
- [ ] 실제 로그인/로그아웃 시나리오
- [ ] 회원가입 전체 흐름 (단계별)
- [ ] 권한별 페이지 접근 제어
- [ ] 폼 유효성 검사

### 확장 테스트
- [ ] 클럽 관리 기능
- [ ] 멤버 승인 프로세스
- [ ] 파일 업로드/다운로드
- [ ] 실시간 데이터 동기화
- [ ] 크로스 브라우저 호환성

## 🚨 문제 해결

### 일반적인 이슈
1. **타임아웃 에러**: `timeout` 값 증가 또는 `waitForTimeout` 추가
2. **요소 찾기 실패**: 선택자 확인 및 `waitForSelector` 사용
3. **리다이렉트 대기**: `waitForURL` 또는 `waitForLoadState` 사용

### 디버깅 팁
```bash
# 헤드드 모드로 실행 (브라우저 보면서)
npx playwright test --headed

# 단계별 실행
npx playwright test --debug

# 스크린샷 및 비디오 확인
open test-results/index.html
```

## 📈 CI/CD 연동

### GitHub Actions 예시
```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## 🎯 다음 단계

1. **단기 목표**
   - 실패한 2개 테스트 수정
   - 실제 인증 흐름 테스트 추가
   - 크로스 브라우저 테스트 확장

2. **중기 목표**
   - 전체 사용자 시나리오 커버리지
   - 성능 테스트 추가
   - 접근성 테스트 통합

3. **장기 목표**
   - CI/CD 파이프라인 자동화
   - 시각적 회귀 테스트
   - 모바일 앱 E2E 테스트

---

## 📞 지원

E2E 테스트 관련 문제가 있을 경우:
1. `test-results/` 폴더의 스크린샷 및 비디오 확인
2. Playwright 공식 문서 참조: https://playwright.dev/
3. 테스트 결과 HTML 리포트 확인: `open test-results/index.html`

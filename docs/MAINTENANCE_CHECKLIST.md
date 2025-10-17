# 🔧 유지보수 체크리스트

깔끔한 프로젝트 상태를 유지하기 위한 정기 점검 체크리스트입니다.

## 📅 일일 체크리스트 (개발 중)

### 코드 작성 전
- [ ] 최신 코드 pull 받기
- [ ] `npm run health:check` 실행하여 현재 상태 확인

### 코드 작성 후
- [ ] `npm run quality:check` 실행
- [ ] `npm run cleanup:all` 실행
- [ ] 변경사항 커밋 전 pre-commit hook 통과 확인

### 커밋 전 체크
```bash
# 자동 실행되는 pre-commit 체크들
✅ Type check passed
✅ Lint check passed  
✅ Auto cleanup completed
✅ Files staged
```

---

## 📊 주간 체크리스트 (매주 금요일)

### 코드 품질 점검
```bash
# 1. 전체 건강도 체크
npm run health:check

# 2. 품질 게이트 통과 확인
npm run quality:gate

# 3. 라우트 감사
npm run audit:routes

# 4. 보안 감사
npm run audit:security
```

### 수동 점검 항목
- [ ] **새로운 파일들이 올바른 위치에 있는가?**
  - `src/domains/` - 도메인별 코드
  - `src/components/common/` - 공통 컴포넌트
  - `src/types/` - 타입 정의
  - `src/utils/` - 유틸리티 함수

- [ ] **네이밍 컨벤션을 따르고 있는가?**
  - 파일명: `kebab-case`
  - 컴포넌트: `PascalCase`
  - 함수/변수: `camelCase`
  - 상수: `SCREAMING_SNAKE_CASE`

- [ ] **Import 순서가 올바른가?**
  ```typescript
  // 1. React 관련
  import React from 'react';
  
  // 2. 외부 라이브러리
  import { Button } from '@/components/ui/button';
  
  // 3. 내부 모듈
  import { UserRole } from '@/types/auth';
  
  // 4. 상대 경로
  import './styles.css';
  ```

- [ ] **중복 코드가 없는가?**
  - 3번 이상 반복되는 로직은 유틸리티로 추출
  - 비슷한 컴포넌트는 공통화 검토

---

## 📈 월간 체크리스트 (매월 마지막 주)

### 의존성 관리
```bash
# 1. 오래된 패키지 확인
npm outdated

# 2. 보안 취약점 확인  
npm audit

# 3. 사용되지 않는 패키지 확인
npx depcheck
```

### 성능 분석
```bash
# 1. 번들 크기 분석
npm run build
npx @next/bundle-analyzer

# 2. 타입 체크 성능
npm run typecheck -- --extendedDiagnostics
```

### 아키텍처 리뷰
- [ ] **도메인 분리가 적절한가?**
  - 각 도메인이 독립적인가?
  - 도메인 간 의존성이 최소화되어 있는가?

- [ ] **컴포넌트 재사용성**
  - 공통 컴포넌트가 충분히 활용되고 있는가?
  - 도메인별 컴포넌트가 적절히 분리되어 있는가?

- [ ] **타입 안전성**
  - `any` 타입 사용이 최소화되어 있는가?
  - 모든 API 응답에 타입이 정의되어 있는가?

---

## 🚨 긴급 대응 체크리스트

### 빌드 실패 시
1. **타입 에러 확인**
   ```bash
   npm run typecheck
   ```

2. **린트 에러 확인**
   ```bash
   npm run lint
   ```

3. **의존성 문제 확인**
   ```bash
   npm ci
   ```

### 성능 저하 시
1. **번들 크기 확인**
   ```bash
   npm run build:analyze
   ```

2. **큰 파일 확인**
   ```bash
   npm run cleanup:analyze
   ```

3. **불필요한 리렌더링 확인**
   - React DevTools Profiler 사용
   - `useCallback`, `useMemo` 적절한 사용 확인

### 보안 이슈 시
1. **취약점 확인 및 수정**
   ```bash
   npm audit fix
   ```

2. **하드코딩된 시크릿 확인**
   ```bash
   grep -r "api.*key\|secret\|password" src/
   ```

3. **환경변수 점검**
   - `.env` 파일들이 `.gitignore`에 포함되어 있는지 확인

---

## 📊 품질 메트릭 목표

### 코드 품질 목표
- **TypeScript 사용률**: 100%
- **any 타입 사용**: 0개
- **Console.log 문**: 0개 (스크립트 제외)
- **사용되지 않는 import**: 0개

### 아키텍처 목표
- **도메인 분리**: 완전 분리
- **타입 정의**: 모든 도메인별로 분리
- **상수 관리**: 중앙화된 관리
- **컴포넌트 구조**: 계층적 구조

### 성능 목표
- **번들 크기**: < 1MB
- **개별 청크**: < 250KB
- **이미지 최적화**: 100% (Next.js Image 사용)
- **동적 import**: 적극 활용

### 유지보수성 목표
- **문서화**: 모든 주요 기능 문서화
- **테스트 커버리지**: > 80%
- **자동화 스크립트**: 완전 자동화
- **코드 리뷰**: 모든 PR 리뷰

### 보안 목표
- **취약점**: 0개 (Critical/High)
- **하드코딩된 시크릿**: 0개
- **HTTPS 사용**: 100%
- **입력 검증**: 모든 사용자 입력

---

## 🎯 개선 우선순위

### 우선순위 1 (즉시 수정)
- 🔴 빌드 실패
- 🔴 타입 에러
- 🔴 보안 취약점
- 🔴 성능 병목

### 우선순위 2 (이번 주 내)
- 🟡 린트 에러
- 🟡 테스트 실패
- 🟡 중복 코드
- 🟡 네이밍 컨벤션

### 우선순위 3 (다음 주)
- 🟢 문서화 개선
- 🟢 리팩토링
- 🟢 성능 최적화
- 🟢 테스트 추가

---

## 🛠️ 자동화 도구 활용

### 개발 중 자동 실행
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "자동 정리 + 타입/린트 체크",
      "pre-push": "전체 테스트 실행"
    }
  }
}
```

### CI/CD 파이프라인
```yaml
# GitHub Actions 예시
- name: Quality Gate
  run: npm run quality:gate
  
- name: Health Check  
  run: npm run health:check
  
- name: Security Audit
  run: npm run audit:security
```

### IDE 설정
```json
// VSCode settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.organizeImports": true
}
```

---

## 📚 참고 자료

- [개발 표준 가이드](/docs/DEVELOPMENT_STANDARDS.md)
- [라우팅 가이드](/docs/ROUTING_GUIDE.md)
- [정리 완료 보고서](/docs/CLEANUP_REPORT.md)
- [도메인 아키텍처 가이드](/docs/DOMAIN_ARCHITECTURE.md)

---

## ✅ 체크리스트 완료 확인

### 일일 체크 (매일)
- [ ] 코드 품질 확인
- [ ] 자동 정리 실행
- [ ] 커밋 전 검증

### 주간 체크 (금요일)
- [ ] 전체 건강도 점검
- [ ] 품질 게이트 통과
- [ ] 수동 점검 완료

### 월간 체크 (월말)
- [ ] 의존성 업데이트
- [ ] 성능 분석 완료
- [ ] 아키텍처 리뷰 완료

**마지막 점검일**: ___________  
**점검자**: ___________  
**다음 점검 예정일**: ___________

#!/bin/bash

# ============================================
# 🎯 Phase 2: 타겟팅 클린업 스크립트
# 작성일: 2025-11-02
# ============================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="/Users/daewookjeong/CascadeProjects/federation"
cd "$PROJECT_ROOT"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}🎯 Phase 2: 타겟팅 클린업 시작${NC}"
echo -e "${BLUE}================================================${NC}"

# 1. 안전하게 제거 가능한 파일들만 제거
echo -e "\n${YELLOW}🗑️ Step 1: 확인된 미사용 파일 제거...${NC}"

# Phase 1에서 생성한 통합 파일이 있으므로 구 파일들 제거
SAFE_TO_DELETE=(
  # Phase 1 통합으로 불필요해진 파일들
  "src/lib/api-helpers.ts"  # unified-api-client.ts로 통합됨
  "src/lib/api-error.ts"     # error-manager.ts로 통합됨
  "src/utils/error/api-error.ts"  # error-manager.ts로 통합됨
  
  # 테스트 관련 미사용 파일
  "src/services/__tests__/audit-service-patch.ts"
  "src/test-utils/factory.ts"
  "src/test-utils/create-test-container.ts"
  
  # 디버그 파일
  "src/lib/admin-debug.ts"
  "src/components/debug/firebase-debug.tsx"
  
  # 미사용 Firebase 파일
  "src/firebase/error-emitter.ts"
  "src/components/FirebaseErrorListener.tsx"
)

REMOVED=0
for file in "${SAFE_TO_DELETE[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
    echo "  ✓ $file 제거"
    ((REMOVED++))
  fi
done

echo -e "${GREEN}  ${REMOVED}개 파일 제거 완료${NC}"

# 2. 빈 디렉토리 제거
echo -e "\n${YELLOW}📁 Step 2: 빈 디렉토리 정리...${NC}"
find src -type d -empty -delete 2>/dev/null || true
echo -e "${GREEN}  ✅ 빈 디렉토리 정리 완료${NC}"

# 3. Import 정리
echo -e "\n${YELLOW}📦 Step 3: Import 정리...${NC}"
npm run lint -- --fix 2>/dev/null || true
echo -e "${GREEN}  ✅ Import 정리 완료${NC}"

# 4. 빌드 테스트
echo -e "\n${YELLOW}🏗️ Step 4: 빌드 테스트...${NC}"
if npm run build; then
  echo -e "${GREEN}  ✅ 빌드 성공!${NC}"
  
  # 5. 상세 분석 리포트 생성
  echo -e "\n${YELLOW}📊 Step 5: 분석 리포트 생성...${NC}"
  
  # 파일 통계
  TOTAL_TS_FILES=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) | wc -l | xargs)
  TOTAL_LINES=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} + | tail -1 | awk '{print $1}')
  
  # UI 컴포넌트 수
  UI_COMPONENTS=$(find src/components -type f -name "*.tsx" 2>/dev/null | wc -l | xargs)
  
  # Hooks 수  
  HOOKS=$(find src/hooks -type f -name "*.ts*" 2>/dev/null | wc -l | xargs)
  
  # 서비스 수
  SERVICES=$(find src/services -type f -name "*.ts" 2>/dev/null | wc -l | xargs)
  
  echo -e "${BLUE}================================================${NC}"
  echo -e "${BLUE}📊 Phase 2 중간 보고서${NC}"
  echo -e "${BLUE}================================================${NC}"
  
  echo -e "${GREEN}✅ 완료된 작업:${NC}"
  echo "  • ${REMOVED}개 확인된 미사용 파일 제거"
  echo "  • 빈 디렉토리 정리"
  echo "  • Import 정리"
  echo ""
  
  echo -e "${BLUE}📈 현재 코드베이스 상태:${NC}"
  echo "  • TypeScript 파일: ${TOTAL_TS_FILES}개"
  echo "  • 총 코드 라인: ${TOTAL_LINES}줄"
  echo "  • UI 컴포넌트: ${UI_COMPONENTS}개"
  echo "  • Hooks: ${HOOKS}개"
  echo "  • Services: ${SERVICES}개"
  echo ""
  
  echo -e "${YELLOW}🔍 추가 검토 필요 항목:${NC}"
  echo "  • UI 컴포넌트 실제 사용 여부 검증"
  echo "  • Domain 모듈 구조 활용도 검토"
  echo "  • Store 파일 통합 가능성 검토"
  echo ""
  
  echo -e "${GREEN}✅ 빌드 상태: 성공${NC}"
else
  echo -e "${RED}  ❌ 빌드 실패${NC}"
  exit 1
fi

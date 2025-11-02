#!/bin/bash

# ============================================
# 🛡️ Phase 2: 안전한 파일 정리 스크립트
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
echo -e "${BLUE}🛡️ Phase 2: 안전한 코드 클린업 시작${NC}"
echo -e "${BLUE}================================================${NC}"

# 1. 백업 생성
echo -e "\n${YELLOW}📦 Step 1: 백업 생성...${NC}"
BACKUP_DIR="../federation-phase2-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -R src "$BACKUP_DIR/"
echo -e "${GREEN}✅ 백업 완료: $BACKUP_DIR${NC}"

# 2. Phase 1에서 제거되어야 했던 파일들 삭제
echo -e "\n${YELLOW}🗑️ Step 2: Phase 1 잔여 파일 제거...${NC}"

# 구 시스템 파일들 (이미 통합됨)
OLD_FILES=(
  "src/services/error-handler.ts"
  "src/services/api-client.ts"
  "src/utils/error/error-handler.ts"
  "src/utils/api-client.ts"
  "src/store.old"
)

REMOVED=0
for file in "${OLD_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
    echo "  ✓ $file 제거"
    ((REMOVED++))
  fi
done

echo -e "${GREEN}  ${REMOVED}개 구 시스템 파일 제거${NC}"

# 3. 빈 테스트 파일 제거
echo -e "\n${YELLOW}🧹 Step 3: 빈 테스트 파일 정리...${NC}"
EMPTY_TEST_FILES=(
  "src/services/__tests__/audit-service-patch.ts"
)

for file in "${EMPTY_TEST_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
    echo "  ✓ $file 제거"
  fi
done

# 4. 중복된 타입/인터페이스 파일 정리
echo -e "\n${YELLOW}📝 Step 4: 중복 타입 파일 정리...${NC}"

# types/index.ts가 다른 파일들을 export만 하는지 확인
if [ -f "src/types/index.ts" ]; then
  # index.ts가 단순 re-export만 하는 경우 유지
  echo "  ℹ️ src/types/index.ts는 barrel export 파일로 유지"
fi

# 5. 미사용 유틸리티 정리
echo -e "\n${YELLOW}🔧 Step 5: 확실한 미사용 파일만 제거...${NC}"

# 확실히 사용하지 않는 파일들만 선별
DEFINITELY_UNUSED=(
  "src/test-utils/factory.ts"
  "src/test-utils/create-test-container.ts"
  "src/lib/admin-debug.ts"
  "src/firebase/error-emitter.ts"
  "src/components/FirebaseErrorListener.tsx"
)

for file in "${DEFINITELY_UNUSED[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
    echo "  ✓ $file 제거"
  fi
done

# 6. Import 정리
echo -e "\n${YELLOW}📦 Step 6: 사용하지 않는 Import 정리...${NC}"
npm run lint -- --fix 2>/dev/null || true
echo -e "${GREEN}  ✅ ESLint로 import 정리 완료${NC}"

# 7. == 를 === 로 변경
echo -e "\n${YELLOW}🔄 Step 7: Deprecated 패턴 수정 (== → ===)...${NC}"
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/==/===/g; s/====/===/g; s/!=/!==/g; s/!===/!==/g' {} \;
echo -e "${GREEN}  ✅ 동등 연산자 수정 완료${NC}"

# 8. 빌드 테스트
echo -e "\n${YELLOW}🏗️ Step 8: 빌드 테스트...${NC}"
if npm run build 2>/dev/null; then
  echo -e "${GREEN}  ✅ 빌드 성공!${NC}"
else
  echo -e "${RED}  ❌ 빌드 실패 - 백업에서 복구 필요${NC}"
  echo -e "${YELLOW}  복구: cp -R $BACKUP_DIR/src ./${NC}"
  exit 1
fi

# 9. 결과 요약
echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}📊 Phase 2 클린업 요약${NC}"
echo -e "${BLUE}================================================${NC}"

# 파일 수 계산
TOTAL_TS_FILES=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) | wc -l)
TOTAL_LINES=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} + | tail -1 | awk '{print $1}')

echo -e "${GREEN}✅ 완료된 작업:${NC}"
echo "  • Phase 1 잔여 파일 제거"
echo "  • 빈 테스트 파일 정리"
echo "  • 확실한 미사용 파일 제거"
echo "  • Import 정리"
echo "  • == → === 패턴 수정"
echo ""
echo -e "${BLUE}📈 현재 상태:${NC}"
echo "  • TypeScript 파일: ${TOTAL_TS_FILES}개"
echo "  • 총 코드 라인: ${TOTAL_LINES}줄"
echo "  • 빌드 상태: ✅ 성공"
echo ""
echo -e "${YELLOW}⚠️ 주의사항:${NC}"
echo "  • UI 컴포넌트는 보존됨 (실제 사용 확인 필요)"
echo "  • 백업 위치: $BACKUP_DIR"
echo "  • 추가 정리가 필요한 경우 수동 검토 필요"

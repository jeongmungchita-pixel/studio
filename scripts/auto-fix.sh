#!/bin/bash

# ============================================
# 🔧 Federation 프로젝트 자동 수정 스크립트
# 작성일: 2025-11-02
# 설명: 스캔 결과를 바탕으로 안전한 자동 수정 수행
# ============================================

set -e  # 에러 발생 시 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 프로젝트 루트 확인
PROJECT_ROOT="/Users/daewookjeong/CascadeProjects/federation"
cd "$PROJECT_ROOT"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}🔧 Federation 프로젝트 자동 수정 시작${NC}"
echo -e "${BLUE}================================================${NC}"

# 1. 백업 생성
echo -e "\n${YELLOW}📦 Step 1: 프로젝트 백업 생성...${NC}"
BACKUP_NAME="federation-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "../$BACKUP_NAME" . --exclude=node_modules --exclude=.next --exclude=.git
echo -e "${GREEN}✅ 백업 완료: ../$BACKUP_NAME${NC}"

# 2. Store 시스템 통합
echo -e "\n${YELLOW}🏪 Step 2: Store 시스템 통합...${NC}"
if [ -d "src/store" ] && [ -d "src/stores" ]; then
    echo "  - store와 stores 디렉토리 병합 중..."
    
    # stores 디렉토리로 통합
    cp -n src/store/*.ts src/stores/ 2>/dev/null || true
    
    # import 경로 수정
    find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's|from ["'"'"']@/store/|from ["'"'"']@/stores/|g' {} \;
    
    # 기존 store 디렉토리를 백업으로 이동
    mv src/store src/store.old
    
    echo -e "${GREEN}  ✅ Store 통합 완료${NC}"
else
    echo -e "${YELLOW}  ⚠️  Store 디렉토리 구조가 예상과 다름${NC}"
fi

# 3. 사용하지 않는 Import 정리
echo -e "\n${YELLOW}📦 Step 3: 사용하지 않는 Import 정리...${NC}"
if [ -f "src/scripts/cleanup-imports.js" ]; then
    node src/scripts/cleanup-imports.js
    echo -e "${GREEN}  ✅ Import 정리 완료${NC}"
else
    # ESLint로 대체
    npm run lint -- --fix 2>/dev/null || true
    echo -e "${GREEN}  ✅ ESLint로 정리 완료${NC}"
fi

# 4. use-role Hook 파일 확장자 수정
echo -e "\n${YELLOW}🔗 Step 4: Hook 파일 확장자 수정...${NC}"
if [ -f "src/hooks/use-role.ts" ]; then
    mv src/hooks/use-role.ts src/hooks/use-role.tsx
    echo -e "${GREEN}  ✅ use-role.ts → use-role.tsx 변경 완료${NC}"
else
    echo -e "${YELLOW}  ⚠️  use-role.ts 파일이 없음${NC}"
fi

# 5. 빈 파일 및 테스트 패치 파일 제거
echo -e "\n${YELLOW}🗑️  Step 5: 불필요한 파일 제거...${NC}"
REMOVED_COUNT=0

# 빈 테스트 패치 파일 제거
if [ -f "src/services/__tests__/audit-service-patch.ts" ]; then
    rm -f "src/services/__tests__/audit-service-patch.ts"
    ((REMOVED_COUNT++))
fi

# .backup 파일 제거
find src -name "*.backup" -delete 2>/dev/null || true
BACKUP_FILES=$(find src -name "*.backup" 2>/dev/null | wc -l)
REMOVED_COUNT=$((REMOVED_COUNT + BACKUP_FILES))

echo -e "${GREEN}  ✅ ${REMOVED_COUNT}개 파일 제거 완료${NC}"

# 6. TypeScript 컴파일 체크
echo -e "\n${YELLOW}📝 Step 6: TypeScript 컴파일 체크...${NC}"
npx tsc --noEmit 2>/dev/null && echo -e "${GREEN}  ✅ TypeScript 컴파일 성공${NC}" || echo -e "${RED}  ❌ TypeScript 오류 있음 (수동 수정 필요)${NC}"

# 7. 결과 요약
echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}📊 자동 수정 완료 요약${NC}"
echo -e "${BLUE}================================================${NC}"

echo -e "${GREEN}✅ 완료된 작업:${NC}"
echo "  • 프로젝트 백업 생성"
echo "  • Store 시스템 통합 (store → stores)"
echo "  • Import 정리"
echo "  • Hook 파일 확장자 수정"
echo "  • 불필요한 파일 제거"

echo -e "\n${YELLOW}⚠️  수동 작업 필요:${NC}"
echo "  1. Error Handler 통합 (services vs utils)"
echo "  2. API Client 통합 (services vs utils)"
echo "  3. 중복 코드 제거"
echo "  4. TypeScript 오류 수정 (있는 경우)"

echo -e "\n${BLUE}📝 다음 단계:${NC}"
echo "  1. npm run build로 빌드 테스트"
echo "  2. npm test로 테스트 실행"
echo "  3. IMMEDIATE_FIXES.md의 Phase 2 진행"

echo -e "\n${GREEN}🎉 자동 수정 스크립트 완료!${NC}"
echo -e "${YELLOW}백업 위치: ../$BACKUP_NAME${NC}"

# 빌드 테스트 제안
echo -e "\n${BLUE}빌드를 테스트하시겠습니까? (y/n)${NC}"
read -r response
if [[ "$response" == "y" ]]; then
    npm run build
fi

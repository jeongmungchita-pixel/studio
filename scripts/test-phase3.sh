#!/bin/bash

# Phase 3 테스트 실행 스크립트

echo "🧪 Phase 3: 테스트 커버리지 확인"
echo "=================================="
echo ""

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. 현재 테스트 상태 확인
echo "📋 Step 1: 테스트 파일 통계"
echo "----------------------------"
TEST_FILES=$(find src -name "*.test.ts" -o -name "*.test.tsx" | wc -l | xargs)
echo "  총 테스트 파일: ${TEST_FILES}개"

# Phase 1/2로 인해 깨진 테스트 파일 찾기
BROKEN_TESTS=$(find src -name "*.test.ts" -o -name "*.test.tsx" -exec grep -l "api-client\|error-handler" {} \; | wc -l | xargs)
echo "  수정 필요한 테스트: ${BROKEN_TESTS}개"

echo ""

# 2. 핵심 모듈 테스트 확인
echo "📋 Step 2: 핵심 모듈 테스트"
echo "----------------------------"

# unified-api-client 테스트
if [ -f "src/lib/api/__tests__/unified-api-client.test.ts" ]; then
  echo -e "  ${GREEN}✓${NC} unified-api-client.test.ts 생성됨"
else
  echo -e "  ${RED}✗${NC} unified-api-client.test.ts 필요"
fi

# error-manager 테스트
if [ -f "src/lib/error/__tests__/error-manager.test.ts" ]; then
  echo -e "  ${GREEN}✓${NC} error-manager.test.ts 생성됨"
else
  echo -e "  ${RED}✗${NC} error-manager.test.ts 필요"
fi

echo ""

# 3. 간단한 테스트 실행
echo "📋 Step 3: 간단한 테스트 실행"
echo "----------------------------"

# 특정 테스트만 실행 (빠른 피드백용)
echo "  lib 모듈 테스트 실행중..."
npm test -- src/lib/**/*.test.ts --run 2>&1 | tail -5

echo ""

# 4. 다음 단계 안내
echo "📋 Step 4: 다음 작업 제안"
echo "----------------------------"
echo "  1. Mock 시스템 수정 (src/test/setup.ts)"
echo "  2. 깨진 테스트 import 경로 수정"
echo "  3. 새로운 통합 시스템에 맞게 테스트 재작성"
echo "  4. 커버리지 측정 및 리포트 생성"

echo ""
echo "💡 팁: Phase 1/2의 대규모 변경으로 많은 테스트가 깨졌습니다."
echo "     테스트 복구를 우선 진행한 후 커버리지를 높여야 합니다."

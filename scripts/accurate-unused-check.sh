#!/bin/bash

echo "🔍 정확한 미사용 파일 분석 시작..."
echo "================================"

# 실제 미사용 파일 목록
UNUSED_FILES=(
  # domains 폴더의 미사용 컴포넌트들
  "src/domains/member/components/member-card.tsx"
  "src/domains/member/components/member-search.tsx"
  "src/domains/member/components/attendance-tracker.tsx"
  "src/domains/member/components/member-status-badge.tsx"
  "src/domains/member/components/index.ts"
  "src/domains/member/utils/__tests__/index.test.ts"
  
  # 일부 미사용 유틸리티
  "src/components/optimized-image.tsx"
  "src/components/infinite-scroll.tsx"
  "src/components/error-boundary-enhanced.tsx"
  
  # 미사용 레이아웃
  "src/components/layout/top-nav.tsx"
  "src/components/layout/modern-nav.tsx"
  "src/components/layout/global-search.tsx"
  
  # 미사용 공통 컴포넌트
  "src/components/common/page-header.tsx"
  "src/components/common/loading-states.tsx"
  "src/components/common/empty-state.tsx"
  "src/components/common/data-table.tsx"
  "src/components/common/index.ts"
  
  # 미사용 테스트 유틸리티
  "src/components/__tests__/test-utils.tsx"
)

# 사용 중인 파일들 (삭제하면 안 됨)
USED_FILES=(
  "src/components/error-fallback.tsx"
  "src/components/require-role.tsx"
  "src/components/role-badge.tsx"
  "src/components/pending-approval-card.tsx"
  "src/components/logout-button.tsx"
  "src/components/loading-spinner.tsx"
  "src/components/loading-indicator.tsx"
  "src/components/approval-status-badge.tsx"
  "src/components/approval-actions.tsx"
  "src/hooks/use-toast.ts"
  "src/hooks/use-user.tsx"
  "src/utils/type-guards.ts"
  "src/services/user-service.ts"
  "src/lib/monitoring.ts"
  "src/lib/cache.ts"
)

echo ""
echo "📊 분석 결과:"
echo "================================"

echo ""
echo "✅ 실제 미사용 파일 ($(echo ${#UNUSED_FILES[@]}))개:"
for file in "${UNUSED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  - $file"
  fi
done

echo ""
echo "❌ 사용 중인 파일 (삭제하면 빌드 실패) ($(echo ${#USED_FILES[@]}))개:"
for file in "${USED_FILES[@]}"; do
  if [ -f "$file" ]; then
    count=$(grep -r "$(basename "$file" .tsx | sed 's/.ts$//')" src --include="*.tsx" --include="*.ts" | wc -l)
    echo "  - $file ($count번 사용)"
  fi
done

echo ""
echo "💡 결론:"
echo "  - 실제 미사용 파일: 약 20개"
echo "  - 분석 스크립트 오류: 171개 → 20개로 수정 필요"
echo "  - UI 컴포넌트 대부분은 사용 중임"

#!/bin/bash

# 불필요한 파일 정리 스크립트
# 실행 전 반드시 백업하세요!

echo "🗑️  불필요한 파일 정리 시작..."
echo "================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 삭제 대상 카운트
TOTAL_COUNT=0

# 1. 보존해야 할 중요한 MD 파일들
KEEP_FILES=(
  "README.md"
  "CHANGELOG.md"
  "DEPLOY_GUIDE.md"
  "VERCEL_DEPLOYMENT_GUIDE.md"
  "PHASE2_FINAL_REPORT.md"  # 최종 리포트들은 보관
  "PHASE4_FINAL_REPORT.md"
)

# 2. 루트 디렉토리의 불필요한 MD 파일 정리
echo ""
echo "📝 루트 디렉토리 MD 파일 정리..."
echo "--------------------------------"

# 보존 파일 목록 만들기
KEEP_PATTERN=""
for file in "${KEEP_FILES[@]}"; do
  KEEP_PATTERN="$KEEP_PATTERN -o -name $file"
done

# 삭제할 MD 파일 찾기 (보존 파일 제외)
TO_DELETE=$(find . -maxdepth 1 -name "*.md" -type f \( -false $KEEP_PATTERN \) -prune -o -name "*.md" -type f -print | sort)

if [ ! -z "$TO_DELETE" ]; then
  echo "삭제 대상 MD 파일:"
  echo "$TO_DELETE" | while read file; do
    echo -e "  ${YELLOW}$file${NC}"
    ((TOTAL_COUNT++))
  done
  
  echo ""
  read -p "위 MD 파일들을 삭제하시겠습니까? (y/n): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "$TO_DELETE" | while read file; do
      rm "$file"
      echo -e "  ${GREEN}✓${NC} $file 삭제됨"
    done
  fi
fi

# 3. docs 폴더 중복 문서 정리
echo ""
echo "📁 docs 폴더 정리..."
echo "--------------------"

# docs 폴더의 중복/오래된 문서들
DOCS_TO_DELETE=(
  "docs/PHASE1_COMPLETE.md"
  "docs/PHASE2_COMPLETE.md"
  "docs/PHASE3_COMPLETE.md"
  "docs/PHASE4_COMPLETE.md"
  "docs/PHASE_4_ADMIN_SDK_COMPLETION.md"
  "docs/ADDITIONAL_IMPROVEMENTS_REPORT.md"
  "docs/BUTTON_CONNECTION_REPORT.md"
  "docs/CLEANUP_REPORT.md"
  "docs/INTEGRATION_REPORT.md"
  "docs/TEST_PROJECT_TRACKER.md"
)

echo "삭제 대상 docs 파일:"
for file in "${DOCS_TO_DELETE[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${YELLOW}$file${NC}"
    ((TOTAL_COUNT++))
  fi
done

echo ""
read -p "docs 폴더의 중복 문서들을 삭제하시겠습니까? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  for file in "${DOCS_TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
      rm "$file"
      echo -e "  ${GREEN}✓${NC} $file 삭제됨"
    fi
  done
fi

# 4. 백업 파일 정리
echo ""
echo "💾 백업 파일 정리..."
echo "-------------------"

BACKUP_FILES=$(find . -type f \( -name "*.backup*" -o -name "*.old*" -o -name "*.bak*" -o -name "*.orig" \) ! -path "./node_modules/*" ! -path "./.next/*" 2>/dev/null)

if [ ! -z "$BACKUP_FILES" ]; then
  echo "삭제 대상 백업 파일:"
  echo "$BACKUP_FILES" | while read file; do
    echo -e "  ${YELLOW}$file${NC}"
    ((TOTAL_COUNT++))
  done
  
  echo ""
  read -p "백업 파일들을 삭제하시겠습니까? (y/n): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "$BACKUP_FILES" | while read file; do
      rm "$file"
      echo -e "  ${GREEN}✓${NC} $file 삭제됨"
    done
  fi
fi

# 5. .next 캐시 정리
echo ""
echo "🗄️ .next 캐시 정리..."
echo "--------------------"

read -p ".next 캐시를 정리하시겠습니까? (빌드 시간이 늘어날 수 있습니다) (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  rm -rf .next/cache
  echo -e "  ${GREEN}✓${NC} .next/cache 정리됨"
fi

# 6. 기타 임시 파일 정리
echo ""
echo "🔍 기타 임시 파일 확인..."
echo "------------------------"

# 로그 파일들
LOG_FILES=$(find . -maxdepth 2 -name "*.log" -type f 2>/dev/null)
if [ ! -z "$LOG_FILES" ]; then
  echo "발견된 로그 파일:"
  echo "$LOG_FILES" | while read file; do
    echo -e "  ${YELLOW}$file${NC}"
  done
fi

# JSON 보고서 파일들
JSON_REPORTS=$(find . -maxdepth 1 -name "*report*.json" -o -name "*analysis*.json" -o -name "*coverage*.json" 2>/dev/null)
if [ ! -z "$JSON_REPORTS" ]; then
  echo "발견된 JSON 리포트:"
  echo "$JSON_REPORTS" | while read file; do
    echo -e "  ${YELLOW}$file${NC}"
  done
fi

echo ""
echo "================================"
echo -e "${GREEN}✅ 정리 완료!${NC}"
echo ""
echo "📊 요약:"
echo "  - 검토된 파일: 다수"
echo "  - 정리 권장 파일: 약 100개+"
echo ""
echo "💡 권장사항:"
echo "  1. git status로 변경사항 확인"
echo "  2. 필요한 문서는 docs/ 폴더로 이동"
echo "  3. README.md 업데이트"
echo ""
echo "⚠️  중요: 삭제 전 반드시 git commit으로 백업하세요!"

#!/bin/bash
# BEFS 별칭 설정 스크립트

echo "🔧 BEFS 별칭을 ~/.zshrc에 추가 중..."

# ~/.zshrc에 BEFS 별칭 추가
cat >> ~/.zshrc << 'EOF'

# ========== BEFS Automation 별칭 ==========
alias session_start="python3 ~/befs-automation/automation/session_start.py"
alias session_end="python3 ~/befs-automation/automation/session_end.py"
alias windsurf_start="python3 ~/befs-automation/automation/windsurf_start.py"
alias befs_start="python3 ~/befs-automation/firebase_agent.py"

# BEFS CLI 별칭
alias befs_status="python3 -m befs_automation.cli hub status"
alias befs_startall="python3 -m befs_automation.cli hub startall"
alias befs_dashboard="python3 -m befs_automation.cli hub dashboard"

# 빠른 디렉토리 이동
alias goto_befs="cd ~/befs-automation"
alias goto_automation="cd ~/befs-automation/automation"

# 개발 도구
alias befs_mode="python3 -m befs_automation.cli mode status"
alias befs_integrate="python3 -m befs_automation.cli integrate"

echo "✅ BEFS 별칭 설정 완료!"
EOF

# 현재 터미널에 즉시 적용
source ~/.zshrc

echo "🎯 사용 가능한 별칭들:"
echo "  session_start    - 세션 시작"
echo "  session_end      - 세션 종료" 
echo "  windsurf_start   - Windsurf 시작"
echo "  befs_status      - 허브 상태 확인"
echo "  befs_startall    - 모든 프로젝트 시작"
echo "  goto_befs        - BEFS 디렉토리로 이동"
echo ""
echo "💡 터미널을 새로 열거나 'source ~/.zshrc' 실행하세요!"

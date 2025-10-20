#!/bin/bash
# 한글 입력 모드용 별칭 설정

echo "🇰🇷 한글 입력 모드용 별칭 설정 중..."

# ~/.zshrc에 한글 별칭 추가
cat >> ~/.zshrc << 'EOF'

# ========== 한글 입력 모드용 BEFS 별칭 ==========
# automation/start -> 메ㅅ둠ㅁ샤ㅐㅜ/ㄴㅅㅁㄱㅅ
alias 메ㅅ둠ㅁ샤ㅐㅜ/ㄴㅅㅁㄱㅅ="automation/start"
alias ㅁㅕㅅㅐㅡㅁ샤ㅐㅜ/ㄴㅅㅁㄱㅅ="automation/start"

# session_start -> ㄴㄷㄴㄴ샤ㅐㅜ_ㄴㅅㅁㄱㅅ  
alias ㄴㄷㄴㄴ샤ㅐㅜ_ㄴㅅㅁㄱㅅ="python3 automation/session_start.py"

# session_end -> ㄴㄷㄴㄴ샤ㅐㅜ_둥
alias ㄴㄷㄴㄴ샤ㅐㅜ_둥="python3 automation/session_end.py"

# smart_backup -> ㄴㅡㅁㄱㅅ_ㅠㅁ차ㅕㅔ
alias ㄴㅡㅁㄱㅅ_ㅠㅁ차ㅕㅔ="python3 automation/smart_backup.py"

# befs_start -> ㅠㄷㄹㄴ_ㄴㅅㅁㄱㅅ
alias ㅠㄷㄹㄴ_ㄴㅅㅁㄱㅅ="python3 firebase_agent.py"

EOF

echo "✅ 한글 별칭 설정 완료!"
echo ""
echo "📋 사용 가능한 한글 명령어:"
echo "  메ㅅ둠ㅁ샤ㅐㅜ/ㄴㅅㅁㄱㅅ     → automation/start"
echo "  ㄴㄷㄴㄴ샤ㅐㅜ_ㄴㅅㅁㄱㅅ      → session_start"
echo "  ㄴㄷㄴㄴ샤ㅐㅜ_둥         → session_end"
echo "  ㄴㅡㅁㄱㅅ_ㅠㅁ차ㅕㅔ       → smart_backup"
echo ""
echo "🔄 터미널 재시작 또는 'source ~/.zshrc' 실행 후 사용 가능"

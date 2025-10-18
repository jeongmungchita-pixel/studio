# 🎹 키보드 매크로 설정 가이드

## 📁 생성된 파일

### 1. **via_macros.json** - Via 소프트웨어용
Via 키보드 소프트웨어에서 직접 임포트 가능한 매크로 파일

### 2. **doio_keymap_new.json** - DOIO 키보드용  
DOIO 키보드 전용 키맵 설정 파일

---

## 🔧 Via 소프트웨어 설정 방법

### 1단계: Via 소프트웨어 열기
- Via 앱 실행
- 키보드 연결 확인

### 2단계: 매크로 임포트
1. **Macros** 탭 클릭
2. **Import** 버튼 클릭  
3. `~/automation/via_macros.json` 파일 선택
4. **Import** 확인

### 3단계: 키 할당
각 키에 매크로 할당:
- **Key 1** → Macro 0 (Windsurf 실행)
- **Key 2** → Macro 1 (BEFS Agent 시작)
- **Key 3** → Macro 2 (BEFS 상태 확인)
- **Key 4** → Macro 3 (Tasks 목록)
- **Key 5** → Macro 4 (Skills 목록)
- **Key 6** → Macro 5 (BEFS 재시작)
- **다이얼 Push Top** → Macro 6 (키맵 보기)
- **다이얼 Push Bottom** → Macro 7 (BEFS 종료)

---

## 🎯 DOIO 키보드 설정 방법

### 1단계: 기존 파일 백업
```bash
cp ~/automation/doio_keymap.json ~/automation/doio_keymap_backup.json
```

### 2단계: 새 키맵 적용
```bash
cp ~/automation/doio_keymap_new.json ~/automation/doio_keymap.json
```

### 3단계: DOIO 소프트웨어에서 적용
1. DOIO 소프트웨어 열기
2. 키맵 파일 로드
3. 키보드에 플래시

---

## 🧪 테스트 방법

### 수동 테스트
각 매크로를 터미널에서 직접 실행:

```bash
# Key 1 테스트
python3 ~/automation/windsurf_start.py

# Key 2 테스트  
python3 ~/automation/befs_start.py

# Key 3 테스트
python3 ~/automation/befs_status.py

# Key 4 테스트
python3 ~/automation/befs_tasks.py

# Key 5 테스트
python3 ~/automation/befs_skills.py

# Key 6 테스트
python3 ~/automation/befs_restart.py

# 다이얼 Push Top 테스트
python3 ~/automation/show_keymap.py

# 다이얼 Push Bottom 테스트
python3 ~/automation/befs_stop.py
```

### 키보드 테스트
1. 키보드 매크로 설정 완료 후
2. 각 키를 눌러서 동작 확인
3. 터미널에서 출력 메시지 확인

---

## 🎹 키 매핑 요약

```
╔════════════════════════════════════════════════════════╗
║          🎹 BEFS Automation 키맵                       ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  Key 1  : 🚀 Windsurf 실행                            ║
║  Key 2  : ▶️  BEFS Agent 시작                         ║
║  Key 3  : 🔍 BEFS 상태 확인                           ║
║  Key 4  : 📋 Tasks 목록                               ║
║  Key 5  : 🎓 Skills 목록                              ║
║  Key 6  : 🔄 BEFS 재시작                              ║
║                                                        ║
║  다이얼 Push (Top)    : 📖 키맵 보기                  ║
║  다이얼 Push (Bottom) : ⏹️  BEFS Agent 종료           ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

## 🔧 문제 해결

### Via 소프트웨어에서 매크로가 작동하지 않는 경우

1. **권한 확인**
   ```bash
   chmod +x ~/automation/*.py
   ```

2. **경로 확인**
   ```bash
   ls -la ~/automation/
   ```

3. **Python 경로 확인**
   ```bash
   which python3
   ```

### DOIO 키보드에서 작동하지 않는 경우

1. **키맵 파일 확인**
   ```bash
   cat ~/automation/doio_keymap.json
   ```

2. **DOIO 소프트웨어 재시작**

3. **키보드 재연결**

---

## 📚 추가 정보

### Via 매크로 파일 구조
```json
{
  "index": 0,           // 매크로 번호
  "macro_name": "...",  // 매크로 이름
  "keys": [
    {
      "action": "COMMAND_LINE",  // 액션 타입
      "command": "..."           // 실행할 명령
    }
  ]
}
```

### DOIO 키맵 파일 구조
```json
{
  "keys": {
    "1": "command1",    // 키 번호: 명령
    "2": "command2"
  },
  "dial_push_top": "command",     // 다이얼 상단 푸시
  "dial_push_bottom": "command"   // 다이얼 하단 푸시
}
```

---

## 🎉 완료!

이제 키보드 하나로 전체 BEFS 시스템을 제어할 수 있습니다!

**워크플로우 예시:**
1. **Key 2** - BEFS Agent 시작
2. **Key 1** - Windsurf 실행  
3. **Key 4** - 오늘 할 일 확인
4. 작업 진행...
5. **다이얼 Push Bottom** - BEFS Agent 종료

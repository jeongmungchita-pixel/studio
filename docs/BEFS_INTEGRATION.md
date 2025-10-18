# 🤖 BEFS Hybrid Agent 연동 가이드

## 📋 개요

BEFS Hybrid Agent v4.5와 KGF 넥서스 프로젝트의 연동 문서입니다.

## 🔗 서버 정보

- **Base URL**: `http://127.0.0.1:8765`
- **Version**: 4.5
- **Status**: ✅ 정상 작동 중
### ✅ 테스트 결과

- **Health Check**: ✅ 정상 (v4.5)
- **Summary**: ✅ 정상
- **Tasks GET**: ✅ 정상
- **Tasks POST**: ✅ 정상
- **Tasks PUT (Toggle)**: ✅ 정상

## 📡 사용 가능한 API 엔드포인트

### 1. Health Check
```typescript
GET /health
Response: { ok: boolean, version: string }
```

**사용 예시:**
```typescript
import { checkBefsHealth } from '@/services/befs-agent.service';

const result = await checkBefsHealth();
if (result.success) {
  console.log('Server version:', result.data.version);
}
```

### 2. Summary
```typescript
GET /summary
Response: { summary: string }
```

**사용 예시:**
```typescript
import { getBefsSummary } from '@/services/befs-agent.service';

const result = await getBefsSummary();
if (result.success) {
  console.log('Summary:', result.data.summary);
}
```

### 3. Tasks ✅
```typescript
GET /tasks
Response: BefsTask[]

POST /tasks
Request: { title, status?, priority?, due_at?, metadata? }
Response: { added: string, id: number }

PUT /tasks/{task_id}
Response: { updated: number, status: string }
```

**Task 구조:**
```typescript
interface BefsTask {
  id: number;
  title: string;
  status: 'todo' | 'doing' | 'done' | 'blocked' | 'dropped';
  priority: 1 | 2 | 3 | 4 | 5; // 1=긴급, 5=매우 낮음
  due_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: string | null; // JSON blob
}
```

**사용 예시:**
```typescript
import { getBefsTasks, createBefsTask, toggleBefsTask, befsAgentService } from '@/services/befs-agent.service';

// 모든 Task 가져오기
const tasksResult = await getBefsTasks();
if (tasksResult.success) {
  console.log('Tasks:', tasksResult.data);
  
  // 메타데이터 파싱
  tasksResult.data.forEach(task => {
    const metadata = befsAgentService.parseTaskMetadata(task);
    console.log(`${task.title}: ${metadata?.area || 'N/A'}`);
  });
}

// 새 Task 생성
const newTask = await createBefsTask({
  title: '새로운 작업',
  status: 'todo',
  priority: 1,
  metadata: JSON.stringify({ project: 'studio', area: 'feature' })
});

// Task 토글 (todo ↔ done)
const toggleResult = await toggleBefsTask(1);
if (toggleResult.success) {
  console.log('New status:', toggleResult.data.status);
}

// 헬퍼 메서드 사용
console.log(befsAgentService.getPriorityLabel(1)); // "🔥 긴급"
console.log(befsAgentService.getStatusLabel('doing')); // "🔄 진행 중"
```

## 🛠️ 프로젝트 구조

### 설정 파일
```
src/constants/config.ts
└── API_CONFIG.BEFS_AGENT
    ├── BASE_URL
    ├── VERSION
    ├── ENDPOINTS
    └── TIMEOUT
```

### 타입 정의
```
src/types/befs.ts
├── BefsHealthResponse
├── BefsSummaryResponse
├── BefsTask
├── CreateTaskRequest
├── UpdateTaskRequest
└── BefsApiResponse<T>
```

### 서비스 레이어
```
src/services/befs-agent.service.ts
├── BefsAgentService (클래스)
└── 편의 함수들
    ├── checkBefsHealth()
    ├── getBefsSummary()
    ├── getBefsTasks()
    ├── createBefsTask()
    ├── toggleBefsTask()
    ├── deleteBefsTask()
    └── testBefsConnection()
```

## 🧪 테스트

### 연결 테스트 실행
```bash
node src/scripts/test-befs-connection.js
```

### 수동 테스트
```bash
# Health check
curl http://127.0.0.1:8765/health

# Summary
curl http://127.0.0.1:8765/summary

# API 문서 (Swagger UI)
open http://127.0.0.1:8765/docs
```

## 📦 사용 방법

### 1. 기본 사용
```typescript
import { befsAgentService } from '@/services/befs-agent.service';

// 서버 연결 테스트
const isConnected = await befsAgentService.testConnection();

// 서버 정보 가져오기
const serverInfo = await befsAgentService.getServerInfo();
```

### 2. React 컴포넌트에서 사용
```typescript
'use client';

import { useEffect, useState } from 'react';
import { checkBefsHealth, getBefsSummary } from '@/services/befs-agent.service';

export function BefsStatus() {
  const [health, setHealth] = useState<string>('checking...');
  const [summary, setSummary] = useState<string>('');

  useEffect(() => {
    async function checkStatus() {
      const healthResult = await checkBefsHealth();
      if (healthResult.success) {
        setHealth(`✅ v${healthResult.data.version}`);
      } else {
        setHealth('❌ Offline');
      }

      const summaryResult = await getBefsSummary();
      if (summaryResult.success) {
        setSummary(summaryResult.data.summary);
      }
    }

    checkStatus();
  }, []);

  return (
    <div>
      <p>BEFS Agent: {health}</p>
      <p>Summary: {summary}</p>
    </div>
  );
}
```

### 3. API 라우트에서 사용
```typescript
// app/api/befs/health/route.ts
import { NextResponse } from 'next/server';
import { befsAgentService } from '@/services/befs-agent.service';

export async function GET() {
  const result = await befsAgentService.checkHealth();
  
  if (result.success) {
    return NextResponse.json(result.data);
  }
  
  return NextResponse.json(
    { error: result.error.detail },
    { status: result.error.status_code || 500 }
  );
}
```

## 🔧 환경 변수 설정

`.env.local` 파일에 추가:
```env
NEXT_PUBLIC_BEFS_API_URL=http://127.0.0.1:8765
```

## ✅ 해결된 이슈

1. **Tasks API 연동 완료** (2025-10-18)
   - 서버 코드(`main.py`) 실제 DB 스키마에 맞춰 수정
   - Task 생성, 조회, 토글 모두 정상 작동
   - 타입 정의 및 서비스 레이어 업데이트 완료

## 🚀 다음 단계

1. ✅ API 설정 및 타입 정의 완료
2. ✅ 서비스 레이어 구현 완료
3. ✅ 연결 테스트 완료
4. ✅ Tasks API 연동 완료
5. ⏳ UI 컴포넌트 개발 (Task 관리 대시보드)
6. ⏳ 실시간 업데이트 기능 추가
7. ⏳ Skills API 연동

## 📚 참고 자료

- API 문서: http://127.0.0.1:8765/docs
- OpenAPI Spec: http://127.0.0.1:8765/openapi.json

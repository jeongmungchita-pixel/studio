# 🚀 Vercel 배포 가이드

## 📋 수정사항
1. **package.json** - build 스크립트에서 `NODE_ENV=production` 제거
   - 이전: `"build": "NODE_ENV=production next build"`
   - 이후: `"build": "next build"`
   - 이유: Vercel이 자동으로 NODE_ENV를 설정함

2. **vercel.json** - 불필요한 env 설정 제거
   - NODE_ENV 설정 제거
   - Vercel이 자동으로 처리

## 🔍 배포 실패 시 확인사항

### 1. Vercel 대시보드에서 에러 로그 확인
1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. `gymnasticsfed` 프로젝트 클릭
3. "Deployments" 탭 클릭
4. 실패한 배포의 "View" 버튼 클릭
5. "Build Logs" 확인

### 2. 일반적인 배포 실패 원인

#### ❌ TypeScript 에러
- 로컬에서 먼저 확인: `npm run typecheck`
- 수정 후 다시 푸시

#### ❌ ESLint 에러
- 로컬에서 먼저 확인: `npm run lint`
- 자동 수정: `npm run lint:fix`

#### ❌ 빌드 에러
- 로컬에서 빌드 테스트: `npm run build`
- 빌드 성공 확인 후 푸시

#### ❌ 환경 변수 누락
- Vercel Dashboard > Settings > Environment Variables
- 필요한 환경 변수 추가 (현재 Firebase 설정은 하드코딩되어 있어 불필요)

## 🛠️ 로컬 테스트 명령어

```bash
# 1. TypeScript 타입 체크
npm run typecheck

# 2. ESLint 체크
npm run lint

# 3. 빌드 테스트
npm run build

# 4. 프로덕션 모드로 실행
npm run start
```

## 📝 현재 배포 상태 확인

- **URL**: https://gymnasticsfed--studio-2481293716-bdd83.asia-southeast1.hosted.app
- **최신 릴리즈**: Oct 21, 2025
- **상태**: 배포 실패 (3:59 PM)

## 🔄 재배포 트리거 방법

1. **GitHub 푸시** (자동)
   ```bash
   git add .
   git commit -m "fix: deployment issue"
   git push origin main
   ```

2. **Vercel Dashboard에서 수동 재배포**
   - Deployments > 성공한 이전 배포 > "..." 메뉴 > "Redeploy"

3. **Vercel CLI** (설치 필요)
   ```bash
   npm i -g vercel
   vercel --prod
   ```

## 📌 추가 개선 사항

### 보안 개선 (권장)
Firebase 설정을 환경 변수로 이동:

1. `/src/firebase/config.ts` 수정:
```typescript
export const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};
```

2. Vercel Dashboard에서 환경 변수 설정

### 성능 최적화
- Image Optimization 활성화
- Edge Functions 사용 검토
- ISR (Incremental Static Regeneration) 적용

## 🆘 문제가 계속되면

1. Vercel Support 문의
2. GitHub Issues에 에러 로그 포함하여 이슈 생성
3. 로컬 빌드 로그와 Vercel 빌드 로그 비교

---
*Updated: Oct 28, 2025*

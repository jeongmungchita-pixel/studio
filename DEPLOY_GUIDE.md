# 🚀 배포 가이드

## 현재 상황

Firebase Hosting + Cloud Functions로 Next.js를 배포하려고 하면 복잡한 설정이 필요합니다.

## 추천 방법: Vercel 사용

Next.js는 Vercel에서 가장 잘 작동합니다.

### Vercel 배포 단계

1. **Vercel 계정 생성**
   - https://vercel.com 접속
   - GitHub 계정으로 로그인

2. **프로젝트 Import**
   - "Add New Project" 클릭
   - GitHub 저장소 선택: `jeongmungchita-pixel/studio`

3. **환경 변수 설정**
   Vercel 대시보드에서 다음 환경 변수 추가:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=studio-2481293716-bdd83
   ...
   ```

4. **배포**
   - "Deploy" 클릭
   - 자동으로 빌드 및 배포됨

### Firebase는 백엔드만 사용

- Firestore: 데이터베이스
- Firebase Auth: 인증
- Cloud Functions: 이메일 발송 등 백엔드 로직
- Firebase Storage: 파일 저장

### 장점

✅ 자동 배포 (Git push시)
✅ 빠른 글로벌 CDN
✅ 무료 SSL 인증서
✅ 서버리스 자동 스케일링
✅ Next.js 최적화

## 대안: Firebase Hosting (정적 페이지만)

현재 설정으로는 Firebase Hosting이 `public` 폴더만 서빙합니다.
동적 기능이 필요 없는 페이지만 배포 가능합니다.


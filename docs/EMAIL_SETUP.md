# 📧 이메일 발송 설정 가이드

## 개요

연맹 관리자 초대 시 자동으로 이메일을 발송하려면 Firebase Functions에 Gmail 설정이 필요합니다.

## 설정 방법

### 1. Gmail 앱 비밀번호 생성

1. Google 계정 설정으로 이동: https://myaccount.google.com/
2. **보안** > **2단계 인증** 활성화 (필수)
3. **앱 비밀번호** 생성:
   - 앱 선택: 메일
   - 기기 선택: 기타 (사용자 지정 이름: "KGF Nexus")
4. 생성된 16자리 비밀번호 복사

### 2. Firebase Functions 환경 변수 설정

터미널에서 다음 명령어 실행:

```bash
# 프로젝트 루트 디렉토리에서
cd functions

# 이메일 설정
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.pass="your-app-password-here"

# 앱 URL 설정 (프로덕션 도메인)
firebase functions:config:set app.url="https://your-domain.com"

# 설정 확인
firebase functions:config:get
```

### 3. Firebase Functions 배포

```bash
# Functions 배포
firebase deploy --only functions

# 특정 함수만 배포
firebase deploy --only functions:onFederationAdminInviteCreatedV2
```

### 4. 로컬 개발 환경 설정

로컬에서 테스트하려면 `.runtimeconfig.json` 파일 생성:

```bash
# functions 디렉토리에서
firebase functions:config:get > .runtimeconfig.json
```

**주의**: `.runtimeconfig.json`은 `.gitignore`에 포함되어 있어야 합니다.

## 이메일 발송 확인

### Firebase Console에서 확인

1. Firebase Console > Functions 탭
2. `onFederationAdminInviteCreatedV2` 함수 로그 확인
3. 성공 시: `✅ 초대 이메일 발송 성공: email@example.com`
4. 실패 시: `❌ 이메일 발송 실패: [에러 메시지]`

### 이메일 설정 없이 사용하기

이메일 설정이 없어도 초대 기능은 작동합니다:

1. 최고 관리자가 초대 생성
2. **초대 관리 페이지** (`/super-admin/invites`)로 자동 이동
3. 초대 목록에서 **복사 버튼** 클릭
4. 초대 링크를 수동으로 전달 (카카오톡, 문자 등)

## 이메일 템플릿

발송되는 이메일 내용:

- **제목**: 🎉 연맹 관리자 초대 - [이름]님
- **내용**:
  - 초대자 정보
  - 초대받은 사람 정보 (이름, 이메일, 전화번호)
  - 초대 수락 버튼 (링크)
  - 만료일 안내 (7일)
  - 연맹 관리자 권한 설명

## 문제 해결

### 이메일이 발송되지 않는 경우

1. **Functions 로그 확인**:
   ```bash
   firebase functions:log --only onFederationAdminInviteCreatedV2
   ```

2. **환경 변수 확인**:
   ```bash
   firebase functions:config:get
   ```

3. **Gmail 설정 확인**:
   - 2단계 인증 활성화 여부
   - 앱 비밀번호 정확성
   - Gmail 계정 로그인 상태

4. **Functions 재배포**:
   ```bash
   firebase deploy --only functions --force
   ```

### 스팸 메일함 확인

Gmail에서 발송된 이메일이 스팸으로 분류될 수 있습니다. 수신자에게 스팸 메일함 확인을 요청하세요.

### 발송 제한

Gmail 무료 계정 제한:
- 일일 발송 제한: 500통
- 시간당 제한: 100통

대량 발송이 필요한 경우 SendGrid, AWS SES 등의 서비스 사용을 권장합니다.

## 대안: 다른 이메일 서비스 사용

### SendGrid 사용

```typescript
// functions/src/index.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(functions.config().sendgrid.key);

const msg = {
  to: invite.email,
  from: 'noreply@your-domain.com',
  subject: '연맹 관리자 초대',
  html: emailHtml,
};

await sgMail.send(msg);
```

### AWS SES 사용

```typescript
import AWS from 'aws-sdk';

const ses = new AWS.SES({
  accessKeyId: functions.config().aws.key,
  secretAccessKey: functions.config().aws.secret,
  region: 'ap-northeast-2',
});

await ses.sendEmail({
  Source: 'noreply@your-domain.com',
  Destination: { ToAddresses: [invite.email] },
  Message: {
    Subject: { Data: '연맹 관리자 초대' },
    Body: { Html: { Data: emailHtml } },
  },
}).promise();
```

## 보안 주의사항

1. **앱 비밀번호 노출 금지**: 절대 코드에 하드코딩하지 마세요
2. **환경 변수 사용**: Firebase Functions Config 사용
3. **Git 커밋 주의**: `.runtimeconfig.json` 절대 커밋 금지
4. **정기적 비밀번호 변경**: 3-6개월마다 앱 비밀번호 재생성

## 참고 자료

- [Firebase Functions 환경 설정](https://firebase.google.com/docs/functions/config-env)
- [Gmail 앱 비밀번호 생성](https://support.google.com/accounts/answer/185833)
- [Nodemailer 문서](https://nodemailer.com/)

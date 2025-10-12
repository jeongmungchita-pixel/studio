import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

// 이메일 전송 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email?.user,
    pass: functions.config().email?.pass,
  },
});

// ============================================
// 📧 연맹 관리자 초대 이메일 발송
// ============================================

export const onFederationAdminInviteCreated = functions.firestore
  .document('federationAdminInvites/{inviteId}')
  .onCreate(async (snap, context) => {
    const invite = snap.data();
    const inviteToken = context.params.inviteId;
    
    console.log(`새 연맹 관리자 초대 생성: ${invite.email}`);
    
    // 초대 링크 생성
    const appUrl = functions.config().app?.url || 'http://localhost:9002';
    const inviteLink = `${appUrl}/invite/${inviteToken}`;
    
    // 만료일 포맷
    const expiresAt = new Date(invite.expiresAt);
    const expiresDateStr = expiresAt.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    // 이메일 HTML 템플릿
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .info-box { background: #f9fafb; border-left: 4px solid #667eea; padding: 16px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🎉 연맹 관리자 초대</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">KGF 넥서스</p>
          </div>
          
          <div class="content">
            <h2 style="color: #1f2937; margin-top: 0;">안녕하세요, ${invite.name}님!</h2>
            
            <p style="font-size: 16px; color: #4b5563;">
              <strong>${invite.invitedByName}</strong>님이 귀하를 <strong>KGF 넥서스 연맹 관리자</strong>로 초대하셨습니다.
            </p>
            
            <div class="info-box">
              <p style="margin: 0; font-size: 14px;"><strong>📧 이메일:</strong> ${invite.email}</p>
              <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>👤 이름:</strong> ${invite.name}</p>
              ${invite.phoneNumber ? `<p style="margin: 8px 0 0 0; font-size: 14px;"><strong>📱 전화번호:</strong> ${invite.phoneNumber}</p>` : ''}
            </div>
            
            <p style="font-size: 16px; color: #4b5563;">
              아래 버튼을 클릭하여 초대를 수락하고 계정을 생성하세요:
            </p>
            
            <div style="text-align: center;">
              <a href="${inviteLink}" class="button">초대 수락하기</a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              또는 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br>
              <code style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all;">${inviteLink}</code>
            </p>
            
            <div class="warning">
              ⚠️ <strong>중요:</strong> 이 초대 링크는 <strong>${expiresDateStr}</strong>까지 유효합니다.
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <h3 style="color: #1f2937; font-size: 18px;">연맹 관리자 권한</h3>
            <ul style="color: #4b5563; line-height: 1.8;">
              <li>전체 클럽 및 회원 관리</li>
              <li>대회 및 이벤트 관리</li>
              <li>통계 및 분석 확인</li>
              <li>시스템 설정 관리</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>이 이메일은 KGF 넥서스에서 자동으로 발송되었습니다.</p>
            <p>문의사항이 있으시면 관리자에게 연락해주세요.</p>
            <p style="margin-top: 20px; color: #9ca3af; font-size: 12px;">
              © 2025 KGF 넥서스. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    try {
      // 이메일 발송
      await transporter.sendMail({
        from: `"KGF 넥서스" <${functions.config().email?.user}>`,
        to: invite.email,
        subject: `🎉 연맹 관리자 초대 - ${invite.name}님`,
        html: emailHtml,
      });
      
      console.log(`✅ 초대 이메일 발송 성공: ${invite.email}`);
      console.log(`초대 링크: ${inviteLink}`);
      
      return null;
    } catch (error) {
      console.error('❌ 이메일 발송 실패:', error);
      // 에러가 발생해도 초대는 생성되어 있으므로 수동으로 링크 전달 가능
      return null;
    }
  });

// ============================================
// 📱 단체문자 발송 (네이버 클라우드)
// ============================================

export const sendBulkSMS = functions.https.onCall(async (data, context) => {
  // 인증 확인
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      '로그인이 필요합니다'
    );
  }
  
  const { recipients, message, type } = data;
  
  console.log(`단체문자 발송 요청: ${recipients.length}명`);
  console.log(`메시지 타입: ${type}`);
  console.log(`내용: ${message}`);
  
  // TODO: 네이버 클라우드 SMS API 호출
  // 현재는 시뮬레이션
  
  return {
    success: true,
    totalCount: recipients.length,
    successCount: recipients.length,
    failCount: 0,
    message: '발송 완료 (시뮬레이션)',
  };
});

// ============================================
// 💳 결제 완료 알림
// ============================================

export const onPaymentCompleted = functions.firestore
  .document('payments/{paymentId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // 상태가 completed로 변경된 경우
    if (before.status !== 'completed' && after.status === 'completed') {
      console.log(`결제 완료: ${after.memberName} - ${after.amount}원`);
      
      // TODO: 회원에게 알림 발송
      // TODO: 이용권 자동 갱신
      
      return null;
    }
    
    return null;
  });

// ============================================
// 📊 월별 통계 자동 계산 (매월 1일 자정)
// ============================================

export const calculateMonthlyStats = functions.pubsub
  .schedule('0 0 1 * *')
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    console.log('월별 통계 계산 시작');
    
    // TODO: 모든 클럽의 월별 통계 계산
    // TODO: Firestore에 저장
    
    return null;
  });

// ============================================
// 🔔 초대 만료 체크 (매일 자정)
// ============================================

export const checkExpiredInvites = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    console.log('만료된 초대 확인 시작');
    
    const now = new Date();
    const db = admin.firestore();
    
    // 만료된 초대 찾기
    const expiredInvites = await db
      .collection('federationAdminInvites')
      .where('status', '==', 'pending')
      .where('expiresAt', '<', now.toISOString())
      .get();
    
    // 상태를 expired로 변경
    const batch = db.batch();
    expiredInvites.docs.forEach((doc) => {
      batch.update(doc.ref, { status: 'expired' });
    });
    
    await batch.commit();
    
    console.log(`${expiredInvites.size}개의 초대가 만료되었습니다`);
    
    return null;
  });

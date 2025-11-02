// 알림 타입 정의
export interface Notification {
  id: string;
  userId: string;
  type: 'competition_start' | 'my_turn' | 'result_announced' | 'certificate_issued' | 'general';
  title: string;
  message: string;
  data?: {
    competitionId?: string;
    eventId?: string;
    resultId?: string;
    certificateId?: string;
    actionUrl?: string;
  };
  // 읽음 상태
  isRead: boolean;
  readAt?: string;
  // 전송 상태
  isPushSent: boolean;
  pushSentAt?: string;
  // 메타데이터
  createdAt: string;
  expiresAt?: string;
}

// 알림 설정
export interface NotificationSettings {
  userId: string;
  // 푸시 알림 설정
  pushEnabled: boolean;
  competitionStart: boolean;
  myTurn: boolean;
  resultAnnounced: boolean;
  certificateIssued: boolean;
  general: boolean;
  // 이메일 알림 설정
  emailEnabled: boolean;
  emailCompetitionStart: boolean;
  emailResultAnnounced: boolean;
  emailCertificateIssued: boolean;
  // 메타데이터
  updatedAt: string;
}

// 알림 템플릿
export interface NotificationTemplate {
  type: Notification['type'];
  title: string;
  message: string;
  actionUrl?: string;
}

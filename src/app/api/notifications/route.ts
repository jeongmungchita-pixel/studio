import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { withAuthEnhanced, AuthenticatedRequest } from '@/middleware/auth-enhanced';
import { Notification, NotificationSettings } from '@/types';

// 알림 생성 API
export async function POST(request: NextRequest) {
  return withAuthEnhanced(request, async (_req: AuthenticatedRequest) => {
    try {
      const { userId, type, title, message, data } = await request.json();
      const firestore = getFirestore();
      
      if (!userId || !type || !title || !message) {
        return NextResponse.json({ error: '필수 파라미터가 누락되었습니다' }, { status: 400 });
      }

      // 권한 확인: 본인 또는 관리자만 가능
      if (_req.user?.role !== 'FEDERATION_ADMIN' && _req.user?.role !== 'SUPER_ADMIN' && _req.user?.uid !== userId) {
        return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      }

      // 알림 설정 확인
      const settingsQuery = query(
        collection(firestore, 'notification_settings'),
        where('userId', '==', userId)
      );
      const settingsSnapshot = await getDocs(settingsQuery);
      const settings = settingsSnapshot.docs[0]?.data() as NotificationSettings;

      // 알림 설정에 따라 전송 여부 결정
      if (settings && !shouldSendNotification(settings, type)) {
        return NextResponse.json({ 
          success: false, 
          message: '사용자가 알림을 비활성화했습니다' 
        });
      }

      // 알림 생성
      const notificationRef = doc(collection(firestore, 'notifications'));
      const notification: Notification = {
        id: notificationRef.id,
        userId,
        type,
        title,
        message,
        data,
        isRead: false,
        isPushSent: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30일 후 만료
      };

      await setDoc(notificationRef, notification);

      // 푸시 알림 전송 (Mock - 실제로는 FCM 연동 필요)
      if (settings?.pushEnabled) {
        await sendPushNotification(userId, notification);
        await updateDoc(notificationRef, {
          isPushSent: true,
          pushSentAt: serverTimestamp()
        });
      }

      return NextResponse.json({
        success: true,
        notification
      });

    } catch (error) {
      console.error('알림 생성 실패:', error);
      return NextResponse.json(
        { error: '알림 생성 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }
  });
}

// 알림 조회 API
export async function GET(request: NextRequest) {
  return withAuthEnhanced(request, async (_req: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId') || _req.user?.uid;
      const unreadOnly = searchParams.get('unreadOnly') === 'true';
      const firestore = getFirestore();

      // 권한 확인
      if (_req.user?.role !== 'FEDERATION_ADMIN' && _req.user?.role !== 'SUPER_ADMIN' && _req.user?.uid !== userId) {
        return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      }

      let notificationsQuery = query(
        collection(firestore, 'notifications'),
        where('userId', '==', userId)
      );

      if (unreadOnly) {
        notificationsQuery = query(notificationsQuery, where('isRead', '==', false));
      }

      const notificationsSnapshot = await getDocs(notificationsQuery);
      const notifications = notificationsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Notification))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json({ notifications });

    } catch (error) {
      console.error('알림 조회 실패:', error);
      return NextResponse.json(
        { error: '알림 조회 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }
  });
}

// 알림 읽음 처리 API
export async function PATCH(request: NextRequest) {
  return withAuthEnhanced(request, async (_req: AuthenticatedRequest) => {
    try {
      const { notificationIds, markAllAsRead } = await request.json();
      const firestore = getFirestore();
      
      if (!notificationIds && !markAllAsRead) {
        return NextResponse.json({ error: 'notificationId 또는 markAllAsRead가 필요합니다' }, { status: 400 });
      }

      let notificationsQuery;
      
      if (markAllAsRead) {
        notificationsQuery = query(
          collection(firestore, 'notifications'),
          where('userId', '==', _req.user?.uid),
          where('isRead', '==', false)
        );
      } else {
        notificationsQuery = query(
          collection(firestore, 'notifications'),
          where('__name__', 'in', notificationIds),
          where('userId', '==', _req.user?.uid)
        );
      }

      const notificationsSnapshot = await getDocs(notificationsQuery);
      
      // 일괄 읽음 처리
      const updatePromises = notificationsSnapshot.docs.map(docSnapshot =>
        updateDoc(docSnapshot.ref, {
          isRead: true,
          readAt: serverTimestamp()
        })
      );

      await Promise.all(updatePromises);

      return NextResponse.json({
        success: true,
        updatedCount: notificationsSnapshot.docs.length
      });

    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
      return NextResponse.json(
        { error: '알림 읽음 처리 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }
  });
}

// 알림 설정 조회/업데이트 API
export async function PUT(request: NextRequest) {
  return withAuthEnhanced(request, async (_req: AuthenticatedRequest) => {
    try {
      const settings = await request.json();
      const firestore = getFirestore();
      
      // 본인 설정만 수정 가능
      if (settings.userId !== _req.user?.uid) {
        return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      }

      const settingsRef = doc(firestore, 'notification_settings', _req.user?.uid || '');
      
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: serverTimestamp()
      }, { merge: true });

      return NextResponse.json({
        success: true,
        settings
      });

    } catch (error) {
      console.error('알림 설정 업데이트 실패:', error);
      return NextResponse.json(
        { error: '알림 설정 업데이트 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }
  });
}

// 알림 전송 여부 확인
function shouldSendNotification(settings: NotificationSettings, type: Notification['type']): boolean {
  switch (type) {
    case 'competition_start':
      return settings.competitionStart;
    case 'my_turn':
      return settings.myTurn;
    case 'result_announced':
      return settings.resultAnnounced;
    case 'certificate_issued':
      return settings.certificateIssued;
    case 'general':
      return settings.general;
    default:
      return false;
  }
}

// 푸시 알림 전송 (Mock)
async function sendPushNotification(userId: string, notification: Notification): Promise<void> {
  // TODO: 실제 FCM 연동
  console.log('Push notification sent:', {
    userId,
    title: notification.title,
    message: notification.message,
    data: notification.data
  });
}

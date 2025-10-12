# KGF 넥서스 - 데이터 구조 문서

> 최종 업데이트: 2025-10-12

---

## 📊 Firestore 컬렉션 구조

### 🎯 핵심 컬렉션

#### 1. `/users/{userId}`
**용도**: 사용자 프로필 및 인증 정보
**필드**:
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  clubId?: string;
  clubName?: string;
  phoneNumber?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}
```
**인덱스**: `role`, `status`, `clubId`

---

#### 2. `/clubs/{clubId}`
**용도**: 클럽 정보
**필드**:
```typescript
{
  id: string;
  name: string;
  address?: string;
  contactEmail?: string;
  contactPhoneNumber?: string;
  location?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
```
**인덱스**: `ownerId`

---

#### 3. `/members/{memberId}`
**용도**: 클럽 회원 정보 (자녀 포함)
**필드**:
```typescript
{
  id: string;
  name: string;
  clubId: string;
  userId?: string; // 연결된 사용자 계정
  guardianIds?: string[]; // 부모 UID 배열
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  email?: string;
  phoneNumber?: string;
  status: 'active' | 'inactive' | 'pending';
  memberType?: 'individual' | 'family';
  familyRole?: 'parent' | 'child';
  activePassId?: string;
  classId?: string;
  createdAt: string;
  updatedAt: string;
}
```
**인덱스**: `clubId`, `status`, `guardianIds`, `userId`

---

#### 4. `/member_passes/{passId}`
**용도**: 회원 이용권
**필드**:
```typescript
{
  id: string;
  memberId: string;
  clubId: string;
  passName: string;
  passType: 'period' | 'session' | 'unlimited';
  startDate?: string;
  endDate?: string;
  totalSessions?: number;
  attendableSessions?: number;
  remainingSessions?: number;
  attendanceCount?: number;
  status: 'active' | 'expired' | 'pending';
  createdAt: string;
  updatedAt: string;
}
```
**인덱스**: `memberId`, `clubId`, `status`

---

#### 5. `/pass_templates/{templateId}`
**용도**: 이용권 템플릿
**필드**:
```typescript
{
  id: string;
  clubId: string;
  name: string;
  passType: 'period' | 'session' | 'unlimited';
  totalSessions?: number;
  attendableSessions?: number;
  durationDays?: number;
  price?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
```
**인덱스**: `clubId`

---

#### 6. `/classes/{classId}`
**용도**: 수업 정보
**필드**:
```typescript
{
  id: string;
  clubId: string;
  name: string;
  dayOfWeek: '월' | '화' | '수' | '목' | '금' | '토' | '일';
  time: string;
  capacity: number;
  memberIds: string[];
  coachId?: string;
  createdAt: string;
  updatedAt: string;
}
```
**인덱스**: `clubId`, `coachId`
**참고**: `gym_classes`는 deprecated, `classes` 사용

---

#### 7. `/attendance/{attendanceId}`
**용도**: 출석 기록
**필드**:
```typescript
{
  id: string;
  memberId: string;
  clubId: string;
  classId?: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  note?: string;
  createdAt: string;
}
```
**인덱스**: `memberId`, `clubId`, `date`

---

#### 8. `/payments/{paymentId}`
**용도**: 결제 정보
**필드**:
```typescript
{
  id: string;
  clubId: string;
  memberId?: string;
  type: 'pass' | 'event' | 'competition' | 'level_test' | 'other';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  relatedId?: string; // 관련 이용권/이벤트 ID
  paidAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}
```
**인덱스**: `clubId`, `status`, `memberId`

---

### 🎪 이벤트 & 대회

#### 9. `/events/{eventId}`
**용도**: 클럽 이벤트 (상품, 특별수업 등)
**필드**:
```typescript
{
  id: string;
  clubId: string;
  title: string;
  description: string;
  eventType: 'merchandise' | 'uniform' | 'special_class' | 'competition' | 'event' | 'other';
  price: number;
  registrationStart: string;
  registrationEnd: string;
  eventDate?: string;
  maxParticipants?: number;
  currentParticipants: number;
  status: 'upcoming' | 'open' | 'closed' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}
```
**인덱스**: `clubId`, `status`

---

#### 10. `/event_registrations/{registrationId}`
**용도**: 이벤트 신청
**필드**:
```typescript
{
  id: string;
  eventId: string;
  memberId: string;
  clubId: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  registeredAt: string;
}
```
**인덱스**: `eventId`, `memberId`, `clubId`

---

#### 11. `/competitions/{competitionId}`
**용도**: 대회 정보
**필드**:
```typescript
{
  id: string;
  name: string;
  date: string;
  location: string;
  organizerId: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}
```
**인덱스**: `status`, `date`

---

#### 12. `/level_tests/{testId}`
**용도**: 승급 심사
**필드**:
```typescript
{
  id: string;
  clubId: string;
  testName: string;
  testDate: string;
  location?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}
```
**인덱스**: `clubId`, `status`, `testDate`

---

#### 13. `/level_test_registrations/{registrationId}`
**용도**: 승급 심사 신청
**필드**:
```typescript
{
  id: string;
  testId: string;
  memberId: string;
  currentLevel?: string;
  targetLevel?: string;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: string;
}
```
**인덱스**: `testId`, `memberId`

---

### 📢 커뮤니케이션

#### 14. `/announcements/{announcementId}`
**용도**: 공지사항
**필드**:
```typescript
{
  id: string;
  clubId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}
```
**인덱스**: `clubId`, `isPinned`, `createdAt`

---

#### 15. `/message_history/{messageId}`
**용도**: SMS 발송 기록
**필드**:
```typescript
{
  id: string;
  clubId: string;
  type: 'sms' | 'lms' | 'kakao';
  content: string;
  recipients: Array<{
    memberId: string;
    memberName: string;
    phone: string;
    status: 'pending' | 'success' | 'failed';
  }>;
  totalCount: number;
  successCount: number;
  failCount: number;
  sentBy: string;
  sentByName: string;
  createdAt: string;
}
```
**인덱스**: `clubId`, `createdAt`

---

### 📸 미디어

#### 16. `/media/{mediaId}`
**용도**: 사진/영상
**필드**:
```typescript
{
  id: string;
  memberId: string;
  clubId: string;
  mediaType: 'image' | 'video';
  mediaURL: string;
  thumbnailURL?: string;
  uploadDate: string;
  caption?: string;
  tags?: string[];
}
```
**인덱스**: `memberId`, `clubId`, `uploadDate`

---

### 🔐 승인 & 요청

#### 17. `/clubOwnerRequests/{requestId}`
**용도**: 클럽 오너 승인 요청
**필드**:
```typescript
{
  id: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  clubName: string;
  clubAddress?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt?: string;
}
```
**인덱스**: `status`, `userId`

---

#### 18. `/superAdminRequests/{requestId}`
**용도**: 슈퍼 관리자 승인 요청
**필드**:
```typescript
{
  id: string;
  userId: string;
  name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}
```
**인덱스**: `status`

---

#### 19. `/federationAdminInvites/{inviteId}`
**용도**: 연맹 관리자 초대
**필드**:
```typescript
{
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  token: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: string;
  invitedAt: string;
}
```
**인덱스**: `status`, `token`

---

#### 20. `/pass_renewal_requests/{requestId}`
**용도**: 이용권 갱신 요청
**필드**:
```typescript
{
  id: string;
  memberId: string;
  memberName: string;
  clubId: string;
  passTemplateId: string;
  passTemplateName: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  rejectionReason?: string;
}
```
**인덱스**: `clubId`, `status`, `memberId`

---

#### 21. `/memberRequests/{requestId}`
**용도**: 회원 가입 요청
**필드**:
```typescript
{
  id: string;
  userId: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  clubId: string;
  clubName: string;
  memberType: 'individual' | 'family';
  familyRole?: 'parent' | 'child';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}
```
**인덱스**: `clubId`, `status`, `userId`

---

### 🏛️ 위원회

#### 22. `/committees/{committeeId}`
**용도**: 위원회 정보
**필드**:
```typescript
{
  id: string;
  name: string;
  type: 'COMPETITION' | 'EDUCATION' | 'MARKETING';
  description?: string;
  chairId?: string;
  createdAt: string;
  updatedAt: string;
}
```
**인덱스**: `type`

---

## 🔍 데이터 구조 일관성 규칙

### ✅ 권장 사항

1. **컬렉션 이름**
   - 복수형 사용 (`members`, `classes`, `events`)
   - 언더스코어 사용 (`member_passes`, `level_tests`)
   - ❌ `gym_classes` (deprecated) → ✅ `classes`

2. **필수 필드**
   - `id`: 문서 ID
   - `createdAt`: 생성 시간 (ISO 8601)
   - `updatedAt`: 수정 시간 (선택적)

3. **clubId 필드**
   - 클럽 관련 데이터는 **필수**로 `clubId` 포함
   - 전역 데이터 (`users`, `clubs`, `competitions`)는 제외

4. **status 필드**
   - 상태가 있는 데이터는 `status` 필드 사용
   - 일관된 값: `pending`, `active`, `completed`, `cancelled` 등

5. **날짜 형식**
   - ISO 8601 문자열 사용 (`2025-10-12T18:00:00.000Z`)
   - Firestore Timestamp 대신 문자열 권장 (직렬화 용이)

---

## 🚫 Deprecated 컬렉션

- ❌ `/gym_classes` → ✅ `/classes` 사용
- ❌ `/clubs/{clubId}/members` (서브컬렉션) → ✅ `/members` (전역) 사용

---

## 📈 쿼리 최적화 가이드

### 인덱스가 필요한 쿼리

```typescript
// ✅ 좋은 예: 복합 인덱스 사용
query(
  collection(firestore, 'members'),
  where('clubId', '==', clubId),
  where('status', '==', 'active'),
  orderBy('createdAt', 'desc')
);
// 필요 인덱스: clubId + status + createdAt

// ❌ 나쁜 예: 전체 조회 후 필터링
const allMembers = await getDocs(collection(firestore, 'members'));
const filtered = allMembers.filter(m => m.clubId === clubId);
```

### 자주 사용하는 쿼리 패턴

1. **클럽별 데이터 조회**
```typescript
where('clubId', '==', user.clubId)
```

2. **사용자별 데이터 조회**
```typescript
where('userId', '==', user.uid)
// 또는
where('guardianIds', 'array-contains', user.uid)
```

3. **상태별 필터링**
```typescript
where('status', '==', 'pending')
```

---

## 🔄 마이그레이션 TODO

- [ ] `gym_classes` → `classes` 데이터 이전
- [ ] 서브컬렉션 제거 (사용 중인 경우)
- [ ] `clubId` 필드 일관성 확인
- [ ] 인덱스 최적화

---

**참고 문서**:
- `docs/backend.json` - 원본 데이터 스키마
- `src/types/index.ts` - TypeScript 타입 정의
- `firestore.rules` - 보안 규칙

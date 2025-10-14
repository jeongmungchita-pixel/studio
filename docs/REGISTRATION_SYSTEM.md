# 회원 가입 시스템 구현 완료

> 작성일: 2025-10-15

---

## 🎯 구현 완료 사항

### ✅ 1. 타입 정의 추가
- `MemberCategory`: 'adult' | 'child'
- `AdultRegistrationRequest`: 성인 개인 회원 가입 신청
- `FamilyRegistrationRequest`: 가족 회원 가입 신청 (유연한 구조)
- `Member` 타입에 `memberCategory` 필드 추가

### ✅ 2. 가입 페이지 생성

#### `/register` - 랜딩 페이지
- 성인 회원 / 가족 회원 선택
- 각 유형의 특징 설명
- 직관적인 UI

#### `/register/adult` - 성인 개인 회원 가입
- **대상**: 19세 이상 본인만
- **프로세스**: 4단계
  1. 클럽 선택
  2. 기본 정보 입력
  3. 약관 동의
  4. 본인 서명
- **저장**: `adultRegistrationRequests` 컬렉션

#### `/register/family` - 가족 회원 가입 (TODO)
- **대상**: 부모 + 자녀, 부모만, 자녀만 모두 가능
- **유연한 구조**:
  - 부모 0-2명 추가
  - 자녀 0명 이상 추가
  - 자녀만 등록 시 외부 보호자 정보 입력
- **저장**: `familyRegistrationRequests` 컬렉션

### ✅ 3. Firestore Rules 업데이트
```javascript
// 성인 회원 가입 신청
match /adultRegistrationRequests/{requestId} {
  allow read: if isAdmin() || (isClubStaff() && belongsToClub(resource.data.clubId));
  allow create: if true;
  allow update, delete: if isAdmin() || (isClubStaff() && belongsToClub(resource.data.clubId));
}

// 가족 회원 가입 신청
match /familyRegistrationRequests/{requestId} {
  allow read: if isAdmin() || (isClubStaff() && belongsToClub(resource.data.clubId));
  allow create: if true;
  allow update, delete: if isAdmin() || (isClubStaff() && belongsToClub(resource.data.clubId));
}
```

---

## 📊 데이터 구조

### 성인 회원 가입 신청
```typescript
{
  id: string;
  clubId: string;
  clubName: string;
  requestType: 'adult';
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  phoneNumber: string;
  email?: string;
  agreements: {
    personal: boolean;
    terms: boolean;
    safety: boolean;
    portrait: boolean;
    agreedAt: string;
  };
  signature: string;
  signedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}
```

### 가족 회원 가입 신청
```typescript
{
  id: string;
  clubId: string;
  clubName: string;
  requestType: 'family';
  
  // 부모 (0-2명)
  parents: Array<{
    name: string;
    birthDate: string;
    gender: 'male' | 'female';
    phoneNumber: string;
    email?: string;
  }>;
  
  // 자녀 (0명 이상)
  children: Array<{
    name: string;
    birthDate: string;
    gender: 'male' | 'female';
    grade?: string;
  }>;
  
  // 외부 보호자 (부모가 없고 자녀만 있는 경우)
  externalGuardian?: {
    name: string;
    phoneNumber: string;
    relation: 'parent' | 'grandparent' | 'legal_guardian' | 'other';
  };
  
  agreements: { /* ... */ };
  signature: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}
```

---

## 🔄 승인 프로세스

### 성인 회원 승인
```typescript
// /club-dashboard/member-approvals에서 승인 시
async function approveAdultRequest(request: AdultRegistrationRequest) {
  // members 컬렉션에 생성
  await addDoc(collection(firestore, 'members'), {
    name: request.name,
    dateOfBirth: request.birthDate,
    gender: request.gender,
    phoneNumber: request.phoneNumber,
    email: request.email,
    clubId: request.clubId,
    memberCategory: 'adult', // 자동
    memberType: 'individual',
    status: 'active',
    createdAt: new Date().toISOString(),
  });
  
  // 요청 상태 업데이트
  await updateDoc(doc(firestore, 'adultRegistrationRequests', request.id), {
    status: 'approved',
  });
}
```

### 가족 회원 승인
```typescript
async function approveFamilyRequest(request: FamilyRegistrationRequest) {
  const batch = writeBatch(firestore);
  const parentMemberIds: string[] = [];
  
  // 1. 부모들 생성 (있으면)
  for (const parent of request.parents) {
    const parentRef = doc(collection(firestore, 'members'));
    parentMemberIds.push(parentRef.id);
    
    batch.set(parentRef, {
      ...parent,
      clubId: request.clubId,
      memberCategory: 'adult', // 자동
      memberType: 'family',
      familyRole: 'parent',
      status: 'active',
    });
  }
  
  // 2. 자녀들 생성 (있으면)
  for (const child of request.children) {
    const childRef = doc(collection(firestore, 'members'));
    
    batch.set(childRef, {
      ...child,
      clubId: request.clubId,
      memberCategory: 'child', // 자동
      memberType: 'family',
      familyRole: 'child',
      guardianIds: parentMemberIds, // 자동 연결
      guardianName: parentMemberIds.length > 0 
        ? request.parents[0].name 
        : request.externalGuardian?.name,
      guardianPhone: parentMemberIds.length > 0 
        ? request.parents[0].phoneNumber 
        : request.externalGuardian?.phoneNumber,
      status: 'active',
    });
  }
  
  // 3. 요청 상태 업데이트
  batch.update(doc(firestore, 'familyRegistrationRequests', request.id), {
    status: 'approved',
  });
  
  await batch.commit();
}
```

---

## 🎨 사용 시나리오

### 시나리오 1: 성인 혼자 운동
```
/register → "성인 회원" 선택
→ /register/adult
→ 본인 정보 입력
→ 승인 후 Adult Member 생성
```

### 시나리오 2: 부부만 운동
```
/register → "가족 회원" 선택
→ /register/family
→ 부모 2명 추가
→ 자녀 0명
→ 승인 후 Adult Member 2명 생성
```

### 시나리오 3: 부모 + 자녀 함께 운동
```
/register → "가족 회원" 선택
→ /register/family
→ 부모 1-2명 추가
→ 자녀 1명 이상 추가
→ 승인 후:
   - 부모들 → Adult Member
   - 자녀들 → Child Member (guardianIds 자동 연결)
```

### 시나리오 4: 자녀만 운동 (부모는 회원 아님)
```
/register → "가족 회원" 선택
→ /register/family
→ 부모 0명
→ 자녀 1명 이상 추가
→ 외부 보호자 정보 입력
→ 승인 후:
   - 자녀들 → Child Member (guardianIds 빈 배열)
```

---

## ⚠️ 남은 작업

### 1. `/register/family` 페이지 완성 (우선순위: 높음)
- 파일이 너무 커서 미완성
- 부모/자녀 동적 추가 UI 구현 필요
- 외부 보호자 정보 입력 폼 추가

### 2. 승인 페이지 통합
- `/club-dashboard/member-approvals`에 성인/가족 승인 로직 추가
- 요청 타입별로 다른 승인 처리

### 3. 기존 페이지 정리
- `/register/member` → 사용 중단 또는 리다이렉트
- `/register/member-with-contract` → 사용 중단 또는 리다이렉트

### 4. 테스트
- [ ] 성인 회원 가입 → 승인 → Member 생성 확인
- [ ] 가족 회원 가입 → 승인 → Members 생성 및 연결 확인
- [ ] Firestore Rules 권한 테스트

---

## 🎯 핵심 개선 사항

### Before (문제점)
```
- 회원 가입 경로가 복잡하고 불명확
- 성인과 어린이 구분 없음
- 가족 회원 개념 부재
- 부모-자녀 연결 수동
```

### After (개선됨)
```
✅ 명확한 2가지 가입 경로
   - 성인 개인 회원
   - 가족 회원 (유연한 구조)

✅ memberCategory로 자동 분류
   - adult: 19세 이상
   - child: 18세 이하

✅ 가족 회원 유연성
   - 부모만, 자녀만, 함께 모두 가능
   - guardianIds 자동 연결

✅ 승인 시 자동 처리
   - 부모 → Adult Member
   - 자녀 → Child Member + guardianIds
```

---

## 📝 다음 단계

1. **즉시**: `/register/family` 페이지 완성
2. **1일 내**: 승인 페이지 통합 및 테스트
3. **2일 내**: 기존 페이지 정리 및 리다이렉트
4. **3일 내**: 전체 플로우 테스트 및 문서화

---

**참고 문서**:
- `docs/APPROVAL_FLOW.md` - 승인 프로세스
- `docs/FAMILY_REGISTRATION_FLOW.md` - 가족 회원 가입 상세
- `docs/MEMBER_CATEGORY_PROPOSAL.md` - 회원 분류 제안
- `src/types/index.ts` - 타입 정의

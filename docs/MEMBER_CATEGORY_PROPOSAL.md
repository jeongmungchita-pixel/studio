# 회원 분류 체계 개선 제안

> 작성일: 2025-10-15

---

## 🎯 목표

체육관에서 **성인과 아이들을 명확히 구분**하여 관리하고, 각 연령대에 맞는 가입 프로세스 제공

---

## 📊 회원 분류 체계

### 1. 연령대별 분류

| 분류 | 연령 | 보호자 정보 | 특징 |
|------|------|-------------|------|
| **성인 (Adult)** | 19세 이상 | 불필요 | 본인 명의 가입, 독립적 관리 |
| **청소년 (Youth)** | 14-18세 | 필수 | 보호자 동의 필요, 일부 자율성 |
| **어린이 (Child)** | 13세 이하 | 필수 | 보호자 전적 관리, 안전 중시 |

### 2. 데이터 구조

```typescript
export type MemberCategory = 'adult' | 'youth' | 'child';

export type Member = {
  // ... 기존 필드
  
  // 새로 추가
  memberCategory: MemberCategory; // 회원 분류
  ageAtRegistration?: number; // 가입 당시 나이
  
  // 기존 필드 활용
  isMinor: boolean; // 미성년자 여부 (19세 미만)
  guardianIds?: string[]; // 보호자 UID 배열
  guardianName?: string; // 보호자 이름 (비정규화)
  guardianPhone?: string; // 보호자 연락처 (비정규화)
}
```

---

## 🚀 가입 프로세스 개선

### A안: 통합 페이지 (현재 방식 개선)

**`/register/member-with-contract`**

```
1. 생년월일 입력
   ↓
2. 자동으로 연령대 판단
   - 19세 이상 → 성인 프로세스
   - 14-18세 → 청소년 프로세스 (보호자 정보 필수)
   - 13세 이하 → 어린이 프로세스 (보호자 정보 필수)
   ↓
3. 해당 연령대에 맞는 폼 표시
   ↓
4. 약관 동의 및 서명
   - 성인: 본인 서명
   - 청소년/어린이: 보호자 서명
```

**장점**: 
- 기존 코드 최소 수정
- 사용자 혼란 최소화

**단점**:
- 한 페이지에 모든 로직 집중

---

### B안: 분리된 가입 페이지 (추천)

#### 1. 랜딩 페이지: `/register`

```tsx
// 회원 유형 선택
<div className="grid gap-4 md:grid-cols-3">
  <Card onClick={() => router.push('/register/adult')}>
    <CardHeader>
      <User className="h-12 w-12" />
      <CardTitle>성인 회원</CardTitle>
      <CardDescription>19세 이상</CardDescription>
    </CardHeader>
  </Card>
  
  <Card onClick={() => router.push('/register/youth')}>
    <CardHeader>
      <Users className="h-12 w-12" />
      <CardTitle>청소년 회원</CardTitle>
      <CardDescription>14-18세 (보호자 동의 필요)</CardDescription>
    </CardHeader>
  </Card>
  
  <Card onClick={() => router.push('/register/child')}>
    <CardHeader>
      <Baby className="h-12 w-12" />
      <CardTitle>어린이 회원</CardTitle>
      <CardDescription>13세 이하 (보호자 필수)</CardDescription>
    </CardHeader>
  </Card>
</div>
```

#### 2. 성인 가입: `/register/adult`

**간소화된 프로세스**
```
Step 1: 기본 정보
  - 이름, 생년월일, 성별, 연락처
  
Step 2: 클럽 선택
  - 가입할 체육관 선택
  
Step 3: 약관 동의
  - 개인정보 수집 동의
  - 시설 이용 약관
  - 안전사고 면책 동의
  
Step 4: 본인 서명
  - 전자 서명
```

#### 3. 청소년 가입: `/register/youth`

**보호자 정보 포함**
```
Step 1: 회원 기본 정보
  - 이름, 생년월일, 성별, 연락처
  
Step 2: 보호자 정보
  - 보호자 이름, 관계, 연락처
  
Step 3: 클럽 선택
  
Step 4: 약관 동의
  - 개인정보 수집 동의 (보호자)
  - 시설 이용 약관
  - 안전사고 면책 동의
  - 초상권 활용 동의
  
Step 5: 보호자 서명
  - 보호자 전자 서명
```

#### 4. 어린이 가입: `/register/child`

**보호자 중심 프로세스**
```
Step 1: 보호자 정보 먼저
  - 보호자 이름, 관계, 연락처
  - 보호자 신분증 인증 (선택)
  
Step 2: 어린이 정보
  - 이름, 생년월일, 성별
  - 학교, 학년 (선택)
  
Step 3: 건강 정보 (선택)
  - 알레르기, 지병, 응급 연락처
  
Step 4: 클럽 선택
  
Step 5: 약관 동의
  - 개인정보 수집 동의 (보호자)
  - 시설 이용 약관
  - 안전사고 면책 동의
  - 초상권 활용 동의
  - 건강 정보 제공 동의
  
Step 6: 보호자 서명
```

**장점**:
- 각 연령대에 최적화된 UX
- 명확한 프로세스 구분
- 향후 확장 용이

**단점**:
- 초기 개발 비용 증가
- 3개 페이지 유지보수

---

## 🎨 관리 화면 개선

### 1. 회원 목록 필터링

```tsx
// /club-dashboard/members/page.tsx

<Tabs defaultValue="all">
  <TabsList>
    <TabsTrigger value="all">
      전체 ({allMembers.length})
    </TabsTrigger>
    <TabsTrigger value="adult">
      성인 ({adultMembers.length})
    </TabsTrigger>
    <TabsTrigger value="youth">
      청소년 ({youthMembers.length})
    </TabsTrigger>
    <TabsTrigger value="child">
      어린이 ({childMembers.length})
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="all">
    {/* 전체 회원 목록 */}
  </TabsContent>
  
  <TabsContent value="adult">
    {/* 성인 회원만 */}
  </TabsContent>
  
  {/* ... */}
</Tabs>
```

### 2. 회원 카드에 배지 표시

```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar />
        <div>
          <CardTitle>{member.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {calculateAge(member.dateOfBirth)}세
          </p>
        </div>
      </div>
      
      {/* 연령대 배지 */}
      <Badge variant={getBadgeVariant(member.memberCategory)}>
        {getCategoryLabel(member.memberCategory)}
      </Badge>
    </div>
  </CardHeader>
</Card>
```

### 3. 통계 대시보드

```tsx
// /club-dashboard/page.tsx

<div className="grid gap-4 md:grid-cols-4">
  <Card>
    <CardHeader>
      <CardTitle>전체 회원</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{totalMembers}</div>
    </CardContent>
  </Card>
  
  <Card>
    <CardHeader>
      <CardTitle>성인</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{adultCount}</div>
      <p className="text-xs text-muted-foreground">
        {((adultCount / totalMembers) * 100).toFixed(1)}%
      </p>
    </CardContent>
  </Card>
  
  <Card>
    <CardHeader>
      <CardTitle>청소년</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{youthCount}</div>
    </CardContent>
  </Card>
  
  <Card>
    <CardHeader>
      <CardTitle>어린이</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{childCount}</div>
    </CardContent>
  </Card>
</div>
```

---

## 🔧 구현 단계

### Phase 1: 데이터 구조 개선 (1-2일)
- [ ] `Member` 타입에 `memberCategory` 필드 추가
- [ ] 기존 회원 데이터 마이그레이션 스크립트
- [ ] Firestore Rules 업데이트

### Phase 2: 가입 프로세스 개선 (3-5일)
- [ ] `/register` 랜딩 페이지 생성
- [ ] `/register/adult` 성인 가입 페이지
- [ ] `/register/youth` 청소년 가입 페이지
- [ ] `/register/child` 어린이 가입 페이지
- [ ] 기존 `/register/member-with-contract` 리다이렉트 처리

### Phase 3: 관리 화면 개선 (2-3일)
- [ ] 회원 목록 필터링 추가
- [ ] 회원 카드 배지 표시
- [ ] 대시보드 통계 추가
- [ ] 승인 화면에 연령대 표시

### Phase 4: 추가 기능 (선택)
- [ ] 연령대별 이용권 템플릿
- [ ] 연령대별 수업 배정
- [ ] 보호자 포털 (자녀 관리)
- [ ] 안전 관리 기능 (어린이 대상)

---

## 📋 마이그레이션 전략

### 기존 회원 데이터 처리

```typescript
// scripts/migrate-member-categories.ts

async function migrateMemberCategories() {
  const membersSnapshot = await getDocs(collection(firestore, 'members'));
  
  const batch = writeBatch(firestore);
  
  membersSnapshot.forEach((doc) => {
    const member = doc.data();
    const age = calculateAge(member.dateOfBirth);
    
    let memberCategory: MemberCategory;
    if (age >= 19) {
      memberCategory = 'adult';
    } else if (age >= 14) {
      memberCategory = 'youth';
    } else {
      memberCategory = 'child';
    }
    
    batch.update(doc.ref, {
      memberCategory,
      ageAtRegistration: age,
    });
  });
  
  await batch.commit();
  console.log('Migration completed!');
}
```

---

## 🎯 권장 사항

### 즉시 적용 (최소 변경)
1. ✅ `Member` 타입에 `memberCategory` 필드 추가
2. ✅ 기존 가입 페이지에서 자동 분류
3. ✅ 회원 목록에 필터 추가

### 단계적 적용 (완전한 개선)
1. ✅ Phase 1 완료 후 운영
2. ✅ Phase 2 개발 및 테스트
3. ✅ Phase 3 관리 화면 개선
4. ⏳ Phase 4는 필요시 추가

---

## 💡 추가 고려사항

### 1. 보호자 계정 시스템
```
보호자 계정 생성
  ↓
자녀 등록 (여러 명 가능)
  ↓
보호자 포털에서 자녀 관리
  - 출석 확인
  - 이용권 갱신
  - 공지사항 확인
```

### 2. 연령대별 차별화
- **성인**: 자율 출석, 온라인 예약
- **청소년**: 부분 자율, 보호자 알림
- **어린이**: 보호자 전적 관리, 안전 중시

### 3. 법적 요구사항
- 만 14세 미만: 법정대리인 동의 필수
- 개인정보 보호법 준수
- 안전사고 대응 매뉴얼

---

## 📊 예상 효과

### 운영 효율성
- ✅ 연령대별 맞춤 관리
- ✅ 보호자 커뮤니케이션 개선
- ✅ 안전사고 예방

### 사용자 경험
- ✅ 명확한 가입 프로세스
- ✅ 연령대에 맞는 UX
- ✅ 보호자 안심

### 비즈니스
- ✅ 연령대별 마케팅
- ✅ 맞춤형 프로그램 운영
- ✅ 회원 만족도 향상

---

**다음 단계**: 어떤 방식으로 진행하시겠습니까?
- A안: 최소 변경 (현재 시스템 개선)
- B안: 완전한 개선 (분리된 가입 페이지)

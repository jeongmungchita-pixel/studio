# 가족 회원 가입 프로세스

> 작성일: 2025-10-15

---

## 🎯 목표

**부모와 자녀를 한번에 등록**하여 가족 단위 운동을 지원하고, 관리를 편리하게 함

---

## 📊 가족 회원 구조

```
Family (가족 단위)
├─ Parent 1 (부모1) → 자동으로 Adult Member 생성
├─ Parent 2 (부모2, 선택) → 자동으로 Adult Member 생성
└─ Children (자녀들)
   ├─ Child 1 → Child Member 생성, guardianIds 자동 연결
   ├─ Child 2 → Child Member 생성, guardianIds 자동 연결
   └─ Child 3 → Child Member 생성, guardianIds 자동 연결
```

---

## 🚀 가입 프로세스 상세

### Step 1: 클럽 선택
```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="가입할 체육관을 선택하세요" />
  </SelectTrigger>
  <SelectContent>
    {clubs.map(club => (
      <SelectItem key={club.id} value={club.id}>
        {club.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

### Step 2: 부모 정보 입력

```tsx
<Card>
  <CardHeader>
    <CardTitle>부모 정보</CardTitle>
    <CardDescription>
      가족 대표 회원 정보를 입력하세요
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* 부모 1 (필수) */}
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-3">부모 1 (필수)</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>이름 *</Label>
          <Input placeholder="홍길동" />
        </div>
        <div>
          <Label>생년월일 *</Label>
          <Input type="date" />
        </div>
        <div>
          <Label>성별 *</Label>
          <RadioGroup>
            <RadioGroupItem value="male" label="남성" />
            <RadioGroupItem value="female" label="여성" />
          </RadioGroup>
        </div>
        <div>
          <Label>연락처 *</Label>
          <Input type="tel" placeholder="010-1234-5678" />
        </div>
        <div>
          <Label>이메일</Label>
          <Input type="email" placeholder="example@email.com" />
        </div>
      </div>
    </div>

    {/* 부모 2 (선택) */}
    <div className="p-4 border rounded-lg border-dashed">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">부모 2 (선택)</h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowParent2(!showParent2)}
        >
          {showParent2 ? '제거' : '추가'}
        </Button>
      </div>
      
      {showParent2 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* 부모 1과 동일한 필드 */}
        </div>
      )}
    </div>
  </CardContent>
</Card>
```

---

### Step 3: 자녀 정보 입력

```tsx
<Card>
  <CardHeader>
    <CardTitle>자녀 정보</CardTitle>
    <CardDescription>
      운동할 자녀들의 정보를 입력하세요
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {children.map((child, index) => (
      <div key={index} className="p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">자녀 {index + 1}</h3>
          {index > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeChild(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>이름 *</Label>
            <Input 
              placeholder="홍아이" 
              value={child.name}
              onChange={(e) => updateChild(index, 'name', e.target.value)}
            />
          </div>
          <div>
            <Label>생년월일 *</Label>
            <Input 
              type="date"
              value={child.birthDate}
              onChange={(e) => updateChild(index, 'birthDate', e.target.value)}
            />
          </div>
          <div>
            <Label>성별 *</Label>
            <RadioGroup 
              value={child.gender}
              onValueChange={(val) => updateChild(index, 'gender', val)}
            >
              <RadioGroupItem value="male" label="남성" />
              <RadioGroupItem value="female" label="여성" />
            </RadioGroup>
          </div>
          <div>
            <Label>학년 (선택)</Label>
            <Select 
              value={child.grade}
              onValueChange={(val) => updateChild(index, 'grade', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="학년 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kindergarten">유치원</SelectItem>
                <SelectItem value="elementary-1">초등 1학년</SelectItem>
                <SelectItem value="elementary-2">초등 2학년</SelectItem>
                {/* ... */}
                <SelectItem value="high-3">고등 3학년</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    ))}
    
    <Button
      variant="outline"
      className="w-full"
      onClick={addChild}
    >
      <Plus className="h-4 w-4 mr-2" />
      자녀 추가
    </Button>
  </CardContent>
</Card>
```

---

### Step 4: 약관 동의

```tsx
<Card>
  <CardHeader>
    <CardTitle>약관 동의</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex items-start space-x-2">
      <Checkbox id="all" onCheckedChange={handleAgreeAll} />
      <Label htmlFor="all" className="font-semibold">
        전체 동의
      </Label>
    </div>
    
    <Separator />
    
    <div className="space-y-3">
      <div className="flex items-start space-x-2">
        <Checkbox id="personal" checked={agreements.personal} />
        <div className="flex-1">
          <Label htmlFor="personal">
            개인정보 수집 및 이용 동의 (필수)
          </Label>
          <Button variant="link" size="sm">상세보기</Button>
        </div>
      </div>
      
      <div className="flex items-start space-x-2">
        <Checkbox id="terms" checked={agreements.terms} />
        <div className="flex-1">
          <Label htmlFor="terms">
            체육시설 이용 약관 동의 (필수)
          </Label>
          <Button variant="link" size="sm">상세보기</Button>
        </div>
      </div>
      
      <div className="flex items-start space-x-2">
        <Checkbox id="safety" checked={agreements.safety} />
        <div className="flex-1">
          <Label htmlFor="safety">
            안전사고 면책 동의 (필수)
          </Label>
          <Button variant="link" size="sm">상세보기</Button>
        </div>
      </div>
      
      <div className="flex items-start space-x-2">
        <Checkbox id="portrait" checked={agreements.portrait} />
        <div className="flex-1">
          <Label htmlFor="portrait">
            초상권 활용 동의 (선택)
          </Label>
          <Button variant="link" size="sm">상세보기</Button>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

---

### Step 5: 서명

```tsx
<Card>
  <CardHeader>
    <CardTitle>보호자 서명</CardTitle>
    <CardDescription>
      아래 서명란에 서명해주세요
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="border-2 border-dashed rounded-lg p-4">
      <SignatureCanvas
        ref={signatureRef}
        canvasProps={{
          className: 'w-full h-40 border rounded',
        }}
      />
    </div>
    <div className="flex gap-2 mt-4">
      <Button variant="outline" onClick={clearSignature}>
        <RotateCcw className="h-4 w-4 mr-2" />
        다시 작성
      </Button>
    </div>
  </CardContent>
</Card>
```

---

## 💾 데이터 저장 로직

### 1. Firestore 저장 구조

```typescript
// 가입 신청 시 저장
const familyRequest = {
  id: requestId,
  clubId: selectedClubId,
  clubName: selectedClubName,
  requestType: 'family',
  
  // 부모 정보
  parents: [
    {
      name: parent1.name,
      birthDate: parent1.birthDate,
      gender: parent1.gender,
      phoneNumber: parent1.phoneNumber,
      email: parent1.email,
    },
    // parent2가 있으면 추가
  ],
  
  // 자녀 정보
  children: [
    {
      name: child1.name,
      birthDate: child1.birthDate,
      gender: child1.gender,
      grade: child1.grade,
    },
    // 추가 자녀들...
  ],
  
  // 약관 동의
  agreements: {
    personal: true,
    terms: true,
    safety: true,
    portrait: false,
    agreedAt: new Date().toISOString(),
  },
  
  // 서명
  signature: signatureDataUrl,
  signedAt: new Date().toISOString(),
  
  status: 'pending',
  requestedAt: new Date().toISOString(),
};

await addDoc(collection(firestore, 'familyRegistrationRequests'), familyRequest);
```

---

### 2. 승인 시 처리 로직

```typescript
// /club-dashboard/member-approvals에서 승인 시

async function approveFamilyRequest(request: FamilyRegistrationRequest) {
  const batch = writeBatch(firestore);
  const parentIds: string[] = [];
  
  // 1. 부모들을 Adult Member로 생성
  for (const parent of request.parents) {
    const parentRef = doc(collection(firestore, 'members'));
    parentIds.push(parentRef.id);
    
    batch.set(parentRef, {
      id: parentRef.id,
      name: parent.name,
      dateOfBirth: parent.birthDate,
      gender: parent.gender,
      phoneNumber: parent.phoneNumber,
      email: parent.email,
      clubId: request.clubId,
      memberCategory: 'adult', // 자동으로 성인
      memberType: 'family',
      familyRole: 'parent',
      status: 'active',
      createdAt: new Date().toISOString(),
      approvedBy: currentUser.uid,
      approvedAt: new Date().toISOString(),
    });
  }
  
  // 2. 자녀들을 Child Member로 생성 + guardianIds 연결
  for (const child of request.children) {
    const childRef = doc(collection(firestore, 'members'));
    
    batch.set(childRef, {
      id: childRef.id,
      name: child.name,
      dateOfBirth: child.birthDate,
      gender: child.gender,
      grade: child.grade,
      clubId: request.clubId,
      memberCategory: 'child', // 자동으로 어린이
      memberType: 'family',
      familyRole: 'child',
      guardianIds: parentIds, // 부모 ID 자동 연결 ⭐
      guardianName: request.parents[0].name, // 대표 보호자
      guardianPhone: request.parents[0].phoneNumber,
      status: 'active',
      createdAt: new Date().toISOString(),
      approvedBy: currentUser.uid,
      approvedAt: new Date().toISOString(),
    });
  }
  
  // 3. 요청 상태 업데이트
  batch.update(doc(firestore, 'familyRegistrationRequests', request.id), {
    status: 'approved',
    approvedBy: currentUser.uid,
    approvedAt: new Date().toISOString(),
    createdMemberIds: [...parentIds, ...childIds],
  });
  
  await batch.commit();
  
  toast({
    title: '가족 회원 승인 완료',
    description: `${request.parents.length}명의 부모와 ${request.children.length}명의 자녀가 등록되었습니다.`,
  });
}
```

---

## 🎨 관리 화면에서 보이는 모습

### 회원 목록

```tsx
// 부모 카드
<Card>
  <CardHeader>
    <div className="flex items-center gap-3">
      <Avatar src={parent.photoURL} />
      <div>
        <CardTitle>{parent.name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {calculateAge(parent.dateOfBirth)}세
        </p>
      </div>
      <Badge variant="default">성인</Badge>
      <Badge variant="outline">가족회원</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <p className="text-sm">
        <Users className="inline h-4 w-4 mr-1" />
        자녀: {children.length}명
      </p>
      <div className="flex gap-2">
        {children.map(child => (
          <Link key={child.id} href={`/members/${child.id}`}>
            <Badge variant="secondary">{child.name}</Badge>
          </Link>
        ))}
      </div>
    </div>
  </CardContent>
</Card>

// 자녀 카드
<Card>
  <CardHeader>
    <div className="flex items-center gap-3">
      <Avatar src={child.photoURL} />
      <div>
        <CardTitle>{child.name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {calculateAge(child.dateOfBirth)}세 · {child.grade}
        </p>
      </div>
      <Badge variant="secondary">어린이</Badge>
      <Badge variant="outline">가족회원</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <p className="text-sm">
        <Shield className="inline h-4 w-4 mr-1" />
        보호자: {guardians.map(g => g.name).join(', ')}
      </p>
    </div>
  </CardContent>
</Card>
```

---

## 🎯 핵심 장점

### 1. 부모 자동 처리
✅ 부모는 자동으로 **성인 회원**으로 등록
✅ 별도 가입 절차 불필요

### 2. 자녀 자동 연결
✅ 자녀의 `guardianIds`에 부모 ID 자동 연결
✅ 부모가 자녀 정보 조회 가능

### 3. 통합 관리
✅ 가족 단위로 묶여서 관리
✅ 가족 할인 적용 가능
✅ 한번에 이용권 발급 가능

### 4. 편리한 UX
✅ 한번의 가입으로 전체 가족 등록
✅ 중복 입력 최소화

---

## 📊 데이터 구조 요약

```typescript
// 타입 정의
export type FamilyRegistrationRequest = {
  id: string;
  clubId: string;
  clubName: string;
  requestType: 'family';
  
  parents: Array<{
    name: string;
    birthDate: string;
    gender: 'male' | 'female';
    phoneNumber: string;
    email?: string;
  }>;
  
  children: Array<{
    name: string;
    birthDate: string;
    gender: 'male' | 'female';
    grade?: string;
  }>;
  
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
  
  // 승인 후 추가
  createdMemberIds?: string[];
  approvedBy?: string;
  approvedAt?: string;
};
```

---

## 🔄 전체 프로세스 요약

```
1. /register 랜딩 페이지
   ↓
2. "가족 회원" 선택
   ↓
3. /register/family
   ├─ Step 1: 클럽 선택
   ├─ Step 2: 부모 정보 (1-2명)
   ├─ Step 3: 자녀 정보 (1명 이상)
   ├─ Step 4: 약관 동의
   └─ Step 5: 보호자 서명
   ↓
4. familyRegistrationRequests 저장
   ↓
5. 클럽 승인 (/club-dashboard/member-approvals)
   ↓
6. 배치 처리:
   ├─ 부모들 → members (adult)
   └─ 자녀들 → members (child, guardianIds 자동 연결)
```

---

**다음 단계**: 이 구조로 구현하시겠습니까?

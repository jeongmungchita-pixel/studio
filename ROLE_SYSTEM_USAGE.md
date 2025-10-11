# 🎯 역할 시스템 사용 가이드

## 📦 새로 추가된 컴포넌트

### 1. RoleBadge - 역할 배지
```tsx
import { RoleBadge, RoleBadgeWithLevel } from '@/components/role-badge';
import { UserRole } from '@/types';

// 기본 사용
<RoleBadge role={UserRole.CLUB_MANAGER} />
// → [클럽 관리자] 배지

// 레벨 포함
<RoleBadgeWithLevel role={UserRole.FEDERATION_ADMIN} />
// → [연맹 관리자 (Lv.90)] 배지
```

**색상 자동 적용:**
- 빨강: 최고 관리자 (Lv.90+)
- 주황: 연맹/위원회 (Lv.70-89)
- 파랑: 클럽 관리 (Lv.45-69)
- 초록: 코치 (Lv.30-44)
- 회색: 회원/학부모 (Lv.15-29)

---

### 2. RequireRole - 권한 체크
```tsx
import { RequireRole, RequireAnyRole, RequireExactRole } from '@/components/require-role';
import { UserRole } from '@/types';

// 특정 역할 이상만 표시
<RequireRole role={UserRole.CLUB_MANAGER}>
  <AdminPanel />
</RequireRole>

// 여러 역할 중 하나라도 있으면 표시
<RequireAnyRole roles={[UserRole.CLUB_OWNER, UserRole.CLUB_MANAGER]}>
  <ClubSettings />
</RequireAnyRole>

// 정확히 일치하는 역할만 표시
<RequireExactRole role={UserRole.MEMBER}>
  <MemberOnlyContent />
</RequireExactRole>

// fallback 사용
<RequireRole 
  role={UserRole.FEDERATION_ADMIN}
  fallback={<div>권한이 없습니다</div>}
>
  <AdminPanel />
</RequireRole>
```

---

### 3. RoleSelector - 역할 선택
```tsx
import { RoleSelector, SimpleRoleSelector } from '@/components/role-selector';
import { UserRole } from '@/types';
import { useState } from 'react';

function UserRoleForm() {
  const [role, setRole] = useState<UserRole>(UserRole.MEMBER);

  return (
    <div>
      <label>역할 선택</label>
      <RoleSelector 
        value={role}
        onChange={setRole}
      />
    </div>
  );
}

// 최대 역할 제한 (관리자가 자기보다 높은 역할 못 주게)
<RoleSelector 
  value={role}
  onChange={setRole}
  maxRole={UserRole.CLUB_MANAGER} // 클럽 매니저까지만 선택 가능
/>

// 간단한 버전 (그룹 없이)
<SimpleRoleSelector 
  value={role}
  onChange={setRole}
/>
```

---

### 4. useRole - 역할 관리 훅
```tsx
import { useRole } from '@/hooks/use-role';
import { UserRole } from '@/types';

function MyComponent() {
  const { 
    userRole,
    level,
    hasRole,
    canManage,
    isAdmin,
    canManageClub,
  } = useRole();

  // 현재 역할 확인
  console.log('내 역할:', userRole);
  console.log('권한 레벨:', level);

  // 특정 역할 이상인지 확인
  if (hasRole(UserRole.CLUB_MANAGER)) {
    // 클럽 매니저 이상만 실행
  }

  // 다른 사용자를 관리할 수 있는지 확인
  if (canManage(UserRole.MEMBER)) {
    // 회원을 관리할 수 있음
  }

  // 편의 속성 사용
  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (canManageClub) {
    return <ClubManagement />;
  }

  return <MemberDashboard />;
}
```

---

## 🎨 실제 사용 예시

### 예시 1: 대시보드에 역할 표시
```tsx
import { RoleBadge } from '@/components/role-badge';
import { useUser } from '@/hooks/use-user';

function UserProfile() {
  const { user } = useUser();

  return (
    <div className="flex items-center gap-2">
      <img src={user.photoURL} alt={user.displayName} />
      <div>
        <h3>{user.displayName}</h3>
        <RoleBadge role={user.role} />
      </div>
    </div>
  );
}
```

### 예시 2: 역할별 메뉴 표시
```tsx
import { RequireRole } from '@/components/require-role';
import { UserRole } from '@/types';

function Sidebar() {
  return (
    <nav>
      {/* 모든 사용자 */}
      <MenuItem href="/dashboard">대시보드</MenuItem>
      <MenuItem href="/my-profile">내 프로필</MenuItem>

      {/* 클럽 매니저 이상 */}
      <RequireRole role={UserRole.CLUB_MANAGER}>
        <MenuItem href="/club-dashboard">클럽 관리</MenuItem>
        <MenuItem href="/members">회원 관리</MenuItem>
      </RequireRole>

      {/* 연맹 관리자 이상 */}
      <RequireRole role={UserRole.FEDERATION_ADMIN}>
        <MenuItem href="/admin">전체 관리</MenuItem>
        <MenuItem href="/clubs">클럽 관리</MenuItem>
        <MenuItem href="/committees">위원회 관리</MenuItem>
      </RequireRole>
    </nav>
  );
}
```

### 예시 3: 회원 목록에 역할 표시
```tsx
import { RoleBadge } from '@/components/role-badge';

function MemberList({ members }) {
  return (
    <table>
      <thead>
        <tr>
          <th>이름</th>
          <th>역할</th>
          <th>클럽</th>
        </tr>
      </thead>
      <tbody>
        {members.map(member => (
          <tr key={member.id}>
            <td>{member.name}</td>
            <td>
              <RoleBadge role={member.role} />
            </td>
            <td>{member.clubName}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 예시 4: 역할 변경 폼
```tsx
import { RoleSelector } from '@/components/role-selector';
import { useRole } from '@/hooks/use-role';
import { useState } from 'react';

function EditUserRole({ user }) {
  const { userRole, canManage } = useRole();
  const [newRole, setNewRole] = useState(user.role);

  const handleSave = async () => {
    if (!canManage(newRole)) {
      alert('이 역할을 부여할 권한이 없습니다');
      return;
    }

    // Firestore 업데이트
    await updateUserRole(user.id, newRole);
  };

  return (
    <div>
      <label>역할 변경</label>
      <RoleSelector 
        value={newRole}
        onChange={setNewRole}
        maxRole={userRole} // 자기 역할까지만 부여 가능
      />
      <button onClick={handleSave}>저장</button>
    </div>
  );
}
```

---

## 🎯 13개 역할 목록

| 역할 | 레벨 | 영문 | 한글 |
|------|------|------|------|
| SUPER_ADMIN | 100 | Super Admin | 최고 관리자 |
| FEDERATION_ADMIN | 90 | Federation Admin | 연맹 관리자 |
| FEDERATION_SECRETARIAT | 80 | Federation Secretariat | 연맹 사무국 |
| COMMITTEE_CHAIR | 70 | Committee Chair | 위원회 위원장 |
| COMMITTEE_MEMBER | 60 | Committee Member | 위원회 위원 |
| CLUB_OWNER | 50 | Club Owner | 클럽 소유자 |
| CLUB_MANAGER | 45 | Club Manager | 클럽 관리자 |
| CLUB_STAFF | 40 | Club Staff | 클럽 직원 |
| MEDIA_MANAGER | 40 | Media Manager | 미디어 관리자 |
| HEAD_COACH | 35 | Head Coach | 수석 코치 |
| ASSISTANT_COACH | 30 | Assistant Coach | 보조 코치 |
| MEMBER | 20 | Member | 회원 |
| PARENT | 15 | Parent | 학부모 |
| VENDOR | 10 | Vendor | 협력업체 |

---

## 💡 권한 체크 함수

### hasEqualOrHigherRole
```tsx
import { hasEqualOrHigherRole, UserRole } from '@/types';

// 사용자가 클럽 매니저 이상인지 확인
if (hasEqualOrHigherRole(user.role, UserRole.CLUB_MANAGER)) {
  // 클럽 매니저, 클럽 소유자, 연맹 관리자 등 모두 true
}
```

### hasHigherRole
```tsx
import { hasHigherRole, UserRole } from '@/types';

// 사용자가 클럽 매니저보다 높은지 확인
if (hasHigherRole(user.role, UserRole.CLUB_MANAGER)) {
  // 클럽 소유자, 연맹 관리자 등만 true
  // 클럽 매니저 본인은 false
}
```

### canManageUser
```tsx
import { canManageUser, UserRole } from '@/types';

// 관리자가 대상 사용자를 관리할 수 있는지 확인
if (canManageUser(adminRole, targetUserRole)) {
  // 관리자 역할이 대상보다 높으면 true
}
```

---

## 🚀 다음 단계

1. **기존 페이지에 적용**
   - 대시보드에 역할 배지 추가
   - 메뉴에 권한 체크 적용
   - 회원 목록에 역할 표시

2. **Firestore 보안 규칙 업데이트**
   - 역할 기반 접근 제어 적용
   - 권한 레벨 검증

3. **새 기능 추가**
   - 위원회 관리 페이지
   - 벤더 관리 페이지
   - 역할 관리 페이지

---

**모든 컴포넌트가 준비되었습니다!** 🎉

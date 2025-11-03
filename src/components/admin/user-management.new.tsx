/**
 * 사용자 관리 컴포넌트 (DI 적용)
 * - Composition Root에서 서비스 주입
 */
'use client';

import { useState, useEffect } from 'react';
import { useUserService, useUsers } from '@/hooks/use-user-service';
import { UserProfile, UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UserManagementProps {
  clubId?: string;
}

interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => React.ReactNode;
}

export function UserManagement({ clubId }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // DI 적용 서비스 사용
  const { getUsers } = useUsers({
    filters: clubId ? { clubId } : undefined
  });

  useEffect(() => {
    loadUsers();
  }, [getUsers]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await getUsers();
      
      if (result.success) {
        setUsers(result.data?.items || []);
      } else {
        setError(result.error?.message || 'Failed to load users');
      }
    } catch (err) {
      setError('An error occurred while loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const userService = useUserService();
      const result = await userService.changeUserRole(userId, newRole);
      
      if (result.success) {
        await loadUsers(); // 목록 새로고침
      } else {
        setError(result.error?.message || 'Failed to update role');
      }
    } catch (err) {
      setError('An error occurred while updating role');
    }
  };

  const columns: Column<UserProfile>[] = [
    {
      key: 'displayName',
      label: 'Name',
      render: (user: UserProfile) => (
        <div className="flex items-center space-x-2">
          <img 
            src={user.photoURL || '/default-avatar.png'} 
            alt={user.displayName}
            className="w-8 h-8 rounded-full"
          />
          <span>{user.displayName}</span>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (user: UserProfile) => user.email,
    },
    {
      key: 'role',
      label: 'Role',
      render: (user: UserProfile) => (
        <Badge variant={getRoleVariant(user.role)}>
          {user.role}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (user: UserProfile) => (
        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
          {user.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (user: UserProfile) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            onClick={() => handleRoleChange(user.uid, UserRole.FEDERATION_ADMIN)}
            disabled={user.role === UserRole.FEDERATION_ADMIN}
          >
            Make Admin
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRoleChange(user.uid, UserRole.MEMBER)}
            disabled={user.role === UserRole.MEMBER}
          >
            Make Member
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-red-600">{error}</div>
          <Button onClick={loadUsers} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                {columns.map((col) => (
                  <th key={col.key} className="border border-gray-200 px-4 py-2 text-left">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className="border border-gray-200 px-4 py-2">
                      {col.render(user)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function getRoleVariant(role: UserRole): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'destructive';
    case UserRole.FEDERATION_ADMIN:
      return 'default';
    case UserRole.CLUB_OWNER:
      return 'secondary';
    default:
      return 'outline';
  }
}

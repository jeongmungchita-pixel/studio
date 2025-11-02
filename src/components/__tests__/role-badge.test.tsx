import { describe, it, expect } from 'vitest';
import { renderWithProviders } from './test-utils';
import { UserRole } from '@/types';
import { RoleBadge } from '../role-badge';

describe('RoleBadge Component', () => {
  it('should render role names in Korean', () => {
    const { container } = renderWithProviders(<RoleBadge role={UserRole.MEMBER} />);
    expect(container.querySelector('.bg-green-500')).toHaveTextContent('회원');
  });

  it('should apply correct colors based on role hierarchy', () => {
    const testCases = [
      { role: UserRole.SUPER_ADMIN, expectedClass: 'bg-red-500', expectedText: '최고 관리자' },
      { role: UserRole.FEDERATION_ADMIN, expectedClass: 'bg-orange-500', expectedText: '연맹 관리자' },
      { role: UserRole.CLUB_OWNER, expectedClass: 'bg-blue-500', expectedText: '클럽 소유자' },
      { role: UserRole.HEAD_COACH, expectedClass: 'bg-green-500', expectedText: '수석 코치' },
      { role: UserRole.MEMBER, expectedClass: 'bg-green-500', expectedText: '회원' },
      { role: UserRole.PARENT, expectedClass: 'bg-gray-500', expectedText: '학부모' },
    ];

    testCases.forEach(({ role, expectedClass, expectedText }) => {
      const { container } = renderWithProviders(<RoleBadge role={role} />);
      const badge = container.querySelector(`.${expectedClass.split(' ')[0]}`);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(expectedText);
    });
  });

  it('should accept custom className', () => {
    const { container } = renderWithProviders(
      <RoleBadge role={UserRole.MEMBER} className="custom-badge" />
    );
    const badge = container.querySelector('.custom-badge');
    expect(badge).toBeInTheDocument();
  });

  it('should handle all user roles', () => {
    const allRoles = Object.values(UserRole);
    
    allRoles.forEach(role => {
      const { container } = renderWithProviders(<RoleBadge role={role} />);
      const badge = container.querySelector('.inline-flex.items-center.rounded-full');
      expect(badge).toBeInTheDocument();
      expect(badge).not.toHaveTextContent(''); // Should have some text content
    });
  });

  it('should use Badge component as base', () => {
    const { container } = renderWithProviders(<RoleBadge role={UserRole.MEMBER} />);
    // Should inherit all Badge component functionality
    const badge = container.querySelector('.inline-flex.items-center.rounded-full');
    expect(badge).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '../table';

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('Table Components', () => {
  describe('Table', () => {
    it('should render table with wrapper div', () => {
      render(
        <Table>
          <tbody>
            <tr>
              <td>Test content</td>
            </tr>
          </tbody>
        </Table>
      );

      const wrapper = screen.getByText('Test content').closest('div');
      expect(wrapper).toHaveClass('relative', 'w-full', 'overflow-auto');

      const table = wrapper?.querySelector('table');
      expect(table).toHaveClass('w-full', 'caption-bottom', 'text-sm');
    });

    it('should render with custom className', () => {
      render(
        <Table className="custom-table">
          <tbody>
            <tr>
              <td>Test content</td>
            </tr>
          </tbody>
        </Table>
      );

      const table = screen.getByText('Test content').closest('table');
      expect(table).toHaveClass('custom-table');
    });

    it('should pass through additional HTML attributes', () => {
      render(
        <Table data-testid="custom-table">
          <tbody>
            <tr>
              <td>Test content</td>
            </tr>
          </tbody>
        </Table>
      );

      const table = screen.getByTestId('custom-table');
      expect(table).toBeInTheDocument();
    });

    it('should have correct display name', () => {
      expect(Table.displayName).toBe('Table');
    });
  });

  describe('TableHeader', () => {
    it('should render thead with border styling', () => {
      render(
        <table>
          <TableHeader>
            <tr>
              <th>Header</th>
            </tr>
          </TableHeader>
        </table>
      );

      const thead = screen.getByText('Header').closest('thead');
      expect(thead).toHaveClass('[&_tr]:border-b');
    });

    it('should render with custom className', () => {
      render(
        <table>
          <TableHeader className="custom-header">
            <tr>
              <th>Header</th>
            </tr>
          </TableHeader>
        </table>
      );

      const thead = screen.getByText('Header').closest('thead');
      expect(thead).toHaveClass('custom-header');
    });

    it('should have correct display name', () => {
      expect(TableHeader.displayName).toBe('TableHeader');
    });
  });

  describe('TableBody', () => {
    it('should render tbody with last-child border removal', () => {
      render(
        <table>
          <TableBody>
            <tr>
              <td>Body content</td>
            </tr>
          </TableBody>
        </table>
      );

      const tbody = screen.getByText('Body content').closest('tbody');
      expect(tbody).toHaveClass('[&_tr:last-child]:border-0');
    });

    it('should render with custom className', () => {
      render(
        <table>
          <TableBody className="custom-body">
            <tr>
              <td>Body content</td>
            </tr>
          </TableBody>
        </table>
      );

      const tbody = screen.getByText('Body content').closest('tbody');
      expect(tbody).toHaveClass('custom-body');
    });

    it('should have correct display name', () => {
      expect(TableBody.displayName).toBe('TableBody');
    });
  });

  describe('TableFooter', () => {
    it('should render tfoot with footer styling', () => {
      render(
        <table>
          <TableFooter>
            <tr>
              <td>Footer content</td>
            </tr>
          </TableFooter>
        </table>
      );

      const tfoot = screen.getByText('Footer content').closest('tfoot');
      expect(tfoot).toHaveClass(
        'border-t',
        'bg-muted/50',
        'font-medium',
        '[&>tr]:last:border-b-0'
      );
    });

    it('should render with custom className', () => {
      render(
        <table>
          <TableFooter className="custom-footer">
            <tr>
              <td>Footer content</td>
            </tr>
          </TableFooter>
        </table>
      );

      const tfoot = screen.getByText('Footer content').closest('tfoot');
      expect(tfoot).toHaveClass('custom-footer');
    });

    it('should have correct display name', () => {
      expect(TableFooter.displayName).toBe('TableFooter');
    });
  });

  describe('TableRow', () => {
    it('should render tr with hover styling', () => {
      render(
        <table>
          <tbody>
            <TableRow>
              <td>Row content</td>
            </TableRow>
          </tbody>
        </table>
      );

      const tr = screen.getByText('Row content').closest('tr');
      expect(tr).toHaveClass('border-b', 'transition-colors', 'hover:bg-muted/50', 'data-[state=selected]:bg-muted');
    });

    it('should render with custom className', () => {
      render(
        <table>
          <tbody>
            <TableRow className="custom-row">
              <td>Row content</td>
            </TableRow>
          </tbody>
        </table>
      );

      const tr = screen.getByText('Row content').closest('tr');
      expect(tr).toHaveClass('custom-row');
    });

    it('should have correct display name', () => {
      expect(TableRow.displayName).toBe('TableRow');
    });
  });

  describe('TableHead', () => {
    it('should render th with header styling', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead>Header content</TableHead>
            </tr>
          </thead>
        </table>
      );

      const th = screen.getByText('Header content');
      expect(th).toHaveClass(
        'h-12',
        'px-4',
        'text-left',
        'align-middle',
        'font-medium',
        'text-muted-foreground',
        '[&:has([role=checkbox])]:pr-0'
      );
    });

    it('should render with custom className', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead className="custom-head">Header content</TableHead>
            </tr>
          </thead>
        </table>
      );

      const th = screen.getByText('Header content');
      expect(th).toHaveClass('custom-head');
    });

    it('should have correct display name', () => {
      expect(TableHead.displayName).toBe('TableHead');
    });
  });

  describe('TableCell', () => {
    it('should render td with cell styling', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell>Cell content</TableCell>
            </tr>
          </tbody>
        </table>
      );

      const td = screen.getByText('Cell content');
      expect(td).toHaveClass(
        'p-4',
        'align-middle',
        '[&:has([role=checkbox])]:pr-0'
      );
    });

    it('should render with custom className', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell className="custom-cell">Cell content</TableCell>
            </tr>
          </tbody>
        </table>
      );

      const td = screen.getByText('Cell content');
      expect(td).toHaveClass('custom-cell');
    });

    it('should have correct display name', () => {
      expect(TableCell.displayName).toBe('TableCell');
    });
  });

  describe('TableCaption', () => {
    it('should render caption with caption styling', () => {
      render(
        <Table>
          <TableCaption>Caption text</TableCaption>
          <tbody>
            <tr>
              <td>Content</td>
            </tr>
          </tbody>
        </Table>
      );

      const caption = screen.getByText('Caption text');
      expect(caption).toHaveClass('mt-4', 'text-sm', 'text-muted-foreground');
    });

    it('should render with custom className', () => {
      render(
        <Table>
          <TableCaption className="custom-caption">Caption text</TableCaption>
          <tbody>
            <tr>
              <td>Content</td>
            </tr>
          </tbody>
        </Table>
      );

      const caption = screen.getByText('Caption text');
      expect(caption).toHaveClass('custom-caption');
    });

    it('should have correct display name', () => {
      expect(TableCaption.displayName).toBe('TableCaption');
    });
  });

  describe('Complete Table Structure', () => {
    it('should render complete table with all components', () => {
      render(
        <Table>
          <TableCaption>User Data</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John Doe</TableCell>
              <TableCell>john@example.com</TableCell>
              <TableCell>Admin</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Jane Smith</TableCell>
              <TableCell>jane@example.com</TableCell>
              <TableCell>User</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>Total: 2 users</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByText('User Data')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Total: 2 users')).toBeInTheDocument();

      // Check table structure
      const table = screen.getByText('John Doe').closest('table');
      expect(table).toBeInTheDocument();
      expect(table?.querySelector('caption')).toBeInTheDocument();
      expect(table?.querySelector('thead')).toBeInTheDocument();
      expect(table?.querySelector('tbody')).toBeInTheDocument();
      expect(table?.querySelector('tfoot')).toBeInTheDocument();
    });
  });
});

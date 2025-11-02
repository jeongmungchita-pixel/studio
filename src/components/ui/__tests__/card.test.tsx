import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('Card Components', () => {
  describe('Card', () => {
    it('should render with default styling', () => {
      render(<Card>Card content</Card>);
      
      const card = screen.getByText('Card content');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass(
        'rounded-lg',
        'border',
        'bg-card',
        'text-card-foreground',
        'shadow-sm'
      );
    });

    it('should render with custom className', () => {
      render(<Card className="custom-card">Card content</Card>);
      
      const card = screen.getByText('Card content');
      expect(card).toHaveClass('custom-card');
    });

    it('should pass through additional props', () => {
      render(<Card data-testid="test-card">Card content</Card>);
      
      const card = screen.getByTestId('test-card');
      expect(card).toBeInTheDocument();
    });

    it('should have correct display name', () => {
      expect(Card.displayName).toBe('Card');
    });
  });

  describe('CardHeader', () => {
    it('should render with default styling', () => {
      render(<CardHeader>Header content</CardHeader>);
      
      const header = screen.getByText('Header content');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });

    it('should render with custom className', () => {
      render(<CardHeader className="custom-header">Header content</CardHeader>);
      
      const header = screen.getByText('Header content');
      expect(header).toHaveClass('custom-header');
    });

    it('should have correct display name', () => {
      expect(CardHeader.displayName).toBe('CardHeader');
    });
  });

  describe('CardTitle', () => {
    it('should render with default styling', () => {
      render(<CardTitle>Card Title</CardTitle>);
      
      const title = screen.getByText('Card Title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass(
        'text-2xl',
        'font-semibold',
        'leading-none',
        'tracking-tight'
      );
    });

    it('should render with custom className', () => {
      render(<CardTitle className="custom-title">Card Title</CardTitle>);
      
      const title = screen.getByText('Card Title');
      expect(title).toHaveClass('custom-title');
    });

    it('should have correct display name', () => {
      expect(CardTitle.displayName).toBe('CardTitle');
    });
  });

  describe('CardDescription', () => {
    it('should render with default styling', () => {
      render(<CardDescription>Card description</CardDescription>);
      
      const description = screen.getByText('Card description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('should render with custom className', () => {
      render(<CardDescription className="custom-description">Card description</CardDescription>);
      
      const description = screen.getByText('Card description');
      expect(description).toHaveClass('custom-description');
    });

    it('should have correct display name', () => {
      expect(CardDescription.displayName).toBe('CardDescription');
    });
  });

  describe('CardContent', () => {
    it('should render with default styling', () => {
      render(<CardContent>Card content</CardContent>);
      
      const content = screen.getByText('Card content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass('p-6', 'pt-0');
    });

    it('should render with custom className', () => {
      render(<CardContent className="custom-content">Card content</CardContent>);
      
      const content = screen.getByText('Card content');
      expect(content).toHaveClass('custom-content');
    });

    it('should have correct display name', () => {
      expect(CardContent.displayName).toBe('CardContent');
    });
  });

  describe('CardFooter', () => {
    it('should render with default styling', () => {
      render(<CardFooter>Footer content</CardFooter>);
      
      const footer = screen.getByText('Footer content');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });

    it('should render with custom className', () => {
      render(<CardFooter className="custom-footer">Footer content</CardFooter>);
      
      const footer = screen.getByText('Footer content');
      expect(footer).toHaveClass('custom-footer');
    });

    it('should have correct display name', () => {
      expect(CardFooter.displayName).toBe('CardFooter');
    });
  });

  describe('Complete Card Structure', () => {
    it('should render complete card with all components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Main content goes here')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();

      // Check that Card has the correct styling
      const card = screen.getByText('Test Title').closest('.rounded-lg');
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card');
    });

    it('should handle nested components correctly', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>
              <span>Nested Title</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p>Nested content</p>
            </div>
          </CardContent>
        </Card>
      );

      expect(screen.getByText('Nested Title')).toBeInTheDocument();
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });
  });
});

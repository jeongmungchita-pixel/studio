import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '../skeleton';

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('Skeleton Component', () => {
  it('should render with default styling', () => {
    render(<Skeleton data-testid="skeleton" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse', 'rounded-md', 'bg-muted');
  });

  it('should render with custom className', () => {
    render(<Skeleton className="custom-skeleton" data-testid="skeleton" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('custom-skeleton');
  });

  it('should pass through additional HTML attributes', () => {
    render(
      <Skeleton 
        data-testid="custom-skeleton" 
        aria-label="Loading content"
        role="status"
      />
    );
    
    const skeleton = screen.getByTestId('custom-skeleton');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
    expect(skeleton).toHaveAttribute('role', 'status');
  });

  it('should render as div element', () => {
    render(<Skeleton data-testid="skeleton" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton.tagName).toBe('DIV');
  });

  it('should combine default and custom classes correctly', () => {
    render(<Skeleton className="w-32 h-4" data-testid="skeleton" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass(
      'animate-pulse',
      'rounded-md',
      'bg-muted',
      'w-32',
      'h-4'
    );
  });

  it('should export Skeleton component', () => {
    expect(typeof Skeleton).toBe('function');
  });
});

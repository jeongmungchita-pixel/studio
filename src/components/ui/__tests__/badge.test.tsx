import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../badge';

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('Badge Component', () => {
  it('should render with default variant', () => {
    render(<Badge>Default Badge</Badge>);
    
    const badge = screen.getByText('Default Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass(
      'inline-flex',
      'items-center',
      'rounded-full',
      'border',
      'px-2.5',
      'py-0.5',
      'text-xs',
      'font-semibold',
      'bg-primary',
      'text-primary-foreground',
      'border-transparent'
    );
  });

  it('should render with different variants', () => {
    const variants = ['default', 'secondary', 'destructive', 'outline'] as const;
    
    variants.forEach(variant => {
      const { unmount } = render(<Badge variant={variant}>{variant} badge</Badge>);
      const badge = screen.getByText(`${variant} badge`);
      
      if (variant === 'default') {
        expect(badge).toHaveClass('bg-primary', 'text-primary-foreground', 'border-transparent');
      } else if (variant === 'secondary') {
        expect(badge).toHaveClass('bg-secondary', 'text-secondary-foreground', 'border-transparent');
      } else if (variant === 'destructive') {
        expect(badge).toHaveClass('bg-destructive', 'text-destructive-foreground', 'border-transparent');
      } else if (variant === 'outline') {
        expect(badge).toHaveClass('text-foreground');
      }
      
      unmount();
    });
  });

  it('should render with custom className', () => {
    render(<Badge className="custom-badge">Custom Badge</Badge>);
    
    const badge = screen.getByText('Custom Badge');
    expect(badge).toHaveClass('custom-badge');
  });

  it('should pass through additional HTML attributes', () => {
    render(
      <Badge data-testid="custom-badge" aria-label="Custom Label">
        Badge with props
      </Badge>
    );
    
    const badge = screen.getByTestId('custom-badge');
    expect(badge).toHaveAttribute('aria-label', 'Custom Label');
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Badge onClick={handleClick}>Clickable Badge</Badge>);
    
    const badge = screen.getByText('Clickable Badge');
    badge.click();
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render children correctly', () => {
    render(
      <Badge>
        <span data-testid="badge-icon">★</span>
        Badge with icon
      </Badge>
    );
    
    expect(screen.getByText('Badge with icon')).toBeInTheDocument();
    expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
  });

  it('should have focus styles', () => {
    render(<Badge>Focus Badge</Badge>);
    
    const badge = screen.getByText('Focus Badge');
    expect(badge).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-ring',
      'focus:ring-offset-2'
    );
  });

  it('should export badgeVariants function', async () => {
    const badgeModule = await import('../badge');
    expect(typeof badgeModule.badgeVariants).toBe('function');
  });
});

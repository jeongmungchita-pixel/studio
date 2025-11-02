import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

// Mock Radix UI Slot
vi.mock('@radix-ui/react-slot', () => ({
  Slot: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('Button Component', () => {
  it('should render with default variant and size', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass(
      'inline-flex',
      'items-center',
      'justify-center',
      'bg-primary',
      'text-primary-foreground',
      'h-10',
      'px-4',
      'py-2'
    );
  });

  it('should render with different variants', () => {
    const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;
    
    variants.forEach(variant => {
      const { unmount } = render(<Button variant={variant}>Button</Button>);
      const button = screen.getByRole('button', { name: 'Button' });
      
      if (variant === 'default') {
        expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
      } else if (variant === 'destructive') {
        expect(button).toHaveClass('bg-destructive', 'text-destructive-foreground');
      } else if (variant === 'outline') {
        expect(button).toHaveClass('border', 'border-input', 'bg-background');
      } else if (variant === 'secondary') {
        expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground');
      } else if (variant === 'ghost') {
        expect(button).toHaveClass('hover:bg-accent');
      } else if (variant === 'link') {
        expect(button).toHaveClass('text-primary', 'underline-offset-4');
      }
      
      unmount();
    });
  });

  it('should render with different sizes', () => {
    const sizes = ['default', 'sm', 'lg', 'icon'] as const;
    
    sizes.forEach(size => {
      const { unmount } = render(<Button size={size}>Button</Button>);
      const button = screen.getByRole('button', { name: 'Button' });
      
      if (size === 'default') {
        expect(button).toHaveClass('h-10', 'px-4', 'py-2');
      } else if (size === 'sm') {
        expect(button).toHaveClass('h-9', 'px-3');
      } else if (size === 'lg') {
        expect(button).toHaveClass('h-11', 'px-8');
      } else if (size === 'icon') {
        expect(button).toHaveClass('h-10', 'w-10');
      }
      
      unmount();
    });
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Disabled Button' });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
  });

  it('should render with custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Custom Button' });
    expect(button).toHaveClass('custom-class');
  });

  it('should render as Slot when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    
    const link = screen.getByRole('link', { name: 'Link Button' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
    // Should render as a link (not button) when asChild is true
    expect(link).not.toHaveAttribute('type');
  });

  it('should render children with icons', () => {
    render(
      <Button>
        <svg data-testid="test-icon" />
        Button with Icon
      </Button>
    );
    
    const button = screen.getByRole('button', { name: 'Button with Icon' });
    const icon = screen.getByTestId('test-icon');
    
    expect(button).toContainElement(icon);
    expect(button).toHaveClass('[&_svg]:pointer-events-none', '[&_svg]:size-4', '[&_svg]:shrink-0');
  });

  it('should pass through additional HTML attributes', () => {
    render(<Button data-testid="custom-button" aria-label="Custom Label">Button</Button>);
    
    const button = screen.getByTestId('custom-button');
    expect(button).toHaveAttribute('aria-label', 'Custom Label');
  });

  it('should handle form submission', () => {
    const handleSubmit = vi.fn(e => e.preventDefault());
    render(
      <form onSubmit={handleSubmit}>
        <Button type="submit">Submit</Button>
      </form>
    );
    
    const button = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(button);
    
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('should have correct display name', () => {
    expect(Button.displayName).toBe('Button');
  });
});

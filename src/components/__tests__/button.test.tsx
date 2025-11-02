import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, clickButton, expectButtonToBeDisabled } from './test-utils';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render with default props', () => {
    renderWithProviders(<Button>Click me</Button>);
    const button = document.querySelector('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    renderWithProviders(<Button onClick={handleClick}>Click me</Button>);
    
    clickButton('Click me');
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    renderWithProviders(<Button disabled>Disabled</Button>);
    const button = document.querySelector('button:disabled');
    expect(button).toBeInTheDocument();
    expectButtonToBeDisabled(button as HTMLElement);
  });

  it('should apply variant classes correctly', () => {
    const { container } = renderWithProviders(
      <Button variant="destructive">Delete</Button>
    );
    const button = container.querySelector('.bg-destructive.text-destructive-foreground');
    expect(button).toBeInTheDocument();
  });

  it('should apply size classes correctly', () => {
    const { container } = renderWithProviders(
      <Button size="lg">Large Button</Button>
    );
    const button = container.querySelector('.h-11.px-8');
    expect(button).toBeInTheDocument();
  });

  it('should render as different element when asChild is true', () => {
    renderWithProviders(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    const link = document.querySelector('a[href="/test"]');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('Link Button');
  });

  it('should show loading state when loading is true', () => {
    renderWithProviders(<Button disabled>Loading</Button>);
    const button = document.querySelector('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('disabled');
  });

  it('should accept custom className', () => {
    const { container } = renderWithProviders(
      <Button className="custom-class">Custom</Button>
    );
    const button = container.querySelector('.custom-class');
    expect(button).toBeInTheDocument();
  });
});

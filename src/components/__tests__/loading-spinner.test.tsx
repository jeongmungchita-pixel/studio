import { describe, it, expect } from 'vitest';
import { renderWithProviders } from './test-utils';
import { LoadingSpinner } from '../loading-spinner';

describe('LoadingSpinner Component', () => {
  it('should render with default props', () => {
    const { container } = renderWithProviders(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    const containerDiv = container.querySelector('.flex.items-center.justify-center.p-8');
    
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-12.w-12'); // default size md
    expect(containerDiv).toBeInTheDocument();
  });

  it('should render different sizes', () => {
    const sizes = [
      { size: 'sm' as const, expectedClass: 'h-6.w-6' },
      { size: 'md' as const, expectedClass: 'h-12.w-12' },
      { size: 'lg' as const, expectedClass: 'h-16.w-16' },
    ];

    sizes.forEach(({ size, expectedClass }) => {
      const { container } = renderWithProviders(<LoadingSpinner size={size} />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass(expectedClass);
    });
  });

  it('should render in full screen mode', () => {
    const { container } = renderWithProviders(<LoadingSpinner fullScreen />);
    const containerDiv = container.querySelector('.min-h-\\[calc\\(100vh-4rem\\)\\]');
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv).toHaveClass('items-center.justify-center');
  });

  it('should display custom message', () => {
    const message = 'Loading data...';
    renderWithProviders(<LoadingSpinner message={message} />);
    const messageElement = document.querySelector('.text-sm.text-muted-foreground');
    expect(messageElement).toBeInTheDocument();
    expect(messageElement).toHaveTextContent(message);
  });

  it('should not display message when not provided', () => {
    const { container } = renderWithProviders(<LoadingSpinner />);
    const messageElement = container.querySelector('.text-sm.text-muted-foreground');
    expect(messageElement).not.toBeInTheDocument();
  });

  it('should use Loader2 icon with correct classes', () => {
    const { container } = renderWithProviders(<LoadingSpinner />);
    const loader = container.querySelector('.lucide-loader2');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass('animate-spin.text-primary');
  });

  it('should combine fullScreen with message', () => {
    const message = 'Loading full screen...';
    const { container } = renderWithProviders(
      <LoadingSpinner fullScreen message={message} />
    );
    
    const containerDiv = container.querySelector('.min-h-\\[calc\\(100vh-4rem\\)\\]');
    const messageElement = container.querySelector('.text-sm.text-muted-foreground');
    
    expect(containerDiv).toBeInTheDocument();
    expect(messageElement).toHaveTextContent(message);
  });

  it('should have proper flex layout structure', () => {
    const { container } = renderWithProviders(<LoadingSpinner />);
    
    // Outer container
    const outerContainer = container.querySelector('.flex.items-center.justify-center.p-8');
    expect(outerContainer).toBeInTheDocument();
    
    // Inner flex container for vertical layout
    const innerContainer = container.querySelector('.flex.flex-col.items-center.gap-3');
    expect(innerContainer).toBeInTheDocument();
    
    // Spinner should be inside inner container
    const spinner = innerContainer?.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});

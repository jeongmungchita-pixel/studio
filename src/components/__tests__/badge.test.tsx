import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

// Mock React forwardRef
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    forwardRef: vi.fn((render, ref) => {
      const MockComponent = (props: any) => {
        const refToUse = ref || actual.createRef();
        return render(props, refToUse);
      };
      MockComponent.displayName = `forwardRef(${render.displayName || render.name || 'Component'})`;
      return MockComponent;
    }),
  };
});

describe('Badge Component', () => {
  it('should render with default variant', () => {
    render(<Badge>Test Badge</Badge>);
    const badge = document.querySelector('.inline-flex.items-center.rounded-full');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Test Badge');
  });

  it('should apply variant classes correctly', () => {
    const { container } = render(
      <Badge variant="destructive">Error</Badge>
    );
    const badge = container.querySelector('.bg-destructive.text-destructive-foreground');
    expect(badge).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(
      <Badge className="custom-class">Custom</Badge>
    );
    const badge = container.querySelector('.custom-class');
    expect(badge).toBeInTheDocument();
  });

  it('should handle different sizes', () => {
    const { container } = render(
      <Badge variant="outline">Outline</Badge>
    );
    const badge = container.querySelector('.border');
    expect(badge).toBeInTheDocument();
  });
});

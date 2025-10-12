import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '@/components/loading-spinner';

describe('LoadingSpinner Component', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingSpinner message="로딩 중..." />);
    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  });

  it('renders in fullScreen mode', () => {
    const { container } = render(<LoadingSpinner fullScreen />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('min-h-[calc(100vh-4rem)]');
  });

  it('renders with small size', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-6', 'w-6');
  });

  it('renders with medium size (default)', () => {
    const { container } = render(<LoadingSpinner size="md" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-12', 'w-12');
  });

  it('renders with large size', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-16', 'w-16');
  });

  it('has spinning animation', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('animate-spin');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../input';

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('Input Component', () => {
  it('should render with default styling', () => {
    render(<Input placeholder="Enter text" />);
    
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass(
      'flex',
      'h-10',
      'w-full',
      'rounded-md',
      'border',
      'border-input',
      'bg-background',
      'px-3',
      'py-2',
      'text-base'
    );
  });

  it('should render with different types', () => {
    const types = ['text', 'email', 'password', 'number', 'search'];
    
    types.forEach(type => {
      const { unmount } = render(<Input type={type} placeholder={`Enter ${type}`} />);
      const input = screen.getByPlaceholderText(`Enter ${type}`);
      
      expect(input).toHaveAttribute('type', type);
      unmount();
    });
  });

  it('should handle value changes', () => {
    const handleChange = vi.fn();
    render(<Input value="test" onChange={handleChange} />);
    
    const input = screen.getByDisplayValue('test');
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled input" />);
    
    const input = screen.getByPlaceholderText('Disabled input');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
  });

  it('should render with custom className', () => {
    render(<Input className="custom-input" placeholder="Custom input" />);
    
    const input = screen.getByPlaceholderText('Custom input');
    expect(input).toHaveClass('custom-input');
  });

  it('should pass through additional HTML attributes', () => {
    render(
      <Input
        data-testid="custom-input"
        aria-label="Custom Label"
        maxLength={50}
        placeholder="Test input"
      />
    );
    
    const input = screen.getByTestId('custom-input');
    expect(input).toHaveAttribute('aria-label', 'Custom Label');
    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('should handle focus events', () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    
    render(<Input onFocus={handleFocus} onBlur={handleBlur} placeholder="Focus test" />);
    
    const input = screen.getByPlaceholderText('Focus test');
    
    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);
    
    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('should have file input styling when type is file', () => {
    render(<Input type="file" data-testid="file-input" />);
    
    const input = screen.getByTestId('file-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'file');
  });

  it('should handle placeholder text', () => {
    render(<Input placeholder="Placeholder text" />);
    
    const input = screen.getByPlaceholderText('Placeholder text');
    expect(input).toHaveAttribute('placeholder', 'Placeholder text');
    expect(input).toHaveClass('placeholder:text-muted-foreground');
  });

  it('should handle required attribute', () => {
    render(<Input required placeholder="Required field" />);
    
    const input = screen.getByPlaceholderText('Required field');
    expect(input).toBeRequired();
  });

  it('should handle readonly attribute', () => {
    render(<Input readOnly value="Readonly value" />);
    
    const input = screen.getByDisplayValue('Readonly value');
    expect(input).toHaveAttribute('readOnly');
  });

  it('should have correct display name', () => {
    expect(Input.displayName).toBe('Input');
  });

  it('should handle ref forwarding', () => {
    const ref = { current: null };
    render(<Input ref={ref} placeholder="Ref test" />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveAttribute('placeholder', 'Ref test');
  });

  it('should apply responsive text size classes', () => {
    render(<Input placeholder="Responsive input" />);
    
    const input = screen.getByPlaceholderText('Responsive input');
    expect(input).toHaveClass('text-base', 'md:text-sm');
  });

  it('should handle key events', () => {
    const handleKeyDown = vi.fn();
    render(<Input onKeyDown={handleKeyDown} placeholder="Key test" />);
    
    const input = screen.getByPlaceholderText('Key test');
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(handleKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'Enter' })
    );
  });
});

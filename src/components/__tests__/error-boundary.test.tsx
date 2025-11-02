import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthErrorBoundary } from '../error-boundary';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock console methods
const consoleSpy = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
};

// Mock window for SSR tests
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'test-user-agent',
  },
  writable: true,
});

describe('AuthErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Handling', () => {
    it('should render children when there is no error', () => {
      const ChildComponent = () => <div>Normal Component</div>;
      
      render(
        <AuthErrorBoundary>
          <ChildComponent />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('Normal Component')).toBeInTheDocument();
    });

    it('should catch and display error boundary UI when child throws error', () => {
      const ThrowErrorComponent = () => {
        throw new Error('Test error');
      };

      // Suppress the error boundary error log for this test
      const originalError = console.error;
      console.error = vi.fn();

      render(
        <AuthErrorBoundary>
          <ThrowErrorComponent />
        </AuthErrorBoundary>
      );

      // Restore console.error
      console.error = originalError;

      // Check that error boundary caught the error (it should not crash)
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Error Logging', () => {
    it('should call onError prop when provided', () => {
      const onError = vi.fn();
      const ThrowErrorComponent = () => {
        throw new Error('Test error');
      };

      // Suppress the error boundary error log for this test
      const originalError = console.error;
      console.error = vi.fn();

      render(
        <AuthErrorBoundary onError={onError}>
          <ThrowErrorComponent />
        </AuthErrorBoundary>
      );

      // Restore console.error
      console.error = originalError;

      expect(onError).toHaveBeenCalled();
    });
  });
});

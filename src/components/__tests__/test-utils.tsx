import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestMocks } from '@/test/mocks';

// Setup all mocks
setupTestMocks();

// Test wrapper with providers
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  Wrapper.displayName = 'TestQueryWrapper';
  
  return Wrapper;
};

// Custom render function with providers
export const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

AllTheProviders.displayName = 'AllTheProviders';

export const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  const Wrapper = AllTheProviders;
  return render(ui, { wrapper: Wrapper, ...options });
};

// Common test utilities
export const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'MEMBER',
  status: 'active',
};

export const mockProps = {
  user: mockUser,
  isLoading: false,
  error: null,
};

// Helper functions for testing
export const waitForElementToBeRemoved = (element: HTMLElement) => 
  waitFor(() => expect(element).not.toBeInTheDocument());

export const expectButtonToBeDisabled = (button: HTMLElement) => 
  expect(button).toBeDisabled();

export const expectButtonToBeEnabled = (button: HTMLElement) => 
  expect(button).toBeEnabled();

export const clickButton = (text: string) => 
  fireEvent.click(screen.getByRole('button', { name: text }));

export const typeInInput = (label: string, value: string) => 
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

export const expectElementToBeVisible = (text: string) => 
  expect(screen.getByText(text)).toBeVisible();

export const expectElementNotToBeVisible = (text: string) => 
  expect(screen.queryByText(text)).not.toBeInTheDocument();

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver for responsive components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia for responsive testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Re-export testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

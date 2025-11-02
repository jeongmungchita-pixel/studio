import { describe, it, expect, vi } from 'vitest';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Check: () => <span data-testid="check-icon">✓</span>,
  ChevronDown: () => <span data-testid="chevron-down">▼</span>,
  ChevronUp: () => <span data-testid="chevron-up">▲</span>,
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('Select Components Basic Tests', () => {
  it('should import Select components without errors', async () => {
    const SelectModule = await import('../select');
    
    expect(SelectModule.Select).toBeDefined();
    expect(SelectModule.SelectGroup).toBeDefined();
    expect(SelectModule.SelectValue).toBeDefined();
    expect(SelectModule.SelectTrigger).toBeDefined();
    expect(SelectModule.SelectContent).toBeDefined();
    expect(SelectModule.SelectLabel).toBeDefined();
    expect(SelectModule.SelectItem).toBeDefined();
  });
});

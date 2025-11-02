import { describe, it, expect, vi } from 'vitest';

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('Switch Component Basic Tests', () => {
  it('should import Switch component without errors', async () => {
    const SwitchModule = await import('../switch');
    
    expect(SwitchModule.Switch).toBeDefined();
    expect(typeof SwitchModule.Switch).toBe('object'); // React component
  });

  it('should export Switch component', async () => {
    const SwitchModule = await import('../switch');
    
    // Check that Switch is properly exported
    expect(SwitchModule.Switch).toBeDefined();
  });
});

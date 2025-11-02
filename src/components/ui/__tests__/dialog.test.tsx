import { describe, it, expect, vi } from 'vitest';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="close-icon">×</span>,
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('Dialog Components Basic Tests', () => {
  it('should import Dialog components without errors', async () => {
    const DialogModule = await import('../dialog');
    
    expect(DialogModule.Dialog).toBeDefined();
    expect(DialogModule.DialogTrigger).toBeDefined();
    expect(DialogModule.DialogPortal).toBeDefined();
    expect(DialogModule.DialogClose).toBeDefined();
    expect(DialogModule.DialogOverlay).toBeDefined();
    expect(DialogModule.DialogContent).toBeDefined();
    expect(DialogModule.DialogHeader).toBeDefined();
    expect(DialogModule.DialogFooter).toBeDefined();
    expect(DialogModule.DialogTitle).toBeDefined();
    expect(DialogModule.DialogDescription).toBeDefined();
  });
});

import { describe, it, expect, vi } from 'vitest';

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('Tabs Components Basic Tests', () => {
  it('should import Tabs components without errors', async () => {
    const TabsModule = await import('../tabs');
    
    expect(TabsModule.Tabs).toBeDefined();
    expect(TabsModule.TabsList).toBeDefined();
    expect(TabsModule.TabsTrigger).toBeDefined();
    expect(TabsModule.TabsContent).toBeDefined();
  });

  it('should export all Tabs components', async () => {
    const TabsModule = await import('../tabs');
    
    // Check that all components are properly exported
    const componentNames = ['Tabs', 'TabsList', 'TabsTrigger', 'TabsContent'];
    componentNames.forEach(name => {
      expect(TabsModule[name]).toBeDefined();
      expect(typeof TabsModule[name]).toBe('object'); // React component
    });
  });
});

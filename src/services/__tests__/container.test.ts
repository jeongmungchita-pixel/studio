import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceContainer, registerDefaultServices } from '../container';

class DummyService { constructor(public value: number) {} inc() { this.value += 1; } }

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = ServiceContainer.getInstance();
    container.reset();
  });

  it('registers and resolves instances', () => {
    container.registerInstance('dummy' as any, new DummyService(1));
    const svc = container.resolve<DummyService>('dummy' as any);
    expect(svc.value).toBe(1);
    svc.inc();
    expect(svc.value).toBe(2);
  });

  it('registers via factories', () => {
    container.register('dummy2' as any, () => new DummyService(10));
    const svc = container.resolve<DummyService>('dummy2' as any);
    expect(svc.value).toBe(10);
  });

  it('reset removes services selectively and fully', () => {
    container.registerInstance('a' as any, new DummyService(0));
    container.registerInstance('b' as any, new DummyService(0));
    expect(container.has('a' as any)).toBe(true);
    expect(container.has('b' as any)).toBe(true);
    container.reset(['a' as any]);
    expect(container.has('a' as any)).toBe(false);
    expect(container.has('b' as any)).toBe(true);
    container.reset();
    expect(container.has('b' as any)).toBe(false);
  });

  it('registerDefaultServices registers core singletons', () => {
    registerDefaultServices(container);
    expect(container.has('apiClient')).toBe(true);
    expect(container.has('authService')).toBe(true);
    expect(container.has('userService')).toBe(true);
    expect(container.has('errorHandler')).toBe(true);
    expect(container.has('loadingManager')).toBe(true);
  });
});

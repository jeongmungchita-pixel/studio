import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DIContainer } from '@/lib/di/di-container';

// Test interface
interface ITestService {
  getValue(): string;
  setValue(value: string): void;
}

// Test implementation
class TestService implements ITestService {
  private value = 'default';

  getValue(): string {
    return this.value;
  }

  setValue(value: string): void {
    this.value = value;
  }
}

describe('DI Container Simple Tests', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
    // Reset the container to clean state
    container.reset();
  });

  afterEach(() => {
    container.reset();
  });

  it('should register and resolve a service instance', () => {
    const testService = new TestService();
    
    container.registerInstance('testService' as any, testService);
    
    const resolved = container.resolve<ITestService>('testService' as any);
    
    expect(resolved).toBe(testService);
    expect(resolved.getValue()).toBe('default');
  });

  it('should register and resolve with factory', () => {
    container.register('testService' as any, () => new TestService());
    
    const resolved = container.resolve<ITestService>('testService' as any);
    
    expect(resolved).toBeInstanceOf(TestService);
    expect(resolved.getValue()).toBe('default');
  });

  it('should resolve singleton services', () => {
    container.register('testService' as any, () => new TestService(), true);
    
    const instance1 = container.resolve<ITestService>('testService' as any);
    const instance2 = container.resolve<ITestService>('testService' as any);
    
    expect(instance1).toBe(instance2);
    expect(instance1).toBeInstanceOf(TestService);
  });

  it('should create new instances for non-singleton', () => {
    container.register('testService' as any, () => new TestService(), false);
    
    const instance1 = container.resolve<ITestService>('testService' as any);
    const instance2 = container.resolve<ITestService>('testService' as any);
    
    expect(instance1).not.toBe(instance2);
    expect(instance1).toBeInstanceOf(TestService);
    expect(instance2).toBeInstanceOf(TestService);
  });

  it('should throw error for unregistered service', () => {
    expect(() => {
      container.resolve('nonExistentService' as any);
    }).toThrow('Service not registered: nonExistentService');
  });

  it('should check if service is registered', () => {
    container.registerInstance('testService' as any, new TestService());
    
    expect(container.has('testService' as any)).toBe(true);
    expect(container.has('nonExistentService' as any)).toBe(false);
  });

  it('should reset container', () => {
    container.registerInstance('testService' as any, new TestService());
    
    expect(container.has('testService' as any)).toBe(true);
    
    container.reset();
    
    expect(container.has('testService' as any)).toBe(false);
  });

  it('should handle service dependencies', () => {
    interface IDependency {
      getName(): string;
    }

    class Dependency implements IDependency {
      getName(): string {
        return 'dependency';
      }
    }

    interface IServiceWithDependency {
      getDependencyName(): string;
    }

    class ServiceWithDependency implements IServiceWithDependency {
      constructor(private dependency: IDependency) {}

      getDependencyName(): string {
        return this.dependency.getName();
      }
    }

    container.registerInstance('dependency' as any, new Dependency());
    container.register('service' as any, () => 
      new ServiceWithDependency(container.resolve<IDependency>('dependency' as any))
    );

    const service = container.resolve<IServiceWithDependency>('service' as any);
    
    expect(service.getDependencyName()).toBe('dependency');
  });

  it('should set mock services', () => {
    const mockService = new TestService();
    mockService.setValue('mocked');
    
    container.setMockServices({
      'testService': mockService
    } as any);
    
    const resolved = container.resolve<ITestService>('testService' as any);
    expect(resolved.getValue()).toBe('mocked');
  });

  it('should get registered services list', () => {
    container.registerInstance('service1' as any, new TestService());
    container.register('service2' as any, () => new TestService());
    
    const services = container.getRegisteredServices();
    
    expect(services).toContain('service1');
    expect(services).toContain('service2');
  });
});

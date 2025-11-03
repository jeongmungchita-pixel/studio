import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceContainer, registerDefaultServices } from '@/services/container';
import { AuthService } from '@/services/auth-service';
import { UserService } from '@/services/user-service';

// DI 컨테이너 테스트
describe('ServiceContainer with DI', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = ServiceContainer.getInstance();
    container.reset(); // Clear all services
  });

  it('should register and resolve services', () => {
    // Register services
    container.register('authService', () => new AuthService());
    container.register('userService', () => new UserService({ api: null }));

    // Resolve services
    const authService = container.resolve('authService');
    const userService = container.resolve('userService');

    expect(authService).toBeInstanceOf(AuthService);
    expect(userService).toBeInstanceOf(UserService);
  });

  it('should handle instance registration', () => {
    const instance = { name: 'test-instance' };
    
    container.registerInstance('instanceService', instance);

    const resolved = container.resolve('instanceService');
    expect(resolved).toBe(instance);
    expect(resolved.name).toBe('test-instance');
  });

  it('should throw error for unregistered service', () => {
    expect(() => {
      container.resolve('nonExistentService');
    }).toThrow('Service not found: nonExistentService');
  });

  it('should check service registration', () => {
    container.register('testService', () => ({}));

    expect(container.has('testService')).toBe(true);
    expect(container.has('nonExistentService')).toBe(false);
  });

  it('should clear services', () => {
    container.register('service1', () => ({}));
    container.register('service2', () => ({}));

    expect(container.has('service1')).toBe(true);
    expect(container.has('service2')).toBe(true);

    container.reset(['service1', 'service2']);

    expect(container.has('service1')).toBe(false);
    expect(container.has('service2')).toBe(false);
  });

  it('should work with default services registration', () => {
    registerDefaultServices(container);

    expect(container.has('authService')).toBe(true);
    expect(container.has('userService')).toBe(true);
    expect(container.has('apiClient')).toBe(true);

    const authService = container.resolve('authService');
    expect(authService).toBeInstanceOf(AuthService);
  });

  it('should handle singleton pattern', () => {
    const instance1 = ServiceContainer.getInstance();
    const instance2 = ServiceContainer.getInstance();

    expect(instance1).toBe(instance2);
  });
});

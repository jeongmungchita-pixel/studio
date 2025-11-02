// 1. Imports
import { ApiClient, apiClient } from './api-client';
import { AuthService, authService } from './auth-service';
import { errorHandler } from './error-handler';
import { loadingManager } from './loading-manager';
import { UserService, userService } from './user-service';

// 2. Types
export type ServiceFactory<T> = () => T;
export type ServiceKey =
  | 'apiClient'
  | 'authService'
  | 'userService'
  | 'errorHandler'
  | 'loadingManager'
  | (string & {});

// 3. Container (Singleton)
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services = new Map<ServiceKey, unknown>();

  private constructor() {}

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  register<T>(name: ServiceKey, factory: ServiceFactory<T>): void {
    this.services.set(name, factory());
  }

  registerInstance<T>(name: ServiceKey, instance: T): void {
    this.services.set(name, instance as unknown);
  }

  resolve<T>(name: ServiceKey): T {
    const svc = this.services.get(name);
    if (!svc) {
      throw new Error(`Service not found: ${String(name)}`);
    }
    return svc as T;
  }

  has(name: ServiceKey): boolean {
    return this.services.has(name);
  }

  reset(names?: ServiceKey[]): void {
    if (!names) {
      this.services.clear();
      return;
    }
    for (const n of names) {
      this.services.delete(n);
    }
  }
}

// 4. Default registration helper
export function registerDefaultServices(container = ServiceContainer.getInstance()): void {
  if (!container.has('apiClient')) container.registerInstance<ApiClient>('apiClient', apiClient);
  if (!container.has('authService')) container.registerInstance<AuthService>('authService', authService);
  if (!container.has('userService')) container.registerInstance<UserService>('userService', userService);
  if (!container.has('errorHandler')) container.registerInstance('errorHandler', errorHandler);
  if (!container.has('loadingManager')) container.registerInstance('loadingManager', loadingManager);
}

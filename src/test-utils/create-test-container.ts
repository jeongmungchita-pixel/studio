import { ServiceContainer, registerDefaultServices } from '@/services/container';

/**
 * Test helper: create an isolated container with optional service overrides.
 * Usage:
 *   const { container, restore } = createTestContainer({ apiClient: mockApi });
 *   // ... run tests
 *   restore();
 */
export function createTestContainer(overrides?: Partial<Record<Parameters<ServiceContainer['registerInstance']>[0], unknown>>) {
  const container = ServiceContainer.getInstance();
  const snapshot = new Map<Parameters<ServiceContainer['registerInstance']>[0], unknown>();

  // Take snapshot of currently registered keys
  // (We only need to track keys we might override.)
  const keys = overrides ? (Object.keys(overrides) as Array<Parameters<ServiceContainer['registerInstance']>[0]>) : [];
  for (const k of keys) {
    if (container.has(k)) {
      snapshot.set(k, container.resolve<any>(k));
    }
  }

  // Register defaults then apply overrides
  registerDefaultServices(container);
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) {
      container.registerInstance(k as any, v as any);
    }
  }

  function restore() {
    // Restore previous instances for overridden keys or delete if none
    for (const k of keys) {
      if (snapshot.has(k)) {
        container.registerInstance(k, snapshot.get(k));
      } else {
        container.reset([k]);
      }
    }
  }

  return { container, restore };
}

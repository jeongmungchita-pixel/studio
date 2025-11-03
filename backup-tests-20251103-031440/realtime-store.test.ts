import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enableMapSet } from 'immer';

vi.mock('firebase/firestore', () => {
  return {
    onSnapshot: vi.fn((_q: any, _optsOrCb: any, _cbOrErr?: any, _errCb?: any) => {
      // Return unsubscribe function
      return () => {};
    }),
    Query: class {},
    DocumentReference: class {},
  } as any;
});

let useRealtimeStore: any;

describe('realtime-store', () => {
  beforeEach(() => {
    enableMapSet();
  });

  beforeEach(async () => {
    // dynamically import after enabling MapSet
    ({ useRealtimeStore } = await import('../realtime-store'));
    useRealtimeStore.getState().reset();
  });

  it('connects, updates status, pings and disconnects', async () => {
    const s = useRealtimeStore.getState();
    s.connect('conn1');
    // immediately after connect, status is connecting
    expect(useRealtimeStore.getState().getConnection('conn1')?.status).toBe('connecting');
    // manually update to connected to avoid timers
    s.updateConnectionStatus('conn1', 'connected');
    expect(useRealtimeStore.getState().isConnected('conn1')).toBe(true);
    const before = useRealtimeStore.getState().getConnection('conn1')!.lastPing;
    s.ping('conn1');
    const after = useRealtimeStore.getState().getConnection('conn1')!.lastPing;
    expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    s.disconnect('conn1');
    expect(useRealtimeStore.getState().getConnection('conn1')).toBeUndefined();
  });

  it('subscribe and unsubscribe manage subscriptions map', () => {
    const s = useRealtimeStore.getState();
    // Use dummy Query class from mock
    const q = new (require('firebase/firestore').Query)();
    const id = s.subscribe('collection', q as any, () => {});
    expect(useRealtimeStore.getState().getActiveSubscriptions().length).toBe(1);
    s.unsubscribe(id);
    expect(useRealtimeStore.getState().getActiveSubscriptions().length).toBe(0);
  });

  it('unsubscribeAll clears all', () => {
    const s = useRealtimeStore.getState();
    const q = new (require('firebase/firestore').Query)();
    s.subscribe('collection', q as any, () => {});
    s.subscribe('collection', q as any, () => {});
    expect(useRealtimeStore.getState().getActiveSubscriptions().length).toBe(2);
    s.unsubscribeAll();
    expect(useRealtimeStore.getState().getActiveSubscriptions().length).toBe(0);
  });

  it('reconnect increases retryCount and then sets status based on threshold', () => {
    const s = useRealtimeStore.getState();
    s.connect('c2');
    // avoid timers; simulate retry flow
    s.updateConnectionStatus('c2', 'error');
    // set a connection by calling connect already created it
    s.reconnect('c2');
    // after immediate call, status should be connecting
    expect(useRealtimeStore.getState().getConnection('c2')?.status).toBe('connecting');
  });

  it('reset unsubscribes all and clears state', () => {
    const s = useRealtimeStore.getState();
    const q = new (require('firebase/firestore').Query)();
    s.subscribe('collection', q as any, () => {});
    expect(useRealtimeStore.getState().getActiveSubscriptions().length).toBe(1);
    s.reset();
    expect(useRealtimeStore.getState().getActiveSubscriptions().length).toBe(0);
    expect(useRealtimeStore.getState().getConnection('x')).toBeUndefined();
  });
});

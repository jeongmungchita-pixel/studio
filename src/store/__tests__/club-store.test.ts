import { describe, it, expect, beforeEach } from 'vitest';
import { useClubStore } from '../club-store';

const getState = () => useClubStore.getState();

function makeClub(overrides: Partial<ReturnType<typeof getState>['currentClub']> = {}) {
  return ({
    id: 'c1',
    name: 'Club One',
    status: 'active',
    address: 'Seoul, Korea',
    ownerUserId: 'owner1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as unknown) as any;
}

describe('club-store', () => {
  beforeEach(() => {
    getState().reset();
  });

  it('has correct initial state', () => {
    const s = getState();
    expect(s.clubs).toEqual([]);
    expect(s.currentClub).toBeNull();
    expect(s.isLoading).toBe(false);
    expect(s.error).toBeNull();
    expect(s.lastUpdated).toBeNull();
  });

  it('setClubs and selectors work', () => {
    const s = getState();
    const clubA = makeClub({ id: 'a', name: 'A' });
    const clubB = makeClub({ id: 'b', name: 'B', status: 'inactive' });
    s.setClubs([clubA as any, clubB as any]);
    expect(getState().clubs.length).toBe(2);
    // selectors
    expect(getState().getClubById('a')?.name).toBe('A');
    expect(getState().getActiveClubs().map(c => c.id)).toEqual(['a']);
    expect(getState().getClubsByRegion('Seoul').length).toBe(2);
  });

  it('setCurrentClub, updateClub, removeClub', () => {
    const s = getState();
    const club = makeClub({ id: 'x', name: 'X' });
    s.setClubs([club as any]);
    s.setCurrentClub(club as any);
    expect(getState().currentClub?.id).toBe('x');
    s.updateClub('x', { name: 'X2' } as any);
    expect(getState().getClubById('x')?.name).toBe('X2');
    expect(getState().currentClub?.name).toBe('X2');
    s.removeClub('x');
    expect(getState().getClubById('x')).toBeUndefined();
    expect(getState().currentClub).toBeNull();
  });

  it('loading and error setters', () => {
    const s = getState();
    s.setLoading(true);
    expect(getState().isLoading).toBe(true);
    s.setError({ message: 'oops', statusCode: 500 } as any);
    expect(getState().error?.message).toBe('oops');
    expect(getState().isLoading).toBe(false);
  });

  it('reset clears data', () => {
    const s = getState();
    s.setClubs([makeClub() as any]);
    s.setCurrentClub(makeClub({ id: 'y' }) as any);
    s.setLoading(true);
    s.reset();
    const st = getState();
    expect(st.clubs).toEqual([]);
    expect(st.currentClub).toBeNull();
    expect(st.isLoading).toBe(false);
    expect(st.error).toBeNull();
    expect(st.lastUpdated).toBeNull();
  });
});

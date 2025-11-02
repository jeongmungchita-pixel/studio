import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventService } from '../event-service';
import { apiClient } from '@/lib/api/unified-api-client';

vi.mock('../api-client', () => {
  const real = vi.importActual<any>('../api-client');
  return {
    ...real,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      upload: vi.fn(),
      download: vi.fn(),
      getPaginated: vi.fn(),
    },
  };
});

describe('EventService', () => {
  let service: EventService;

  beforeEach(() => {
    (apiClient.get as any).mockReset();
    (apiClient.post as any).mockReset();
    (apiClient.put as any).mockReset();
    (apiClient.delete as any).mockReset();
    (apiClient.upload as any).mockReset();
    (apiClient.download as any).mockReset();
    (apiClient.getPaginated as any).mockReset();
    (EventService as any).instance = undefined;
    service = EventService.getInstance();
  });

  it('getEvents: returns paginated events', async () => {
    (apiClient.getPaginated as any).mockResolvedValueOnce({ items: [{ id: 'e1' }], total: 1, page: 1, pageSize: 20 });
    const res = await service.getEvents(1, 20, { clubId: 'c1' });
    expect(apiClient.getPaginated).toHaveBeenCalledWith('/events', expect.objectContaining({ page: 1, pageSize: 20, clubId: 'c1' }), { loadingKey: 'fetch-events' });
    expect(res.items[0].id).toBe('e1');
  });

  it('getEvent/create/update/delete', async () => {
    (apiClient.get as any).mockResolvedValueOnce({ id: 'e1' });
    const ev = await service.getEvent('e1');
    expect(apiClient.get).toHaveBeenCalledWith('/events/e1', { loadingKey: 'fetch-event' });
    expect(ev.id).toBe('e1');

    (apiClient.post as any).mockResolvedValueOnce({ id: 'e1' });
    const created = await service.createEvent({ title: 'T', description: 'D', clubId: 'c1', clubName: 'C', type: 'competition', startDate: '2024-01-01', endDate: '2024-01-02', location: 'Gym', currentParticipants: 0, targetAudience: [], status: 'draft' } as any);
    expect(apiClient.post).toHaveBeenCalledWith('/events', expect.any(Object), { loadingKey: 'create-event' });
    expect(created.id).toBe('e1');

    (apiClient.put as any).mockResolvedValueOnce({ id: 'e1', status: 'published' });
    const updated = await service.updateEvent('e1', { status: 'published' });
    expect(apiClient.put).toHaveBeenCalledWith('/events/e1', { status: 'published' }, { loadingKey: 'update-event' });
    expect(updated.status).toBe('published');

    (apiClient.delete as any).mockResolvedValueOnce({ id: 'e1' });
    const del = await service.deleteEvent('e1');
    expect(apiClient.delete).toHaveBeenCalledWith('/events/e1', { loadingKey: 'delete-event' });
    expect(del.id).toBe('e1');
  });

  it('search and by club', async () => {
    (apiClient.get as any).mockResolvedValueOnce([{ id: 'e1' }]);
    const search = await service.searchEvents('workshop');
    expect(apiClient.get).toHaveBeenCalledWith('/events/search', { params: { q: 'workshop' }, loadingKey: 'search-events' });
    expect(search.length).toBe(1);

    (apiClient.getPaginated as any).mockResolvedValueOnce({ items: [{ id: 'e1' }], total: 1, page: 1, pageSize: 100 });
    const byClub = await service.getEventsByClub('c1');
    expect(apiClient.getPaginated).toHaveBeenCalled();
    expect(byClub.length).toBe(1);
  });

  it('registration/cancel and stats/status', async () => {
    (apiClient.post as any).mockResolvedValueOnce({ registrationId: 'r1' });
    const reg = await service.registerForEvent('e1', 'm1');
    expect(apiClient.post).toHaveBeenCalledWith('/events/e1/registrations', { memberId: 'm1' }, { loadingKey: 'register-event' });
    expect(reg.registrationId).toBe('r1');

    (apiClient.delete as any).mockResolvedValueOnce({ id: 'r1' });
    const cancelled = await service.cancelRegistration('e1', 'r1');
    expect(apiClient.delete).toHaveBeenCalledWith('/events/e1/registrations/r1', { loadingKey: 'cancel-registration' });
    expect(cancelled.id).toBe('r1');

    (apiClient.get as any).mockResolvedValueOnce({ total: 10 });
    const stats = await service.getEventStats('e1');
    expect(apiClient.get).toHaveBeenCalledWith('/events/e1/stats', { loadingKey: 'fetch-event-stats' });
    expect(stats.total).toBe(10);

    const spy = vi.spyOn(service, 'updateEvent');
    spy.mockResolvedValue({ id: 'e1', status: 'registration-open' } as any);
    await service.changeEventStatus('e1', 'registration-open');
    expect(spy).toHaveBeenCalledWith('e1', { status: 'registration-open' });
  });

  it('singleton/clearCache', () => {
    const a = EventService.getInstance();
    const b = EventService.getInstance();
    expect(a).toBe(b);
    expect(() => a.clearCache()).not.toThrow();
  });
});

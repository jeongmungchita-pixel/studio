import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ServerValidator, UserSchemas, ClubSchemas, EventSchemas } from '../server-validator';
import { UserRole } from '@/types/auth';

describe('ServerValidator (more)', () => {
  describe('UserSchemas.updateRole/updateStatus', () => {
    it('updateRole valid data passes', () => {
      const data = { userId: 'uid_123', newRole: UserRole.MEMBER, reason: 'role change reason' };
      const parsed = ServerValidator.validate(UserSchemas.updateRole, data);
      expect(parsed).toEqual(data);
    });

    it('updateRole requires reason length >= 10', () => {
      const data = { userId: 'uid_123', newRole: UserRole.MEMBER, reason: 'short' } as any;
      expect(() => ServerValidator.validate(UserSchemas.updateRole, data)).toThrowError();
    });

    it('updateStatus valid data passes', () => {
      const data = { userId: 'uid_123', status: 'active' as const, reason: 'optional ok' };
      const parsed = ServerValidator.validate(UserSchemas.updateStatus, data);
      expect(parsed.status).toBe('active');
    });

    it('updateStatus rejects invalid status', () => {
      const data = { userId: 'uid_123', status: 'blocked' } as any;
      expect(() => ServerValidator.validate(UserSchemas.updateStatus, data)).toThrowError();
    });
  });

  describe('ClubSchemas', () => {
    it('createClub minimal valid passes', () => {
      const data = {
        name: 'Club A', description: 'desc', address: 'Seoul City Road 12345',
        phoneNumber: '010-1234-5678', email: 'club@example.com'
      };
      const parsed = ServerValidator.validate(ClubSchemas.createClub, data);
      expect(parsed.name).toBe('Club A');
    });

    it('updateClub accepts partial fields', () => {
      const parsed = ServerValidator.validate(ClubSchemas.updateClub, { name: 'Club B' });
      expect(parsed.name).toBe('Club B');
    });
  });

  describe('EventSchemas', () => {
    it('createEvent success when endDate > startDate', () => {
      const data = {
        title: 'Seminar', startDate: new Date('2024-01-01').toISOString(), endDate: new Date('2024-01-02').toISOString(),
        location: 'Seoul', category: 'seminar', isPublic: true
      } as any;
      const parsed = ServerValidator.validate(EventSchemas.createEvent, data);
      expect(parsed.title).toBe('Seminar');
    });

    it('registerEvent validates nested participantInfo', () => {
      const data = { eventId: 'abc123', participantInfo: { name: 'Kim', email: 'u@e.com', phone: '010-1111-2222' } };
      const parsed = ServerValidator.validate(EventSchemas.registerEvent, data);
      expect(parsed.eventId).toBe('abc123');
    });
  });

  describe('validateWithPermission', () => {
    it('throws 403 when role not in requiredRoles', () => {
      const schema = z.object({ x: z.string() });
      expect(() => ServerValidator.validateWithPermission(schema, { x: '1' }, UserRole.MEMBER, [UserRole.SUPER_ADMIN]))
        .toThrowError();
    });
  });

  describe('rate limit', () => {
    it('increments and throws on exceeding limit', () => {
      const storage = new Map<string, { count: number; resetTime: number }>();
      const id = 'ip:1';
      // first call initializes
      ServerValidator.validateRateLimit(id, 2, 1000, storage);
      ServerValidator.validateRateLimit(id, 2, 1000, storage);
      expect(() => ServerValidator.validateRateLimit(id, 2, 1000, storage)).toThrowError();
    });
  });
});

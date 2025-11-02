import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { BaseSchemas, ServerValidator, EventSchemas } from '../server-validator';

function repeat(char: string, len: number) { return new Array(len + 1).join(char); }

describe('ServerValidator boundaries', () => {
  describe('BaseSchemas.email length and format', () => {
    it('rejects overly long emails (>254)', () => {
      const base = 'user@' + 'a'.repeat(250) + '.com'; // definitely > 254
      const schema = z.object({ email: BaseSchemas.email });
      expect(() => ServerValidator.validate(schema, { email: base })).toThrow();
    });
  });

  describe('BaseSchemas.url max length', () => {
    it('accepts 2048 length and rejects 2049', () => {
      const base = 'http://example.com/';
      const fillerLen = 2048 - base.length;
      const ok = base + repeat('a', fillerLen);
      const bad = base + repeat('a', fillerLen + 1);
      const schema = z.object({ url: BaseSchemas.url });
      expect(() => ServerValidator.validate(schema, { url: ok })).not.toThrow();
      expect(() => ServerValidator.validate(schema, { url: bad })).toThrow();
    });
  });

  describe('BaseSchemas.fileSize boundary', () => {
    it('accepts 10MB-1 and rejects 10MB+1 via file upload validator', () => {
      const ok = 10 * 1024 * 1024 - 1;
      const bad = 10 * 1024 * 1024 + 1;
      expect(() => ServerValidator.validateFileUpload({ name: 'f.pdf', size: ok, type: 'application/pdf' })).not.toThrow();
      expect(() => ServerValidator.validateFileUpload({ name: 'f.pdf', size: bad, type: 'application/pdf' })).toThrow();
    });
  });

  describe('Event date refine', () => {
    it('fails when endDate equals startDate, passes when greater', () => {
      const start = new Date('2024-01-01').toISOString();
      const same = new Date('2024-01-01').toISOString();
      const end = new Date('2024-01-02').toISOString();
      const base = { title: 'Title', description: 'desc', location: 'Loc', category: 'training', isPublic: true } as any;
      const schema = EventSchemas.createEvent;
      expect(() => ServerValidator.validate(schema, { ...base, startDate: start, endDate: same })).toThrow();
      expect(() => ServerValidator.validate(schema, { ...base, startDate: start, endDate: end })).not.toThrow();
    });
  });
});

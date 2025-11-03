import { describe, it, expect } from 'vitest';
import {
  APP_CONFIG,
  PAGINATION,
  FILE_UPLOAD,
  CACHE_CONFIG,
  NOTIFICATION_CONFIG,
  DATE_FORMATS,
  GYMNASTICS_LEVELS,
  STATUS_TRANSLATIONS,
  AGE_GROUPS,
  GENDER_OPTIONS,
  WEEKDAYS,
  PAYMENT_METHODS,
  GYMNASTICS_EVENTS
} from '../config';

describe('Config Constants', () => {
  describe('APP_CONFIG', () => {
    it('should have basic app information', () => {
      expect(APP_CONFIG.NAME).toBe('KGF 넥서스');
      expect(APP_CONFIG.DESCRIPTION).toBe('대한체조연맹 통합 관리 시스템');
      expect(APP_CONFIG.VERSION).toBeDefined();
      expect(APP_CONFIG.AUTHOR).toBeDefined();
    });

    it('should have contact information', () => {
      expect(APP_CONFIG.CONTACT.EMAIL).toContain('@');
      expect(APP_CONFIG.CONTACT.PHONE).toBeDefined();
      expect(APP_CONFIG.CONTACT.ADDRESS).toBeDefined();
    });

    it('should have social media links', () => {
      expect(APP_CONFIG.SOCIAL.WEBSITE).toContain('https://');
      expect(APP_CONFIG.SOCIAL.FACEBOOK).toContain('facebook.com');
      expect(APP_CONFIG.SOCIAL.INSTAGRAM).toContain('instagram.com');
      expect(APP_CONFIG.SOCIAL.YOUTUBE).toContain('youtube.com');
    });
  });

  describe('PAGINATION', () => {
    it('should have default page size', () => {
      expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(20);
      expect(PAGINATION.MAX_PAGE_SIZE).toBe(100);
    });

    it('should have page size options', () => {
      expect(PAGINATION.SIZES).toContain(10);
      expect(PAGINATION.SIZES).toContain(20);
      expect(PAGINATION.SIZES).toContain(50);
      expect(PAGINATION.SIZES).toContain(100);
    });

    it('should not exceed max page size', () => {
      PAGINATION.SIZES.forEach(size => {
        expect(size).toBeLessThanOrEqual(PAGINATION.MAX_PAGE_SIZE);
      });
    });
  });

  describe('FILE_UPLOAD', () => {
    it('should have file size limits', () => {
      expect(FILE_UPLOAD.MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10MB
      expect(FILE_UPLOAD.MAX_IMAGE_SIZE).toBe(5 * 1024 * 1024); // 5MB
      expect(FILE_UPLOAD.MAX_VIDEO_SIZE).toBe(50 * 1024 * 1024); // 50MB
    });

    it('should have allowed image types', () => {
      expect(FILE_UPLOAD.ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
      expect(FILE_UPLOAD.ALLOWED_IMAGE_TYPES).toContain('image/png');
      expect(FILE_UPLOAD.ALLOWED_IMAGE_TYPES).toContain('image/webp');
    });

    it('should have allowed video types', () => {
      expect(FILE_UPLOAD.ALLOWED_VIDEO_TYPES).toContain('video/mp4');
      expect(FILE_UPLOAD.ALLOWED_VIDEO_TYPES).toContain('video/webm');
    });

    it('should have allowed document types', () => {
      expect(FILE_UPLOAD.ALLOWED_DOCUMENT_TYPES).toContain('application/pdf');
    });
  });

  describe('CACHE_CONFIG', () => {
    it('should have cache durations in milliseconds', () => {
      expect(CACHE_CONFIG.DURATIONS.SHORT).toBe(5 * 60 * 1000); // 5 minutes
      expect(CACHE_CONFIG.DURATIONS.MEDIUM).toBe(15 * 60 * 1000); // 15 minutes
      expect(CACHE_CONFIG.DURATIONS.LONG).toBe(60 * 60 * 1000); // 1 hour
      expect(CACHE_CONFIG.DURATIONS.VERY_LONG).toBe(24 * 60 * 60 * 1000); // 24 hours
    });

    it('should have cache keys', () => {
      expect(CACHE_CONFIG.KEYS.USER_PROFILE).toBe('user_profile');
      expect(CACHE_CONFIG.KEYS.CLUBS).toBe('clubs');
      expect(CACHE_CONFIG.KEYS.MEMBERS).toBe('members');
      expect(CACHE_CONFIG.KEYS.CLASSES).toBe('classes');
      expect(CACHE_CONFIG.KEYS.EVENTS).toBe('events');
    });
  });

  describe('NOTIFICATION_CONFIG', () => {
    it('should have notification types', () => {
      expect(NOTIFICATION_CONFIG.TYPES.SUCCESS).toBe('success');
      expect(NOTIFICATION_CONFIG.TYPES.ERROR).toBe('error');
      expect(NOTIFICATION_CONFIG.TYPES.WARNING).toBe('warning');
      expect(NOTIFICATION_CONFIG.TYPES.INFO).toBe('info');
    });

    it('should have notification durations', () => {
      expect(NOTIFICATION_CONFIG.DURATIONS.SHORT).toBe(3000);
      expect(NOTIFICATION_CONFIG.DURATIONS.MEDIUM).toBe(5000);
      expect(NOTIFICATION_CONFIG.DURATIONS.LONG).toBe(8000);
      expect(NOTIFICATION_CONFIG.DURATIONS.PERSISTENT).toBe(0);
    });
  });

  describe('DATE_FORMATS', () => {
    it('should have various date format strings', () => {
      expect(DATE_FORMATS.DATE).toBe('YYYY-MM-DD');
      expect(DATE_FORMATS.TIME).toBe('HH:mm');
      expect(DATE_FORMATS.DATETIME).toBe('YYYY-MM-DD HH:mm');
      expect(DATE_FORMATS.DISPLAY_DATE).toBe('YYYY년 MM월 DD일');
      expect(DATE_FORMATS.DISPLAY_DATETIME).toBe('YYYY년 MM월 DD일 HH:mm');
      expect(DATE_FORMATS.ISO).toBe('YYYY-MM-DDTHH:mm:ss.SSSZ');
    });
  });

  describe('GYMNASTICS_LEVELS', () => {
    it('should have 6 levels', () => {
      expect(GYMNASTICS_LEVELS).toHaveLength(6);
    });

    it('should have beginner level', () => {
      const beginner = GYMNASTICS_LEVELS.find(l => l.id === 'beginner');
      expect(beginner).toBeDefined();
      expect(beginner?.name).toBe('입문');
      expect(beginner?.minScore).toBe(0);
      expect(beginner?.maxScore).toBe(59);
    });

    it('should have master level', () => {
      const master = GYMNASTICS_LEVELS.find(l => l.id === 'master');
      expect(master).toBeDefined();
      expect(master?.name).toBe('마스터');
      expect(master?.minScore).toBe(96);
      expect(master?.maxScore).toBe(100);
    });

    it('should be ordered correctly', () => {
      for (let i = 0; i < GYMNASTICS_LEVELS.length - 1; i++) {
        expect(GYMNASTICS_LEVELS[i].order).toBeLessThan(GYMNASTICS_LEVELS[i + 1].order);
      }
    });

    it('should have continuous score ranges', () => {
      for (let i = 0; i < GYMNASTICS_LEVELS.length - 1; i++) {
        const currentMax = GYMNASTICS_LEVELS[i].maxScore;
        const nextMin = GYMNASTICS_LEVELS[i + 1].minScore;
        expect(nextMin).toBe(currentMax + 1);
      }
    });
  });

  describe('STATUS_TRANSLATIONS', () => {
    it('should have member status translations', () => {
      expect(STATUS_TRANSLATIONS.MEMBER.active).toBe('활동중');
      expect(STATUS_TRANSLATIONS.MEMBER.inactive).toBe('비활동');
      expect(STATUS_TRANSLATIONS.MEMBER.pending).toBe('승인대기');
    });

    it('should have payment status translations', () => {
      expect(STATUS_TRANSLATIONS.PAYMENT.pending).toBe('결제대기');
      expect(STATUS_TRANSLATIONS.PAYMENT.paid).toBe('결제완료');
      expect(STATUS_TRANSLATIONS.PAYMENT.overdue).toBe('연체');
      expect(STATUS_TRANSLATIONS.PAYMENT.refunded).toBe('환불완료');
    });

    it('should have pass status translations', () => {
      expect(STATUS_TRANSLATIONS.PASS.active).toBe('사용중');
      expect(STATUS_TRANSLATIONS.PASS.expired).toBe('만료됨');
      expect(STATUS_TRANSLATIONS.PASS.suspended).toBe('일시정지');
      expect(STATUS_TRANSLATIONS.PASS.cancelled).toBe('취소됨');
    });
  });

  describe('AGE_GROUPS', () => {
    it('should have 5 age groups', () => {
      expect(AGE_GROUPS).toHaveLength(5);
    });

    it('should cover all age ranges', () => {
      const minAge = Math.min(...AGE_GROUPS.map(g => g.minAge));
      const maxAge = Math.max(...AGE_GROUPS.map(g => g.maxAge));
      expect(minAge).toBe(3);
      expect(maxAge).toBe(100);
    });

    it('should have sequential age ranges', () => {
      const sorted = [...AGE_GROUPS].sort((a, b) => a.minAge - b.minAge);
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].maxAge).toBeLessThan(sorted[i + 1].minAge);
      }
    });
  });

  describe('GENDER_OPTIONS', () => {
    it('should have 3 gender options', () => {
      expect(GENDER_OPTIONS).toHaveLength(3);
    });

    it('should include male, female, and other', () => {
      const values = GENDER_OPTIONS.map(g => g.value);
      expect(values).toContain('male');
      expect(values).toContain('female');
      expect(values).toContain('other');
    });
  });

  describe('WEEKDAYS', () => {
    it('should have 7 weekdays', () => {
      expect(WEEKDAYS).toHaveLength(7);
    });

    it('should start from Sunday (0) to Saturday (6)', () => {
      expect(WEEKDAYS[0].id).toBe(0);
      expect(WEEKDAYS[0].name).toBe('일요일');
      expect(WEEKDAYS[6].id).toBe(6);
      expect(WEEKDAYS[6].name).toBe('토요일');
    });

    it('should have short names', () => {
      WEEKDAYS.forEach(day => {
        expect(day.short).toHaveLength(1);
      });
    });
  });

  describe('PAYMENT_METHODS', () => {
    it('should have 4 payment methods', () => {
      expect(PAYMENT_METHODS).toHaveLength(4);
    });

    it('should have icons for each method', () => {
      PAYMENT_METHODS.forEach(method => {
        expect(method.icon).toBeDefined();
        expect(method.icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe('GYMNASTICS_EVENTS', () => {
    it('should have 6 gymnastics events', () => {
      expect(GYMNASTICS_EVENTS).toHaveLength(6);
    });

    it('should include all major gymnastics events', () => {
      const eventIds = GYMNASTICS_EVENTS.map(e => e.id);
      expect(eventIds).toContain('floor');
      expect(eventIds).toContain('vault');
      expect(eventIds).toContain('bars');
      expect(eventIds).toContain('beam');
      expect(eventIds).toContain('rings');
      expect(eventIds).toContain('parallel_bars');
    });

    it('should have icons for each event', () => {
      GYMNASTICS_EVENTS.forEach(event => {
        expect(event.icon).toBeDefined();
        expect(event.icon.length).toBeGreaterThan(0);
      });
    });
  });
});

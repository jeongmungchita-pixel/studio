import { describe, it, expect, vi } from 'vitest';
import {
  createArrayUpdater,
  createFormValidator,
  commonValidationRules,
  childValidationRules,
  type ChildFormData,
} from '../form-helpers';

describe('Form Helpers (more)', () => {
  describe('createArrayUpdater - extra ops', () => {
    it('moveItem should move item between indices', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const setItems = vi.fn();
      const updater = createArrayUpdater(items, setItems);

      updater.moveItem(0, 2);

      expect(setItems).toHaveBeenCalledWith([{ id: 2 }, { id: 3 }, { id: 1 }]);
    });

    it('clearItems should reset to empty array', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const setItems = vi.fn();
      const updater = createArrayUpdater(items, setItems);

      updater.clearItems();
      expect(setItems).toHaveBeenCalledWith([]);
    });
  });

  describe('createFormValidator - edge', () => {
    it('validateField returns null when rule missing', () => {
      const rules = { name: commonValidationRules.required } as any;
      const validator = createFormValidator<{ name: string; email: string }>(rules);
      expect(validator.validateField('email', '')).toBeNull();
    });

    it('hasErrors should detect any non-null error', () => {
      const rules = { name: commonValidationRules.required } as any;
      const validator = createFormValidator<{ name: string }>(rules);
      const errors = validator.validateForm({ name: '' as any });
      expect(validator.hasErrors(errors)).toBe(true);
    });
  });

  describe('commonValidationRules - bounds', () => {
    it('minLength and maxLength boundaries', () => {
      const min2 = commonValidationRules.minLength(2);
      const max4 = commonValidationRules.maxLength(4);

      expect(min2('a')).toBe('최소 2자 이상 입력해주세요.');
      expect(min2('ab')).toBeNull();

      expect(max4('abcd')).toBeNull();
      expect(max4('abcde')).toBe('최대 4자까지 입력 가능합니다.');
    });

    it('futureDate and pastDate rules', () => {
      const today = new Date();
      const past = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const future = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      // Format as local date (YYYY-MM-DD)
      const fmt = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const pastStr = fmt(past);
      const todayStr = fmt(today);
      const futureStr = fmt(future);

      // futureDate: today or future is OK
      expect(commonValidationRules.futureDate(todayStr)).toBeNull();
      expect(commonValidationRules.futureDate(futureStr)).toBeNull();
      expect(commonValidationRules.futureDate(pastStr)).toBe('오늘 이후의 날짜를 선택해주세요.');

      // pastDate: today or past is OK
      expect(commonValidationRules.pastDate(todayStr)).toBeNull();
      expect(commonValidationRules.pastDate(pastStr)).toBeNull();
      expect(commonValidationRules.pastDate(futureStr)).toBe('오늘 이전의 날짜를 선택해주세요.');
    });
  });

  describe('childValidationRules - type coverage', () => {
    it('grade is optional and always valid', () => {
      // grade는 인자 없이 호출 가능
      expect(childValidationRules.grade()).toBeNull();
      // any 캐스팅으로 런타임 분기 커버
      expect((childValidationRules as any).grade('초1')).toBeNull();
    });
  });
});

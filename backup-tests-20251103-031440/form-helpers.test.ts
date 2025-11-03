import { vi } from 'vitest';
import { createArrayUpdater, createFormValidator, commonValidationRules, createFormState, childValidationRules } from '@/utils/form-helpers';

describe('Form Helpers', () => {
  describe('createArrayUpdater', () => {
    it('should update item correctly', () => {
      const items = [{ id: 1, name: 'test' }];
      const setItems = vi.fn();
      const updater = createArrayUpdater(items, setItems);

      updater.updateItem(0, 'name', 'updated');

      expect(setItems).toHaveBeenCalledWith([{ id: 1, name: 'updated' }]);
    });

    it('should add item correctly', () => {
      const items = [{ id: 1, name: 'test' }];
      const setItems = vi.fn();
      const updater = createArrayUpdater(items, setItems);

      updater.addItem({ id: 2, name: 'new' });

      expect(setItems).toHaveBeenCalledWith([
        { id: 1, name: 'test' },
        { id: 2, name: 'new' }
      ]);
    });

    it('should remove item correctly', () => {
      const items = [{ id: 1, name: 'test' }, { id: 2, name: 'test2' }];
      const setItems = vi.fn();
      const updater = createArrayUpdater(items, setItems);

      updater.removeItem(0);

      expect(setItems).toHaveBeenCalledWith([{ id: 2, name: 'test2' }]);
    });
  });

  describe('createFormValidator', () => {
    const rules = {
      name: (value: unknown) => (typeof value === 'string' && value.trim().length > 0) ? null : 'Name is required',
      email: (value: unknown) => (typeof value === 'string' && value.includes('@')) ? null : 'Invalid email'
    } as Record<'name' | 'email', (value: unknown) => string | null>;

    it('should validate field correctly', () => {
      const validator = createFormValidator(rules);

      expect(validator.validateField('name', '')).toBe('Name is required');
      expect(validator.validateField('name', 'John')).toBe(null);
    });

    it('should validate form correctly', () => {
      const validator = createFormValidator(rules);
      const data = { name: '', email: 'invalid' };

      const errors = validator.validateForm(data);

      expect(errors.name).toBe('Name is required');
      expect(errors.email).toBe('Invalid email');
    });

    it('should detect errors correctly', () => {
      const validator = createFormValidator(rules);

      expect(validator.hasErrors({ name: null, email: null })).toBe(false);
      expect(validator.hasErrors({ name: 'error', email: null })).toBe(true);
    });
  });

  describe('commonValidationRules', () => {
    it('should validate required fields', () => {
      expect(commonValidationRules.required('')).toBe('필수 입력 항목입니다.');
      expect(commonValidationRules.required('  ')).toBe('필수 입력 항목입니다.');
      expect(commonValidationRules.required('value')).toBe(null);
    });

    it('should validate email format', () => {
      expect(commonValidationRules.email('invalid')).toBe('올바른 이메일 형식이 아닙니다.');
      expect(commonValidationRules.email('test@example.com')).toBe(null);
      expect(commonValidationRules.email('')).toBe(null);
    });

    it('should validate phone format', () => {
      expect(commonValidationRules.phone('invalid')).toBe('올바른 전화번호 형식이 아닙니다.');
      expect(commonValidationRules.phone('010-1234-5678')).toBe(null);
      expect(commonValidationRules.phone('01012345678')).toBe(null);
    });

    it('should validate date format', () => {
      expect(commonValidationRules.dateFormat('invalid')).toBe('올바른 날짜 형식(YYYY-MM-DD)이 아닙니다.');
      expect(commonValidationRules.dateFormat('2023-12-25')).toBe(null);
    });
  });

  describe('createFormState', () => {
    it('should create initial form state', () => {
      const initialData = { name: '', email: '' };
      const state = createFormState(initialData);

      expect(state.data).toEqual(initialData);
      expect(state.errors).toEqual({});
      expect(state.touched).toEqual({});
      expect(state.isSubmitting).toBe(false);
      expect(state.isValid).toBe(true);
    });
  });

  describe('childValidationRules', () => {
    it('should validate child name', () => {
      expect(childValidationRules.name('')).toBe('필수 입력 항목입니다.');
      expect(childValidationRules.name('John')).toBe(null);
    });

    it('should validate child birth date', () => {
      const today = new Date();
      const fmt = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const todayStr = fmt(today);
      const futureDateStr = fmt(new Date(today.getTime() + 86400000));
      
      expect(childValidationRules.birthDate('')).toBe('필수 입력 항목입니다.');
      expect(childValidationRules.birthDate('invalid')).toBe('올바른 날짜 형식(YYYY-MM-DD)이 아닙니다.');
      // For birthDate (pastDate), future should be invalid
      expect(childValidationRules.birthDate(futureDateStr)).toBe('오늘 이전의 날짜를 선택해주세요.');
      // Today is valid
      expect(childValidationRules.birthDate(todayStr)).toBe(null);
      expect(childValidationRules.birthDate('2020-01-01')).toBe(null);
    });
  });
});

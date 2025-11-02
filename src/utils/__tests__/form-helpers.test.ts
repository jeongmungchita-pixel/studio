import { describe, it, expect, vi } from 'vitest';
import { 
  createArrayUpdater,
  createFormValidator,
  commonValidationRules,
  createFormState,
  childValidationRules,
  type ChildFormData
} from '../form-helpers';

describe('Form Helpers', () => {
  describe('createArrayUpdater', () => {
    it('should update item correctly', () => {
      const items = [{ name: 'John', age: 30 }];
      const setItems = vi.fn();
      const updater = createArrayUpdater(items, setItems);
      
      updater.updateItem(0, 'name', 'Jane');
      
      expect(setItems).toHaveBeenCalledWith([{ name: 'Jane', age: 30 }]);
    });

    it('should add item correctly', () => {
      const items = [{ name: 'John' }];
      const setItems = vi.fn();
      const updater = createArrayUpdater(items, setItems);
      
      updater.addItem({ name: 'Jane' });
      
      expect(setItems).toHaveBeenCalledWith([{ name: 'John' }, { name: 'Jane' }]);
    });

    it('should remove item correctly', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const setItems = vi.fn();
      const updater = createArrayUpdater(items, setItems);
      
      updater.removeItem(1);
      
      expect(setItems).toHaveBeenCalledWith([{ id: 1 }, { id: 3 }]);
    });
  });

  describe('createFormValidator', () => {
    const validationRules = {
      name: (value: unknown) => !value ? '필수 항목입니다' : null,
      email: (value: unknown) => {
        const str = String(value);
        return str.includes('@') ? null : '이메일 형식이 아닙니다';
      }
    };

    it('should validate field correctly', () => {
      const validator = createFormValidator(validationRules);
      
      expect(validator.validateField('name', '')).toBe('필수 항목입니다');
      expect(validator.validateField('name', 'John')).toBeNull();
      expect(validator.validateField('email', 'test')).toBe('이메일 형식이 아닙니다');
      expect(validator.validateField('email', 'test@example.com')).toBeNull();
    });

    it('should validate form correctly', () => {
      const validator = createFormValidator(validationRules);
      const data = { name: '', email: 'invalid' };
      
      const errors = validator.validateForm(data);
      
      expect(errors.name).toBe('필수 항목입니다');
      expect(errors.email).toBe('이메일 형식이 아닙니다');
    });

    it('should detect errors correctly', () => {
      const validator = createFormValidator(validationRules);
      
      expect(validator.hasErrors({ name: null, email: null })).toBe(false);
      expect(validator.hasErrors({ name: '에러', email: null })).toBe(true);
    });
  });

  describe('commonValidationRules', () => {
    it('should validate required fields', () => {
      expect(commonValidationRules.required('')).toBe('필수 입력 항목입니다.');
      expect(commonValidationRules.required('  ')).toBe('필수 입력 항목입니다.');
      expect(commonValidationRules.required('value')).toBeNull();
    });

    it('should validate email format', () => {
      expect(commonValidationRules.email('')).toBeNull();
      expect(commonValidationRules.email('invalid')).toBe('올바른 이메일 형식이 아닙니다.');
      expect(commonValidationRules.email('test@example.com')).toBeNull();
    });

    it('should validate phone format', () => {
      expect(commonValidationRules.phone('')).toBeNull();
      expect(commonValidationRules.phone('123')).toBe('올바른 전화번호 형식이 아닙니다.');
      expect(commonValidationRules.phone('010-1234-5678')).toBeNull();
      expect(commonValidationRules.phone('01012345678')).toBeNull();
    });

    it('should validate date format', () => {
      expect(commonValidationRules.dateFormat('')).toBeNull();
      expect(commonValidationRules.dateFormat('invalid')).toBe('올바른 날짜 형식(YYYY-MM-DD)이 아닙니다.');
      expect(commonValidationRules.dateFormat('2024-01-01')).toBeNull();
    });
  });

  describe('createFormState', () => {
    it('should create initial form state', () => {
      const initialData = { name: 'John', age: 30 };
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
      expect(childValidationRules.name('홍길동')).toBeNull();
    });

    it('should validate child birth date', () => {
      expect(childValidationRules.birthDate('')).toBe('필수 입력 항목입니다.');
      expect(childValidationRules.birthDate('invalid')).toBe('올바른 날짜 형식(YYYY-MM-DD)이 아닙니다.');
      
      // Past date
      expect(childValidationRules.birthDate('2020-01-01')).toBeNull();
      
      // Future date (format as local YYYY-MM-DD to avoid timezone issues)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const fmt = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const futureDateStr = fmt(futureDate);
      expect(childValidationRules.birthDate(futureDateStr)).toBe('오늘 이전의 날짜를 선택해주세요.');
    });
  });
});

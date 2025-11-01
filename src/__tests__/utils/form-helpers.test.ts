import { createArrayUpdater, createFormValidator, commonValidationRules, createFormState, childValidationRules } from '@/utils/form-helpers';

describe('Form Helpers', () => {
  describe('createArrayUpdater', () => {
    it('should update item correctly', () => {
      const items = [{ id: 1, name: 'test' }];
      const setItems = jest.fn();
      const updater = createArrayUpdater(items, setItems);

      updater.updateItem(0, 'name', 'updated');

      expect(setItems).toHaveBeenCalledWith([{ id: 1, name: 'updated' }]);
    });

    it('should add item correctly', () => {
      const items = [{ id: 1, name: 'test' }];
      const setItems = jest.fn();
      const updater = createArrayUpdater(items, setItems);

      updater.addItem({ id: 2, name: 'new' });

      expect(setItems).toHaveBeenCalledWith([
        { id: 1, name: 'test' },
        { id: 2, name: 'new' }
      ]);
    });

    it('should remove item correctly', () => {
      const items = [{ id: 1, name: 'test' }, { id: 2, name: 'test2' }];
      const setItems = jest.fn();
      const updater = createArrayUpdater(items, setItems);

      updater.removeItem(0);

      expect(setItems).toHaveBeenCalledWith([{ id: 2, name: 'test2' }]);
    });
  });

  describe('createFormValidator', () => {
    const rules = {
      name: (value: string) => value ? null : 'Name is required',
      email: (value: string) => value.includes('@') ? null : 'Invalid email'
    };

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
      const _today = new Date().toISOString().split('T')[0];
      const futureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      
      expect(childValidationRules.birthDate('')).toBe('필수 입력 항목입니다.');
      expect(childValidationRules.birthDate('invalid')).toBe('올바른 날짜 형식(YYYY-MM-DD)이 아닙니다.');
      expect(childValidationRules.birthDate(futureDate)).toBe('오늘 이전의 날짜를 선택해주세요.');
      expect(childValidationRules.birthDate('2020-01-01')).toBe(null);
    });
  });
});

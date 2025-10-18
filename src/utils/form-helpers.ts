'use client';

// ============================================
// 📝 폼 헬퍼 유틸리티
// ============================================

// 배열 아이템 업데이트 헬퍼
export function createArrayUpdater<T>(
  items: T[],
  setItems: (items: T[]) => void
) {
  return {
    // 아이템 업데이트
    updateItem: <K extends keyof T>(index: number, field: K, value: T[K]) => {
      const updated = [...items];
      updated[index] = { ...updated[index], [field]: value };
      setItems(updated);
    },

    // 아이템 추가
    addItem: (newItem: T) => {
      setItems([...items, newItem]);
    },

    // 아이템 제거
    removeItem: (index: number) => {
      setItems(items.filter((_, i) => i !== index));
    },

    // 아이템 이동
    moveItem: (fromIndex: number, toIndex: number) => {
      const updated = [...items];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
      setItems(updated);
    },

    // 전체 초기화
    clearItems: () => {
      setItems([]);
    }
  };
}

// 폼 검증 헬퍼
type FieldValidator<TField> = (value: TField) => string | null;
type UnknownValidator = (value: unknown) => string | null;

type Validator<TField> = FieldValidator<TField> | UnknownValidator;

export function createFormValidator<T>(validationRules: {
  [K in keyof T]?: Validator<T[K]>;
}) {
  return {
    validateField: <K extends keyof T>(field: K, value: T[K]): string | null => {
      const rule = validationRules[field];
      return rule ? rule(value) : null;
    },

    validateForm: (data: T): Record<keyof T, string | null> => {
      const errors = {} as Record<keyof T, string | null>;
      
      (Object.keys(validationRules) as Array<keyof T>).forEach(field => {
        const rule = validationRules[field];
        errors[field] = rule ? rule(data[field]) : null;
      });
      
      return errors;
    },

    validateWithUnknownValue: (field: keyof T, value: unknown): string | null => {
      const rule = validationRules[field];
      if (!rule) return null;
      return rule(value as T[keyof T]);
    },

    validateFormWithUnknownData: (data: Partial<Record<keyof T, unknown>>): Record<keyof T, string | null> => {
      const errors = {} as Record<keyof T, string | null>;
      
      (Object.keys(validationRules) as Array<keyof T>).forEach(field => {
        const rule = validationRules[field];
        const value = data[field];
        errors[field] = rule ? rule(value as T[keyof T]) : null;
      });
      
      return errors;
    },

    hasErrors: (errors: Record<keyof T, string | null>): boolean => {
      return Object.values(errors).some(error => error !== null);
    }
  };
}

// 공통 검증 규칙들
export const commonValidationRules = {
  required: (value: unknown) => {
    if (value === null || value === undefined) {
      return '필수 입력 항목입니다.';
    }
    if (typeof value === 'string') {
      return value.trim() === '' ? '필수 입력 항목입니다.' : null;
    }
    if (Array.isArray(value)) {
      return value.length === 0 ? '필수 입력 항목입니다.' : null;
    }
    return null;
  },

  email: (value: unknown) => {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : '올바른 이메일 형식이 아닙니다.';
  },

  phone: (value: unknown) => {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const phoneRegex = /^01[0-9]-?[0-9]{4}-?[0-9]{4}$/;
    const normalized = value.replace(/-/g, '');
    return phoneRegex.test(normalized) ? null : '올바른 전화번호 형식이 아닙니다.';
  },

  minLength: (min: number) => (value: unknown) => {
    if (typeof value !== 'string' || value.trim() === '') return null;
    return value.length >= min ? null : `최소 ${min}자 이상 입력해주세요.`;
  },

  maxLength: (max: number) => (value: unknown) => {
    if (typeof value !== 'string' || value.trim() === '') return null;
    return value.length <= max ? null : `최대 ${max}자까지 입력 가능합니다.`;
  },

  dateFormat: (value: unknown) => {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(value) ? null : '올바른 날짜 형식(YYYY-MM-DD)이 아닙니다.';
  },

  futureDate: (value: unknown) => {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const inputDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate >= today ? null : '오늘 이후의 날짜를 선택해주세요.';
  },

  pastDate: (value: unknown) => {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const inputDate = new Date(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return inputDate <= today ? null : '오늘 이전의 날짜를 선택해주세요.';
  }
};

// 폼 상태 관리 헬퍼
export function createFormState<T>(initialData: T) {
  return {
    data: initialData,
    errors: {} as Record<keyof T, string | null>,
    touched: {} as Record<keyof T, boolean>,
    isSubmitting: false,
    isValid: true
  };
}

// 자식 데이터 타입 (공통 사용)
export interface ChildFormData {
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  grade?: string;
}

// 자식 폼 검증 규칙
export const childValidationRules = {
  name: commonValidationRules.required,
  birthDate: (value: string) => {
    const requiredError = commonValidationRules.required(value);
    if (requiredError) return requiredError;
    
    const formatError = commonValidationRules.dateFormat(value);
    if (formatError) return formatError;
    
    return commonValidationRules.pastDate(value);
  },
  gender: commonValidationRules.required,
  grade: () => null // 선택사항
};

import { APIError } from '@/lib/error/error-manager';
export type ConflictResolutionStrategy = 
  | 'local'      // 로컬 변경사항 우선
  | 'remote'     // 서버 변경사항 우선
  | 'merge'      // 자동 병합
  | 'manual';    // 수동 해결
export interface ConflictData<T> {
  local: T;
  remote: T;
  base?: T; // 공통 조상 (3-way merge용)
  timestamp: {
    local: string;
    remote: string;
  };
}
export interface ConflictResolution<T> {
  resolved: T;
  strategy: ConflictResolutionStrategy;
  conflicts?: string[]; // 해결되지 않은 필드들
}
/**
 * 데이터 충돌 해결 유틸리티
 */
export class ConflictResolver {
  /**
   * 충돌 해결 실행
   */
  static resolve<T extends Record<string, unknown>>(
    conflictData: ConflictData<T>,
    strategy: ConflictResolutionStrategy = 'remote',
    customResolver?: (local: T, remote: T, base?: T) => Partial<T>
  ): ConflictResolution<T> {
    const { local, remote, base } = conflictData;
    switch (strategy) {
      case 'local':
        return {
          resolved: local,
          strategy: 'local',
        };
      case 'remote':
        return {
          resolved: remote,
          strategy: 'remote',
        };
      case 'merge':
        return this.autoMerge(conflictData);
      case 'manual':
        if (customResolver) {
          const customResolution = customResolver(local, remote, base);
          return {
            resolved: { ...remote, ...customResolution },
            strategy: 'manual',
          };
        }
        // 커스텀 리졸버가 없으면 remote 우선
        return {
          resolved: remote,
          strategy: 'remote',
        };
      default:
        throw new APIError(
          `Unknown conflict resolution strategy: ${strategy}`, 400, 'INVALID_STRATEGY'
        );
    }
  }
  /**
   * 자동 병합 (3-way merge)
   */
  private static autoMerge<T extends Record<string, unknown>>(
    conflictData: ConflictData<T>
  ): ConflictResolution<T> {
    const { local, remote, base } = conflictData;
    const resolved = { ...remote };
    const conflicts: string[] = [];
    // base가 없으면 단순 병합
    if (!base) {
      return this.simpleMerge(local, remote);
    }
    // 3-way merge: base와 비교하여 변경사항 감지
    for (const key in local) {
      const localValue = local[key];
      const remoteValue = remote[key];
      const baseValue = base[key];
      // 둘 다 변경되지 않음
      if (this.isEqual(localValue, baseValue) && this.isEqual(remoteValue, baseValue)) {
        resolved[key] = baseValue;
        continue;
      }
      // 로컬만 변경됨
      if (!this.isEqual(localValue, baseValue) && this.isEqual(remoteValue, baseValue)) {
        resolved[key] = localValue;
        continue;
      }
      // 리모트만 변경됨
      if (this.isEqual(localValue, baseValue) && !this.isEqual(remoteValue, baseValue)) {
        resolved[key] = remoteValue;
        continue;
      }
      // 둘 다 변경됨 - 충돌!
      if (!this.isEqual(localValue, baseValue) && !this.isEqual(remoteValue, baseValue)) {
        // 같은 값으로 변경되었으면 충돌 아님
        if (this.isEqual(localValue, remoteValue)) {
          resolved[key] = localValue;
          continue;
        }
        // 실제 충돌 - 타입별 해결 시도
        const mergedValue = this.resolveFieldConflict(key, localValue, remoteValue, baseValue);
        if (mergedValue !== null) {
          resolved[key] = mergedValue as T[Extract<keyof T, string>];
        } else {
          // 해결 불가능한 충돌
          resolved[key] = remoteValue as T[Extract<keyof T, string>]; // 기본적으로 remote 우선
          conflicts.push(key);
        }
      }
    }
    return {
      resolved,
      strategy: 'merge',
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };
  }
  /**
   * 단순 병합 (base 없음)
   */
  private static simpleMerge<T extends Record<string, unknown>>(
    local: T,
    remote: T
  ): ConflictResolution<T> {
    const resolved = { ...remote };
    const conflicts: string[] = [];
    for (const key in local) {
      const localValue = local[key];
      const remoteValue = remote[key];
      // 값이 다르면 충돌로 간주
      if (!this.isEqual(localValue, remoteValue)) {
        const mergedValue = this.resolveFieldConflict(key, localValue, remoteValue);
        if (mergedValue !== null) {
          resolved[key] = mergedValue as T[Extract<keyof T, string>];
        } else {
          conflicts.push(key);
          // remote 값 유지
        }
      }
    }
    return {
      resolved,
      strategy: 'merge',
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };
  }
  /**
   * 필드별 충돌 해결
   */
  private static resolveFieldConflict(
    fieldName: string,
    localValue: unknown,
    remoteValue: unknown,
    baseValue?: unknown
  ): unknown {
    // 숫자 필드 - 더 큰 값 선택
    if (typeof localValue === 'number' && typeof remoteValue === 'number') {
      return Math.max(localValue, remoteValue);
    }
    // 문자열 필드 - 더 긴 값 선택 (더 많은 정보 포함 가능성)
    if (typeof localValue === 'string' && typeof remoteValue === 'string') {
      return localValue.length >= remoteValue.length ? localValue : remoteValue;
    }
    // 배열 필드 - 합집합
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      const merged = [...localValue];
      for (const item of remoteValue) {
        if (!merged.some(existing => this.isEqual(existing, item))) {
          merged.push(item);
        }
      }
      return merged;
    }
    // 객체 필드 - 재귀적 병합
    if (this.isObject(localValue) && this.isObject(remoteValue)) {
      const r = remoteValue as Record<string, unknown>;
      const l = localValue as Record<string, unknown>;
      return { ...r, ...l };
    }
    // 타임스탬프 필드 - 더 최신 값
    if (fieldName.includes('At') || fieldName.includes('Time')) {
      try {
        const toDate = (v: unknown): Date | null => {
          if (v instanceof Date) return v;
          if (typeof v === 'string' || typeof v === 'number') return new Date(v);
          return null;
        };
        const l = toDate(localValue);
        const r = toDate(remoteValue);
        if (l && r) {
          return l.getTime() > r.getTime() ? localValue : remoteValue;
        }
      } catch {
        // ignore
      }
    }
    // 해결 불가능
    return null;
  }
  /**
   * 값 비교 (깊은 비교)
   */
  private static isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;
    if (typeof a === 'object') {
      const aIsArray = Array.isArray(a);
      const bIsArray = Array.isArray(b);
      if (aIsArray !== bIsArray) return false;
      if (aIsArray) {
        const bArr = Array.isArray(b) ? (b as unknown[]) : [];
        if ((a as unknown[]).length !== bArr.length) return false;
        return (a as unknown[]).every((item, index) => this.isEqual(item, bArr[index]));
      }
      if (typeof b !== 'object' || b === null) return false;
      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;
      const keysA = Object.keys(aObj);
      const keysB = Object.keys(bObj);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => this.isEqual(aObj[key], bObj[key]));
    }
    return false;
  }
  /**
   * 객체 타입 확인
   */
  private static isObject(value: unknown): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  /**
   * 충돌 감지
   */
  static detectConflicts<T extends Record<string, unknown>>(
    local: T,
    remote: T,
    base?: T
  ): string[] {
    const conflicts: string[] = [];
    if (!base) {
      // base가 없으면 단순 비교
      for (const key in local) {
        if (!this.isEqual(local[key], remote[key])) {
          conflicts.push(key);
        }
      }
      return conflicts;
    }
    // 3-way 충돌 감지
    for (const key in local) {
      const localValue = local[key];
      const remoteValue = remote[key];
      const baseValue = base[key];
      // 둘 다 base와 다르고, 서로도 다르면 충돌
      if (
        !this.isEqual(localValue, baseValue) &&
        !this.isEqual(remoteValue, baseValue) &&
        !this.isEqual(localValue, remoteValue)
      ) {
        conflicts.push(key);
      }
    }
    return conflicts;
  }
  /**
   * 충돌 해결 전략 추천
   */
  static recommendStrategy<T extends Record<string, unknown>>(
    conflictData: ConflictData<T>
  ): ConflictResolutionStrategy {
    const { local, remote, timestamp } = conflictData;
    // 타임스탬프 비교
    const localTime = new Date(timestamp.local).getTime();
    const remoteTime = new Date(timestamp.remote).getTime();
    // 시간 차이가 5분 이내면 수동 해결 권장
    if (Math.abs(localTime - remoteTime) < 5 * 60 * 1000) {
      return 'manual';
    }
    // 더 최신 것 우선
    return localTime > remoteTime ? 'local' : 'remote';
  }
}

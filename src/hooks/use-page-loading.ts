/**
 * 여러 로딩 상태를 통합하여 관리하는 커스텀 훅
 * @param loadings - 체크할 로딩 상태 배열
 * @returns 하나라도 로딩 중이면 true
 */
export function usePageLoading(...loadings: boolean[]): boolean {
  return loadings.some(loading => loading === true);
}

/**
 * 로딩 상태와 에러 상태를 함께 관리하는 훅
 */
export function useDataState(
  isLoading: boolean,
  error: Error | null | undefined
): {
  isLoading: boolean;
  hasError: boolean;
  error: Error | null | undefined;
} {
  return {
    isLoading,
    hasError: !!error,
    error,
  };
}

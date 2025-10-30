/**
 * API 에러 클래스
 * API 호출 시 발생하는 에러를 표준화합니다.
 */
export class APIError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500
  ) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();

    // Error 클래스 상속 시 필요한 설정
    Object.setPrototypeOf(this, APIError.prototype);
  }

  /**
   * 에러를 JSON 형태로 직렬화
   */
  toJSON(): {
    name: string;
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
    stack?: string;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  /**
   * Firebase 에러를 APIError로 변환
   */
  static fromFirebaseError(error: any): APIError {
    const firebaseErrorMap: Record<string, { message: string; statusCode: number }> = {
      'permission-denied': {
        message: '권한이 없습니다.',
        statusCode: 403,
      },
      'not-found': {
        message: '요청한 리소스를 찾을 수 없습니다.',
        statusCode: 404,
      },
      'already-exists': {
        message: '이미 존재하는 리소스입니다.',
        statusCode: 409,
      },
      'resource-exhausted': {
        message: '요청 한도를 초과했습니다.',
        statusCode: 429,
      },
      'failed-precondition': {
        message: '요청 조건이 충족되지 않았습니다.',
        statusCode: 400,
      },
      'aborted': {
        message: '요청이 중단되었습니다.',
        statusCode: 409,
      },
      'out-of-range': {
        message: '요청 범위가 유효하지 않습니다.',
        statusCode: 400,
      },
      'unimplemented': {
        message: '구현되지 않은 기능입니다.',
        statusCode: 501,
      },
      'internal': {
        message: '내부 서버 오류가 발생했습니다.',
        statusCode: 500,
      },
      'unavailable': {
        message: '서비스를 사용할 수 없습니다.',
        statusCode: 503,
      },
      'data-loss': {
        message: '데이터 손실이 발생했습니다.',
        statusCode: 500,
      },
      'unauthenticated': {
        message: '인증이 필요합니다.',
        statusCode: 401,
      },
    };

    const errorCode = error.code || 'unknown';
    const errorInfo = firebaseErrorMap[errorCode] || {
      message: error.message || '알 수 없는 오류가 발생했습니다.',
      statusCode: 500,
    };

    return new APIError(
      errorInfo.message,
      errorCode.toUpperCase().replace(/-/g, '_'),
      errorInfo.statusCode
    );
  }

  /**
   * 네트워크 에러를 APIError로 변환
   */
  static fromNetworkError(error: any): APIError {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new APIError(
        '네트워크 연결을 확인해주세요.',
        'NETWORK_ERROR',
        0
      );
    }

    if (error.name === 'AbortError') {
      return new APIError(
        '요청이 취소되었습니다.',
        'REQUEST_ABORTED',
        0
      );
    }

    return new APIError(
      error.message || '네트워크 오류가 발생했습니다.',
      'NETWORK_ERROR',
      0
    );
  }

  /**
   * 일반 에러를 APIError로 변환
   */
  static fromError(error: any): APIError {
    if (error instanceof APIError) {
      return error;
    }

    // Firebase 에러 확인
    if (error.code && typeof error.code === 'string') {
      return APIError.fromFirebaseError(error);
    }

    // 네트워크 에러 확인
    if (error.name === 'TypeError' || error.name === 'AbortError') {
      return APIError.fromNetworkError(error);
    }

    // 일반 에러
    return new APIError(
      error.message || '알 수 없는 오류가 발생했습니다.',
      'UNKNOWN_ERROR',
      500
    );
  }
}

import { NextResponse } from 'next/server';
import { ROUTES } from '@/constants/routes';
import { NextRequest } from 'next/server';

// Rate limiting을 위한 간단한 메모리 저장소
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

// API 보안 설정
const API_RATE_LIMIT = 100; // 분당 요청 수
const RATE_LIMIT_WINDOW = 60 * 1000; // 1분

// 보안 헤더 설정
function addSecurityHeaders(response: NextResponse) {
  // API 응답에 추가 보안 헤더
  response.headers.set('X-API-Version', '1.0');
  response.headers.set('X-RateLimit-Limit', API_RATE_LIMIT.toString());
  
  return response;
}

// Rate Limiting 체크
function checkRateLimit(request: NextRequest): boolean {
  const ipHeader =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    ''
  const ip = (ipHeader.split(',')[0]?.trim()) || 'anonymous'
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  const requestLog = rateLimitMap.get(ip) || { count: 0, lastReset: now };

  // 윈도우가 지났으면 리셋
  if (requestLog.lastReset < windowStart) {
    requestLog.count = 0;
    requestLog.lastReset = now;
  }

  requestLog.count++;
  rateLimitMap.set(ip, requestLog);

  return requestLog.count <= API_RATE_LIMIT;
}

// 보안 검증
function validateRequest(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;

  // API 경로에 대한 추가 검증
  if (pathname.startsWith(ROUTES.API.ROOT)) {
    // Content-Type 검증 (POST, PUT, PATCH 요청)
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return false;
      }
    }

    // Origin 검증 (CSRF 방지)
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    if (origin && host) {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) {
        return false;
      }
    }
  }

  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API 경로에 대한 보안 검사
  if (pathname.startsWith(ROUTES.API.ROOT)) {
    // Rate Limiting 체크
    if (!checkRateLimit(request)) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Too Many Requests',
          message: 'API rate limit exceeded. Please try again later.'
        }),
        { 
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        }
      );
    }

    // 요청 검증
    if (!validateRequest(request)) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Bad Request',
          message: 'Invalid request format or origin.'
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
  }

  // 인증이 필요한 경로 보호
  const protectedPaths = ['/admin', '/club-dashboard', '/my-profile'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtectedPath) {
    // 여기서 실제 인증 검사를 수행할 수 있습니다
    // 현재는 기본적인 헤더 검사만 수행
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('session');

    // 개발 환경에서는 우회
    if (process.env.NODE_ENV === 'development') {
      return addSecurityHeaders(NextResponse.next());
    }

    // 프로덕션에서는 실제 인증 검사
    if (!authHeader && !sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 응답에 보안 헤더 추가
  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

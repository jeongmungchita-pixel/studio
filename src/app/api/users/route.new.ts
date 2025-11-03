/**
 * 사용자 API 라우트 (새로운 DI 구조)
 * - Composition Root에서 서비스 주입받아 사용
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserService } from '@/composition-root';
import { withAuthEnhanced } from '@/middleware/auth-enhanced';

const userService = getUserService();

/**
 * GET /api/users - 사용자 목록 조회
 */
export async function GET(request: NextRequest) {
  return withAuthEnhanced(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page') || '1');
      const pageSize = parseInt(searchParams.get('pageSize') || '20');
      const role = searchParams.get('role') as any;
      const status = searchParams.get('status');
      const clubId = searchParams.get('clubId');

      const filters: any = {};
      if (role) filters.role = role;
      if (status) filters.status = status;
      if (clubId) filters.clubId = clubId;

      const result = await userService.getUsers({
        page,
        pageSize,
        filters
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.error?.statusCode || 500 }
        );
      }

      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Users API error:', error);
      return NextResponse.json(
        { 
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            statusCode: 500
          }
        },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/users - 사용자 생성
 */
export async function POST(request: NextRequest) {
  return withAuthEnhanced(request, async (req) => {
    try {
      const body = await req.json();
      
      const result = await userService.createUser(body);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.error?.statusCode || 500 }
        );
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
      console.error('Create user API error:', error);
      return NextResponse.json(
        { 
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            statusCode: 500
          }
        },
        { status: 500 }
      );
    }
  });
}

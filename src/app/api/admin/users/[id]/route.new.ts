/**
 * 사용자 정보 API 라우트 (DI 적용)
 * - Composition Root에서 서비스 주입
 */
import { NextRequest, NextResponse } from 'next/server';
import { getUserService } from '@/composition-root';
import { withAuth } from '@/lib/auth/enhanced-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 인증 확인
    const authResult = await withAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // DI 서비스 사용
    const userService = getUserService();
    const result = await userService.getUserById(params.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error }, 
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('User API error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await withAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const userData = await request.json();
    const userService = getUserService();
    const result = await userService.updateUser(params.id, userData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error }, 
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 로그인 페이지, 인증 API, 이미지 API는 통과
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/img') ||
    pathname.startsWith('/_next')
  ) return NextResponse.next();

  const userId = req.cookies.get('qa_user_id')?.value;
  if (!userId) {
    // API 요청이면 401, 페이지 요청이면 로그인으로 리다이렉트
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

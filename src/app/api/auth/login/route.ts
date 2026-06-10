import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { userId } = await req.json();
  if (!userId || !/^[a-zA-Z0-9_가-힣]{1,30}$/.test(userId)) {
    return NextResponse.json({ error: '유효하지 않은 ID입니다.' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('qa_user_id', userId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30일
    path: '/',
  });
  return res;
}

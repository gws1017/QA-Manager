import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isMember } from '@/lib/registry';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('qa_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { workspace_id } = await req.json(); // null이면 개인 스페이스로 전환
  const res = NextResponse.json({ ok: true });

  if (workspace_id == null) {
    res.cookies.set('qa_ws_id', '', { maxAge: 0, path: '/' });
    return res;
  }

  if (!isMember(Number(workspace_id), userId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  res.cookies.set('qa_ws_id', String(workspace_id), {
    httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
  });
  return res;
}

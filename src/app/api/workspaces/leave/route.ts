import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getRegistry } from '@/lib/registry';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('qa_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { workspace_id } = await req.json();
  getRegistry().prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .run(workspace_id, userId);

  const res = NextResponse.json({ ok: true });
  if (cookieStore.get('qa_ws_id')?.value === String(workspace_id)) {
    res.cookies.set('qa_ws_id', '', { maxAge: 0, path: '/' });
  }
  return res;
}

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getRegistry } from '@/lib/registry';

export async function POST(req: Request) {
  const userId = (await cookies()).get('qa_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { invite_code } = await req.json();
  if (!invite_code?.trim()) return NextResponse.json({ error: 'invite_code required' }, { status: 400 });

  const db = getRegistry();
  const ws = db.prepare('SELECT id, name FROM workspaces WHERE invite_code = ?').get(invite_code.trim()) as { id: number; name: string } | undefined;
  if (!ws) return NextResponse.json({ error: '유효하지 않은 초대코드입니다.' }, { status: 404 });

  db.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id) VALUES (?, ?)').run(ws.id, userId);
  return NextResponse.json({ id: ws.id, name: ws.name });
}

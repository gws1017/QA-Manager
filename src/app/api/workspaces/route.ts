import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getRegistry, genInviteCode } from '@/lib/registry';

export async function GET() {
  const userId = (await cookies()).get('qa_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rows = getRegistry().prepare(`
    SELECT w.id, w.name, w.invite_code, w.owner_user_id
    FROM workspaces w
    JOIN workspace_members m ON m.workspace_id = w.id
    WHERE m.user_id = ?
    ORDER BY w.id
  `).all(userId);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = (await cookies()).get('qa_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const db = getRegistry();
  const inviteCode = genInviteCode();
  const result = db.prepare(
    'INSERT INTO workspaces (name, invite_code, owner_user_id) VALUES (?, ?, ?)'
  ).run(name.trim(), inviteCode, userId);
  db.prepare('INSERT INTO workspace_members (workspace_id, user_id) VALUES (?, ?)')
    .run(result.lastInsertRowid, userId);

  return NextResponse.json({ id: result.lastInsertRowid, name: name.trim(), invite_code: inviteCode });
}

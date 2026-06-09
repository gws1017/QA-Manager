import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ON DELETE CASCADE → modules → test_cases 자동 삭제
  getDb().prepare('DELETE FROM projects WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  getDb().prepare('UPDATE projects SET name = ? WHERE id = ?').run(name, id);
  return NextResponse.json({ ok: true });
}

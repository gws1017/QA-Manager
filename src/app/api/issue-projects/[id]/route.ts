import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  getDb().prepare('DELETE FROM issue_projects WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  getDb().prepare('UPDATE issue_projects SET name = ? WHERE id = ?').run(name, id);
  return NextResponse.json({ ok: true });
}

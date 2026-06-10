import { withDb } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { id } = await params;
  r.db.prepare('DELETE FROM issue_projects WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { id } = await params;
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  r.db.prepare('UPDATE issue_projects SET name = ? WHERE id = ?').run(name, id);
  return NextResponse.json({ ok: true });
}

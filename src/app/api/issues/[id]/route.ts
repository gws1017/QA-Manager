import { getDb, renumberIssues } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();
  const fields = ['title', 'type', 'status', 'priority', 'description'];
  const updates = fields.filter(f => f in body);
  if (!updates.length) return NextResponse.json({ error: 'no fields' }, { status: 400 });
  const sql = `UPDATE issues SET ${updates.map(f => `${f}=?`).join(',')}, updated_at=datetime('now','localtime') WHERE id=?`;
  db.prepare(sql).run(...updates.map(f => body[f]), id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const iss = db.prepare('SELECT project_id FROM issues WHERE id=?').get(id) as { project_id: number } | undefined;
  if (!iss) return NextResponse.json({ error: 'not found' }, { status: 404 });
  db.prepare('DELETE FROM issues WHERE id=?').run(id);
  renumberIssues(iss.project_id);
  return NextResponse.json({ ok: true });
}

import { withDb } from '@/lib/auth';
import { renumberModule } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db } = r;
  const { id } = await params;
  const body = await req.json();
  const fields = ['category', 'sub_category', 'detail', 'steps', 'expected', 'result', 'actual_result', 'note', 'priority'];
  const updates = fields.filter(f => f in body);
  if (updates.length === 0) return NextResponse.json({ error: 'no fields' }, { status: 400 });
  const sql = `UPDATE test_cases SET ${updates.map(f => `${f} = ?`).join(', ')}, updated_at = datetime('now','localtime') WHERE id = ?`;
  db.prepare(sql).run(...updates.map(f => body[f]), id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db } = r;
  const { id } = await params;
  const tc = db.prepare('SELECT module_id FROM test_cases WHERE id = ?').get(id) as { module_id: number } | undefined;
  if (!tc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  db.prepare('DELETE FROM test_cases WHERE id = ?').run(id);
  renumberModule(db, tc.module_id);
  return NextResponse.json({ ok: true });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db } = r;
  const { id } = await params;
  const src = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!src) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const res = db.prepare(`
    INSERT INTO test_cases (module_id, tc_id, category, sub_category, detail, steps, expected, result, actual_result, note, priority)
    VALUES (?, 'TC-000', ?, ?, ?, ?, ?, 'No Run', '', '', ?)
  `).run(src.module_id, src.category, src.sub_category, src.detail, src.steps, src.expected, src.priority);
  renumberModule(db, src.module_id as number);
  return NextResponse.json({ id: res.lastInsertRowid });
}

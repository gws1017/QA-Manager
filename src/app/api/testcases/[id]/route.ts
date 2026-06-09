import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  const fields = ['category', 'sub_category', 'detail', 'steps', 'expected',
                  'result', 'actual_result', 'note', 'priority', 'tc_id'];
  const updates = fields.filter(f => f in body);
  if (updates.length === 0) return NextResponse.json({ error: 'no fields' }, { status: 400 });

  const sql = `UPDATE test_cases SET ${updates.map(f => `${f} = ?`).join(', ')}, updated_at = datetime('now','localtime') WHERE id = ?`;
  db.prepare(sql).run(...updates.map(f => body[f]), id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  getDb().prepare('DELETE FROM test_cases WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}

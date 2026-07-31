import { withDb } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { id } = await params;
  const subtasks = r.db.prepare(
    'SELECT id, title, status, priority FROM issues WHERE parent_id=? ORDER BY id ASC'
  ).all(id);
  return NextResponse.json(subtasks);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db } = r;
  const { id } = await params;
  const parent = db.prepare('SELECT issue_project_id FROM issues WHERE id=?').get(id) as { issue_project_id: number } | undefined;
  if (!parent) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const { title } = await req.json();
  const count = (db.prepare('SELECT COUNT(*) as cnt FROM issues WHERE parent_id=?').get(id) as { cnt: number }).cnt;
  const subId = `SUB-${String(count + 1).padStart(3, '0')}`;
  const result = db.prepare(
    `INSERT INTO issues (issue_project_id, parent_id, issue_id, title, type, status, priority, description)
     VALUES (?, ?, ?, ?, 'Task', 'Open', 'Medium', '')`
  ).run(parent.issue_project_id, id, subId, title ?? '새 하위 작업');
  return NextResponse.json({ id: result.lastInsertRowid });
}

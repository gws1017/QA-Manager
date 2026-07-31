import { withDb } from '@/lib/auth';
import { renumberIssues } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db } = r;
  const { id } = await params;
  const iss = db.prepare('SELECT * FROM issues WHERE id=?').get(id) as Record<string, unknown> | undefined;
  if (!iss) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const cols = (db.prepare('PRAGMA table_info(issues)').all() as { name: string }[]).map(c => c.name);
  const hasLegacy = cols.includes('project_id');
  let res;
  if (hasLegacy) {
    res = db.prepare(`INSERT INTO issues (issue_project_id, project_id, issue_id, title, type, status, priority, description) VALUES (?, ?, 'ISS-000', ?, ?, ?, ?, ?)`)
      .run(iss.issue_project_id, (iss.project_id as number) ?? 1, `${iss.title} (복사본)`, iss.type, iss.status, iss.priority, iss.description);
  } else {
    res = db.prepare(`INSERT INTO issues (issue_project_id, issue_id, title, type, status, priority, description) VALUES (?, 'ISS-000', ?, ?, ?, ?, ?)`)
      .run(iss.issue_project_id, `${iss.title} (복사본)`, iss.type, iss.status, iss.priority, iss.description);
  }
  renumberIssues(db, iss.issue_project_id as number);
  return NextResponse.json({ id: res.lastInsertRowid });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db } = r;
  const { id } = await params;
  const body = await req.json();
  if ('issue_project_id' in body) {
    const iss = db.prepare('SELECT issue_project_id FROM issues WHERE id=?').get(id) as { issue_project_id: number } | undefined;
    if (!iss) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const oldProjectId = iss.issue_project_id;
    const newProjectId = body.issue_project_id;
    db.prepare(`UPDATE issues SET issue_project_id=?, updated_at=datetime('now','localtime') WHERE id=?`).run(newProjectId, id);
    renumberIssues(db, oldProjectId);
    renumberIssues(db, newProjectId);
    return NextResponse.json({ ok: true });
  }
  const fields = ['title', 'type', 'status', 'priority', 'description', 'due_date', 'assignee_id'];
  const updates = fields.filter(f => f in body);
  if (!updates.length) return NextResponse.json({ error: 'no fields' }, { status: 400 });
  const sql = `UPDATE issues SET ${updates.map(f => `${f}=?`).join(',')}, updated_at=datetime('now','localtime') WHERE id=?`;
  db.prepare(sql).run(...updates.map(f => body[f]), id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db } = r;
  const { id } = await params;
  const iss = db.prepare('SELECT issue_project_id FROM issues WHERE id=?').get(id) as { issue_project_id: number } | undefined;
  if (!iss) return NextResponse.json({ error: 'not found' }, { status: 404 });
  db.prepare('DELETE FROM issues WHERE id=?').run(id);
  renumberIssues(db, iss.issue_project_id);
  return NextResponse.json({ ok: true });
}

import { withDb } from '@/lib/auth';
import { renumberIssues, renumberChildren } from '@/lib/db';
import { getRegistry } from '@/lib/registry';
import { sendAssignedNotification, sendStatusChangeNotification } from '@/lib/mail';
import { NextResponse } from 'next/server';

type IssueRow = { id: number; issue_id: string; title: string; status: string; assignee_id: string | null; issue_project_id: number };
type Profile = { email: string; email_verified: number; notify_assigned: number; notify_status_change: number };

function getProfile(userId: string): Profile | undefined {
  return getRegistry().prepare('SELECT * FROM user_profiles WHERE user_id=? AND email_verified=1').get(userId) as Profile | undefined;
}
function getProjectName(db: ReturnType<typeof import('@/lib/db').getDb>, projectId: number): string {
  return (db.prepare('SELECT name FROM issue_projects WHERE id=?').get(projectId) as { name: string } | undefined)?.name ?? '';
}

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
  const fields = ['title', 'type', 'status', 'priority', 'description', 'due_date', 'assignee_id', 'parent_id'];
  const updates = fields.filter(f => f in body);
  if (!updates.length) return NextResponse.json({ error: 'no fields' }, { status: 400 });

  const before = db.prepare('SELECT * FROM issues WHERE id=?').get(id) as IssueRow | undefined;
  const sql = `UPDATE issues SET ${updates.map(f => `${f}=?`).join(',')}, updated_at=datetime('now','localtime') WHERE id=?`;
  db.prepare(sql).run(...updates.map(f => body[f]), id);
  const after = db.prepare('SELECT * FROM issues WHERE id=?').get(id) as IssueRow;

  // parent_id 변경 시 번호 재정리
  if ('parent_id' in body) {
    const newParent = body.parent_id;
    const oldParent = (before as unknown as { parent_id: number | null })?.parent_id;
    if (newParent) {
      renumberChildren(db, newParent);       // 새 부모의 SUB 번호 정리
      renumberIssues(db, after.issue_project_id); // ISS 번호 정리 (해당 이슈 빠짐)
    } else if (oldParent) {
      renumberChildren(db, oldParent);       // 이전 부모의 SUB 번호 정리
      renumberIssues(db, after.issue_project_id); // ISS 번호 재배정
    }
  }

  // 메일 알림 (비동기, 실패해도 응답에 영향 없음)
  if (before) {
    const projectName = getProjectName(db, after.issue_project_id);

    if ('assignee_id' in body && body.assignee_id && body.assignee_id !== before.assignee_id) {
      const p = getProfile(body.assignee_id);
      if (p?.notify_assigned) {
        sendAssignedNotification(p.email, {
          assignee: body.assignee_id, issueId: after.issue_id, title: after.title, projectName,
        }).catch(() => {});
      }
    }

    if ('status' in body && body.status !== before.status && after.assignee_id) {
      const p = getProfile(after.assignee_id);
      if (p?.notify_status_change) {
        sendStatusChangeNotification(p.email, {
          issueId: after.issue_id, title: after.title, projectName,
          oldStatus: before.status, newStatus: body.status,
        }).catch(() => {});
      }
    }
  }

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

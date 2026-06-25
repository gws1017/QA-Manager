import { NextResponse } from 'next/server';
import { withDb } from '@/lib/auth';
import { resolveSourceDb } from '@/lib/crossdb';
import { renumberIssues } from '@/lib/db';

type ExternalIssue = {
  id: number; title: string; type: string; status: string;
  priority: string; description: string; due_date: string | null;
};

/** 다른 스페이스(개인 ↔ 워크스페이스)의 이슈를 현재 스페이스의 이슈 프로젝트로 복사 */
export async function POST(req: Request) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db: targetDb } = r;

  const { source, issue_ids, target_issue_project_id } = await req.json();
  if (!source || !Array.isArray(issue_ids) || !issue_ids.length || !target_issue_project_id) {
    return NextResponse.json({ error: 'invalid params' }, { status: 400 });
  }

  const src = await resolveSourceDb(source);
  if (!src) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const cols = (targetDb.prepare('PRAGMA table_info(issues)').all() as { name: string }[]).map(c => c.name);
  const hasLegacy = cols.includes('project_id');
  const getIssue = src.db.prepare('SELECT * FROM issues WHERE id = ?');
  const getShots = src.db.prepare('SELECT filename, caption FROM issue_screenshots WHERE issue_id = ?');
  const insertShot = targetDb.prepare('INSERT INTO issue_screenshots (issue_id, filename, caption) VALUES (?, ?, ?)');

  let imported = 0;
  for (const id of issue_ids) {
    const iss = getIssue.get(id) as ExternalIssue | undefined;
    if (!iss) continue;
    let newId: number;
    if (hasLegacy) {
      const res = targetDb.prepare(`
        INSERT INTO issues (issue_project_id, project_id, issue_id, title, type, status, priority, description, due_date)
        VALUES (?, 1, 'ISS-000', ?, ?, ?, ?, ?, ?)
      `).run(target_issue_project_id, iss.title, iss.type, iss.status, iss.priority, iss.description ?? '', iss.due_date);
      newId = res.lastInsertRowid as number;
    } else {
      const res = targetDb.prepare(`
        INSERT INTO issues (issue_project_id, issue_id, title, type, status, priority, description, due_date)
        VALUES (?, 'ISS-000', ?, ?, ?, ?, ?, ?)
      `).run(target_issue_project_id, iss.title, iss.type, iss.status, iss.priority, iss.description ?? '', iss.due_date);
      newId = res.lastInsertRowid as number;
    }
    // 스크린샷 파일은 양쪽 스페이스가 같은 data/screenshots 폴더를 공유하므로 행만 복사
    for (const shot of getShots.all(id) as { filename: string; caption: string }[]) {
      insertShot.run(newId, shot.filename, shot.caption ?? '');
    }
    imported++;
  }
  renumberIssues(targetDb, target_issue_project_id);

  return NextResponse.json({ imported });
}

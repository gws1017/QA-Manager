import { getDb, renumberIssues } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const issueProjectId = searchParams.get('issue_project_id');
  const db = getDb();
  const sql = `
    SELECT i.*,
      COUNT(DISTINCT l.id) as linked_tc_count,
      COUNT(DISTINCT s.id) as screenshot_count
    FROM issues i
    LEFT JOIN issue_tc_links l ON l.issue_id = i.id
    LEFT JOIN issue_screenshots s ON s.issue_id = i.id
    ${issueProjectId ? 'WHERE i.issue_project_id = ?' : ''}
    GROUP BY i.id
    ORDER BY i.id ASC
  `;
  const rows = issueProjectId ? db.prepare(sql).all(issueProjectId) : db.prepare(sql).all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { issue_project_id, title } = await req.json();
  if (!issue_project_id) return NextResponse.json({ error: 'issue_project_id required' }, { status: 400 });
  const db = getDb();
  const cols = (db.prepare('PRAGMA table_info(issues)').all() as { name: string }[]).map(c => c.name);
  let res;
  if (cols.includes('project_id')) {
    res = db.prepare(`
      INSERT INTO issues (issue_project_id, project_id, issue_id, title) VALUES (?, 1, 'ISS-000', ?)
    `).run(issue_project_id, title ?? '새 이슈');
  } else {
    res = db.prepare(`
      INSERT INTO issues (issue_project_id, issue_id, title) VALUES (?, 'ISS-000', ?)
    `).run(issue_project_id, title ?? '새 이슈');
  }
  renumberIssues(issue_project_id);
  return NextResponse.json({ id: res.lastInsertRowid });
}

import { getDb, renumberIssues } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');
  const db = getDb();
  const sql = `
    SELECT i.*,
      COUNT(DISTINCT l.id) as linked_tc_count,
      COUNT(DISTINCT s.id) as screenshot_count
    FROM issues i
    LEFT JOIN issue_tc_links l ON l.issue_id = i.id
    LEFT JOIN issue_screenshots s ON s.issue_id = i.id
    ${projectId ? 'WHERE i.project_id = ?' : ''}
    GROUP BY i.id
    ORDER BY i.id DESC
  `;
  const rows = projectId ? db.prepare(sql).all(projectId) : db.prepare(sql).all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { project_id, title } = await req.json();
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 });
  const db = getDb();
  const res = db.prepare(`
    INSERT INTO issues (project_id, issue_id, title) VALUES (?, 'ISS-000', ?)
  `).run(project_id, title ?? '새 이슈');
  renumberIssues(project_id);
  return NextResponse.json({ id: res.lastInsertRowid });
}

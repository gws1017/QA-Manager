import { NextResponse } from 'next/server';
import { resolveSourceDb } from '@/lib/crossdb';

/** 다른 스페이스(개인 또는 워크스페이스)의 이슈 프로젝트/이슈 목록을 가져오기 모달에서 조회 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source');
  if (!source) return NextResponse.json({ error: 'source required' }, { status: 400 });

  const r = await resolveSourceDb(source);
  if (!r) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { db } = r;

  const projects = db.prepare('SELECT * FROM issue_projects ORDER BY id').all();
  const issues = db.prepare(`
    SELECT i.id, i.issue_project_id, i.issue_id, i.title, i.type, i.status, i.priority, i.due_date
    FROM issues i ORDER BY i.issue_project_id, i.id
  `).all();

  return NextResponse.json({ projects, issues });
}

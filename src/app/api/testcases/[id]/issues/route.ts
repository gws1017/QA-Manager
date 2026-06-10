import { withDb } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { id } = await params;
  const rows = r.db.prepare(`
    SELECT i.id, i.issue_id, i.title, i.status, i.priority, i.type, i.issue_project_id
    FROM issue_tc_links l
    JOIN issues i ON i.id = l.issue_id
    WHERE l.test_case_id = ?
    ORDER BY i.id
  `).all(id);
  return NextResponse.json(rows);
}

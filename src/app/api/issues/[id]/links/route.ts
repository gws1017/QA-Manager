import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = getDb().prepare(`
    SELECT tc.id, tc.tc_id, tc.category, tc.sub_category, tc.module_id,
           m.name as module_name
    FROM issue_tc_links l
    JOIN test_cases tc ON tc.id = l.test_case_id
    JOIN modules m ON m.id = tc.module_id
    WHERE l.issue_id = ?
    ORDER BY tc.id
  `).all(id);
  return NextResponse.json(rows);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { test_case_id } = await req.json();
  try {
    getDb().prepare('INSERT INTO issue_tc_links (issue_id, test_case_id) VALUES (?,?)').run(id, test_case_id);
  } catch { /* UNIQUE 중복 무시 */ }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { test_case_id } = await req.json();
  getDb().prepare('DELETE FROM issue_tc_links WHERE issue_id=? AND test_case_id=?').run(id, test_case_id);
  return NextResponse.json({ ok: true });
}

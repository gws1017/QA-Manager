import { getDb, renumberModule } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('module_id');
  const db = getDb();

  const sql = `
    SELECT tc.*, COUNT(s.id) as screenshot_count
    FROM test_cases tc
    LEFT JOIN screenshots s ON s.test_case_id = tc.id
    ${moduleId ? 'WHERE tc.module_id = ?' : ''}
    GROUP BY tc.id
    ORDER BY tc.id
  `;
  const query = moduleId ? db.prepare(sql).all(moduleId) : db.prepare(sql).all();

  return NextResponse.json(query);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { module_id, category, sub_category, detail, steps, expected, result, actual_result, note, priority } = body;
  if (!module_id) return NextResponse.json({ error: 'module_id required' }, { status: 400 });

  const db = getDb();
  // tc_id는 임시값으로 삽입 후 renumber로 확정
  const res = db.prepare(`
    INSERT INTO test_cases (module_id, tc_id, category, sub_category, detail, steps, expected, result, actual_result, note, priority)
    VALUES (?, 'TC-000', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(module_id, category, sub_category, detail, steps, expected, result ?? 'No Run', actual_result, note, priority ?? '미정');

  renumberModule(module_id);

  return NextResponse.json({ id: res.lastInsertRowid });
}

import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('module_id');
  const db = getDb();

  const query = moduleId
    ? db.prepare('SELECT * FROM test_cases WHERE module_id = ? ORDER BY tc_id').all(moduleId)
    : db.prepare('SELECT * FROM test_cases ORDER BY module_id, tc_id').all();

  return NextResponse.json(query);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { module_id, tc_id, category, sub_category, detail, steps, expected, result, actual_result, note, priority } = body;
  if (!module_id || !tc_id) return NextResponse.json({ error: 'module_id, tc_id required' }, { status: 400 });

  const db = getDb();
  const res = db.prepare(`
    INSERT INTO test_cases (module_id, tc_id, category, sub_category, detail, steps, expected, result, actual_result, note, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(module_id, tc_id, category, sub_category, detail, steps, expected, result ?? 'No Run', actual_result, note, priority ?? '미정');

  return NextResponse.json({ id: res.lastInsertRowid });
}

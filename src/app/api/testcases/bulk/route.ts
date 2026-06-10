import { withDb } from '@/lib/auth';
import { renumberModule } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db } = r;
  const { ids, action, result, target_module_id } = await req.json();
  if (!ids?.length) return NextResponse.json({ error: 'ids required' }, { status: 400 });

  const placeholders = ids.map(() => '?').join(',');

  if (action === 'delete') {
    const affected = db.prepare(`SELECT DISTINCT module_id FROM test_cases WHERE id IN (${placeholders})`).all(...ids) as { module_id: number }[];
    db.prepare(`DELETE FROM test_cases WHERE id IN (${placeholders})`).run(...ids);
    affected.forEach(({ module_id }) => renumberModule(db, module_id));
    return NextResponse.json({ ok: true, count: ids.length });
  }

  if (action === 'result') {
    if (!['Pass', 'Fail', 'N/A', 'No Run'].includes(result))
      return NextResponse.json({ error: 'invalid result' }, { status: 400 });
    db.prepare(`UPDATE test_cases SET result=?, updated_at=datetime('now','localtime') WHERE id IN (${placeholders})`).run(result, ...ids);
    return NextResponse.json({ ok: true, count: ids.length });
  }

  if (action === 'move') {
    if (!target_module_id) return NextResponse.json({ error: 'target_module_id required' }, { status: 400 });
    const srcModules = db.prepare(`SELECT DISTINCT module_id FROM test_cases WHERE id IN (${placeholders})`).all(...ids) as { module_id: number }[];
    db.prepare(`UPDATE test_cases SET module_id=?, updated_at=datetime('now','localtime') WHERE id IN (${placeholders})`).run(target_module_id, ...ids);
    const toRenumber = new Set([...srcModules.map(m => m.module_id), target_module_id]);
    toRenumber.forEach(id => renumberModule(db, id));
    return NextResponse.json({ ok: true, count: ids.length });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

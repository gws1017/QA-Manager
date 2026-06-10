import { withDb } from '@/lib/auth';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { id } = await params;
  const { caption } = await req.json();
  r.db.prepare('UPDATE issue_screenshots SET caption = ? WHERE id = ?').run(caption ?? '', id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { id } = await params;
  const row = r.db.prepare('SELECT filename FROM issue_screenshots WHERE id=?').get(id) as { filename: string } | undefined;
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const filepath = path.join(process.cwd(), 'data', 'screenshots', row.filename);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  r.db.prepare('DELETE FROM issue_screenshots WHERE id=?').run(id);
  return NextResponse.json({ ok: true });
}

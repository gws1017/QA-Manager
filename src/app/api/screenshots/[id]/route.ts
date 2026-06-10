import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { caption } = await req.json();
  getDb().prepare('UPDATE screenshots SET caption = ? WHERE id = ?').run(caption ?? '', id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare('SELECT filename FROM screenshots WHERE id = ?').get(id) as { filename: string } | undefined;
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const filepath = path.join(process.cwd(), 'public', 'screenshots', row.filename);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  db.prepare('DELETE FROM screenshots WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}

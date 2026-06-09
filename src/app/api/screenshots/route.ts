import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tcId = searchParams.get('tc_id');
  if (!tcId) return NextResponse.json({ error: 'tc_id required' }, { status: 400 });
  const rows = getDb().prepare('SELECT * FROM screenshots WHERE test_case_id = ? ORDER BY id').all(tcId);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const tcId = form.get('tc_id') as string;
  const file = form.get('file') as File;
  if (!tcId || !file) return NextResponse.json({ error: 'tc_id, file required' }, { status: 400 });

  const mime = file.type || 'image/png';
  const extMap: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/bmp': 'bmp' };
  const ext = extMap[mime] ?? file.name.split('.').pop() ?? 'png';
  const filename = `${randomUUID()}.${ext}`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  fs.writeFileSync(filepath, Buffer.from(await file.arrayBuffer()));

  const db = getDb();
  const result = db.prepare('INSERT INTO screenshots (test_case_id, filename) VALUES (?, ?)').run(tcId, filename);
  return NextResponse.json({ id: result.lastInsertRowid, filename });
}

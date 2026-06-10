import { withDb } from '@/lib/auth';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const SCREENSHOT_DIR = path.join(process.cwd(), 'data', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

export async function GET(req: Request) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { searchParams } = new URL(req.url);
  const issueId = searchParams.get('issue_id');
  if (!issueId) return NextResponse.json({ error: 'issue_id required' }, { status: 400 });
  return NextResponse.json(r.db.prepare('SELECT * FROM issue_screenshots WHERE issue_id=? ORDER BY id').all(issueId));
}

export async function POST(req: Request) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db } = r;
  const form = await req.formData();
  const issueId = form.get('issue_id') as string;
  const file = form.get('file') as File;
  if (!issueId || !file) return NextResponse.json({ error: 'issue_id, file required' }, { status: 400 });
  const mime = file.type || 'image/png';
  const extMap: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };
  const ext = extMap[mime] ?? file.name.split('.').pop() ?? 'png';
  const filename = `${randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(SCREENSHOT_DIR, filename), Buffer.from(await file.arrayBuffer()));
  const result = db.prepare('INSERT INTO issue_screenshots (issue_id, filename) VALUES (?,?)').run(issueId, filename);
  return NextResponse.json({ id: result.lastInsertRowid, filename });
}

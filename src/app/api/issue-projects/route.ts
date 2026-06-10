import { withDb } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  return NextResponse.json(r.db.prepare('SELECT * FROM issue_projects ORDER BY id').all());
}

export async function POST(req: Request) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const result = r.db.prepare('INSERT INTO issue_projects (name) VALUES (?)').run(name);
  return NextResponse.json({ id: result.lastInsertRowid });
}

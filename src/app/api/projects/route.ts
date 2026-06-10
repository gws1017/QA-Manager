import { withDb } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db } = r;
  return NextResponse.json(db.prepare('SELECT * FROM projects ORDER BY id').all());
}

export async function POST(req: Request) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db } = r;
  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const result = db.prepare('INSERT INTO projects (name, description) VALUES (?, ?)').run(name, description ?? '');
  return NextResponse.json({ id: result.lastInsertRowid });
}

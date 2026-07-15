import { withDb } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  return NextResponse.json(r.db.prepare('SELECT * FROM issue_projects ORDER BY project_id, id').all());
}

export async function POST(req: Request) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { name, project_id } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const result = r.db.prepare('INSERT INTO issue_projects (name, project_id) VALUES (?, ?)').run(name, project_id ?? null);
  return NextResponse.json({ id: result.lastInsertRowid });
}

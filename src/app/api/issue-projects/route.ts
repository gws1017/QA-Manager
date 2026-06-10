import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(getDb().prepare('SELECT * FROM issue_projects ORDER BY id').all());
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const result = getDb().prepare('INSERT INTO issue_projects (name) VALUES (?)').run(name);
  return NextResponse.json({ id: result.lastInsertRowid });
}

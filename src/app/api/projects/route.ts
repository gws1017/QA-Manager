import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const db = getDb();
  const projects = db.prepare('SELECT * FROM projects ORDER BY id').all();
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const db = getDb();
  const result = db.prepare('INSERT INTO projects (name, description) VALUES (?, ?)').run(name, description ?? '');
  return NextResponse.json({ id: result.lastInsertRowid });
}

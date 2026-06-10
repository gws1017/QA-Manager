import { withDb } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db } = r;
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');
  const sql = projectId
    ? 'SELECT * FROM modules WHERE project_id = ? ORDER BY id'
    : 'SELECT * FROM modules ORDER BY id';
  return NextResponse.json(projectId ? db.prepare(sql).all(projectId) : db.prepare(sql).all());
}

export async function POST(req: Request) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db } = r;
  const { name, description, project_id } = await req.json();
  if (!name || !project_id) return NextResponse.json({ error: 'name, project_id required' }, { status: 400 });
  const result = db.prepare('INSERT INTO modules (name, description, project_id) VALUES (?, ?, ?)').run(name, description ?? '', project_id);
  return NextResponse.json({ id: result.lastInsertRowid });
}

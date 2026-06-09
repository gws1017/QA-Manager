import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ON DELETE CASCADE로 test_cases도 자동 삭제됨
  getDb().prepare('DELETE FROM modules WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}

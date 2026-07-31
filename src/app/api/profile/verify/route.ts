import { withDb } from '@/lib/auth';
import { getRegistry } from '@/lib/registry';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { code } = await req.json();
  const reg = getRegistry();

  const row = reg.prepare('SELECT * FROM email_verifications WHERE user_id=?')
    .get(r.userId) as { email: string; code: string; expires_at: string } | undefined;

  if (!row) return NextResponse.json({ error: '인증 요청이 없습니다' }, { status: 400 });
  if (new Date(row.expires_at) < new Date()) return NextResponse.json({ error: '코드가 만료되었습니다' }, { status: 400 });
  if (row.code !== String(code)) return NextResponse.json({ error: '코드가 올바르지 않습니다' }, { status: 400 });

  reg.prepare(`INSERT OR REPLACE INTO user_profiles (user_id, email, email_verified) VALUES (?, ?, 1)`)
    .run(r.userId, row.email);
  reg.prepare('DELETE FROM email_verifications WHERE user_id=?').run(r.userId);

  return NextResponse.json({ ok: true });
}

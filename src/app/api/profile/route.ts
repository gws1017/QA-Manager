import { withDb } from '@/lib/auth';
import { getRegistry } from '@/lib/registry';
import { sendVerificationCode } from '@/lib/mail';
import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';

export async function GET() {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const profile = getRegistry()
    .prepare('SELECT email, email_verified, notify_assigned, notify_status_change FROM user_profiles WHERE user_id=?')
    .get(r.userId) as { email: string; email_verified: number; notify_assigned: number; notify_status_change: number } | undefined;
  return NextResponse.json(profile ?? null);
}

// 이메일 등록 요청 → 인증코드 발송
export async function POST(req: Request) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { email } = await req.json();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: '유효한 이메일을 입력하세요' }, { status: 400 });
  }

  const code = String(randomInt(100000, 999999));
  const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const reg = getRegistry();
  reg.prepare(`INSERT OR REPLACE INTO email_verifications (user_id, email, code, expires_at) VALUES (?, ?, ?, ?)`)
    .run(r.userId, email, code, expires);

  try {
    await sendVerificationCode(email, code);
  } catch {
    return NextResponse.json({ error: '메일 발송 실패' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

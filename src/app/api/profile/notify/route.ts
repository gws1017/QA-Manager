import { withDb } from '@/lib/auth';
import { getRegistry } from '@/lib/registry';
import { NextResponse } from 'next/server';

export async function PATCH(req: Request) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { notify_assigned, notify_status_change } = await req.json();
  getRegistry().prepare(
    `UPDATE user_profiles SET notify_assigned=?, notify_status_change=? WHERE user_id=?`
  ).run(notify_assigned ? 1 : 0, notify_status_change ? 1 : 0, r.userId);
  return NextResponse.json({ ok: true });
}

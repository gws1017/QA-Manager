import { withDb } from '@/lib/auth';
import { getRegistry } from '@/lib/registry';
import { NextResponse } from 'next/server';

export async function PATCH(req: Request) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { notify_assigned, notify_status_change, notify_issue_changed, display_name } = await req.json();
  const reg = getRegistry();
  if (display_name !== undefined) {
    reg.prepare(`UPDATE user_profiles SET display_name=? WHERE user_id=?`).run(display_name || null, r.userId);
  }
  if (notify_assigned !== undefined || notify_status_change !== undefined || notify_issue_changed !== undefined) {
    reg.prepare(`UPDATE user_profiles SET notify_assigned=?, notify_status_change=?, notify_issue_changed=? WHERE user_id=?`)
      .run(notify_assigned ? 1 : 0, notify_status_change ? 1 : 0, notify_issue_changed ? 1 : 0, r.userId);
  }
  return NextResponse.json({ ok: true });
}

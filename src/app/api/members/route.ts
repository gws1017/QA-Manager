import { withDb } from '@/lib/auth';
import { getRegistry } from '@/lib/registry';
import { NextResponse } from 'next/server';

export async function GET() {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { userId, workspaceId } = r;
  const reg = getRegistry();

  let userIds: string[];
  if (workspaceId) {
    const members = reg.prepare('SELECT user_id FROM workspace_members WHERE workspace_id = ? ORDER BY joined_at ASC').all(workspaceId) as { user_id: string }[];
    userIds = members.map(m => m.user_id);
  } else {
    userIds = [userId];
  }

  return NextResponse.json(userIds.map(id => {
    const profile = reg.prepare('SELECT display_name FROM user_profiles WHERE user_id=?').get(id) as { display_name: string | null } | undefined;
    return { id, display_name: profile?.display_name ?? null };
  }));
}

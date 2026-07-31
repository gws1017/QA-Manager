import { withDb } from '@/lib/auth';
import { getRegistry } from '@/lib/registry';
import { NextResponse } from 'next/server';

export async function GET() {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { userId, workspaceId } = r;

  if (workspaceId) {
    const members = getRegistry()
      .prepare('SELECT user_id FROM workspace_members WHERE workspace_id = ? ORDER BY joined_at ASC')
      .all(workspaceId) as { user_id: string }[];
    return NextResponse.json(members.map(m => m.user_id));
  }
  return NextResponse.json([userId]);
}

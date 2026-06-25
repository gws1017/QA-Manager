import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getDb } from './db';
import { isMember } from './registry';
import Database from 'better-sqlite3';

export async function withDb(): Promise<{ db: Database.Database; userId: string; workspaceId: number | null } | NextResponse> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('qa_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const wsIdRaw = cookieStore.get('qa_ws_id')?.value;
  const workspaceId = wsIdRaw ? Number(wsIdRaw) : null;

  if (workspaceId && isMember(workspaceId, userId)) {
    return { db: getDb(`ws_${workspaceId}`), userId, workspaceId };
  }
  return { db: getDb(userId), userId, workspaceId: null };
}

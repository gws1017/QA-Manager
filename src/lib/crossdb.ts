import { cookies } from 'next/headers';
import { getDb } from './db';
import { isMember } from './registry';
import Database from 'better-sqlite3';

/** 'personal' 또는 워크스페이스 id(문자열)를 받아 해당 DB를 연다. 권한 없으면 null. */
export async function resolveSourceDb(source: string): Promise<{ db: Database.Database; userId: string } | null> {
  const userId = (await cookies()).get('qa_user_id')?.value;
  if (!userId) return null;
  if (source === 'personal') return { db: getDb(userId), userId };

  const wsId = Number(source);
  if (!wsId || !isMember(wsId, userId)) return null;
  return { db: getDb(`ws_${wsId}`), userId };
}

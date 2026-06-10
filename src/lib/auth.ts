import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getDb } from './db';
import Database from 'better-sqlite3';

export async function withDb(): Promise<{ db: Database.Database; userId: string } | NextResponse> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('qa_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return { db: getDb(userId), userId };
}

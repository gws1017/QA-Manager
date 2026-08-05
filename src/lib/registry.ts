import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';

const DB_DIR = path.join(process.cwd(), 'data', 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

let registry: Database.Database | null = null;

export function getRegistry(): Database.Database {
  if (registry) return registry;
  registry = new Database(path.join(DB_DIR, '_registry.db'));
  registry.pragma('journal_mode = WAL');
  registry.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      owner_user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      joined_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (workspace_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER NOT NULL DEFAULT 0,
      display_name TEXT,
      notify_assigned INTEGER NOT NULL DEFAULT 1,
      notify_status_change INTEGER NOT NULL DEFAULT 1,
      notify_issue_changed INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS email_verifications (
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      PRIMARY KEY (user_id)
    );
  `);
  // display_name 컬럼 마이그레이션
  const profileCols = registry.prepare("PRAGMA table_info(user_profiles)").all() as { name: string }[];
  if (profileCols.length > 0 && !profileCols.some(c => c.name === 'display_name')) {
    registry.exec(`ALTER TABLE user_profiles ADD COLUMN display_name TEXT`);
  }
  if (profileCols.length > 0 && !profileCols.some(c => c.name === 'notify_issue_changed')) {
    registry.exec(`ALTER TABLE user_profiles ADD COLUMN notify_issue_changed INTEGER NOT NULL DEFAULT 1`);
  }

  return registry;
}

export function genInviteCode(): string {
  return randomBytes(4).toString('hex'); // 8자리
}

export function isMember(workspaceId: number, userId: string): boolean {
  const row = getRegistry().prepare(
    'SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
  ).get(workspaceId, userId);
  return !!row;
}

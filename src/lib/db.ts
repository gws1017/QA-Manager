import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'qa.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS test_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      tc_id TEXT NOT NULL,
      category TEXT,
      sub_category TEXT,
      detail TEXT,
      steps TEXT,
      expected TEXT,
      result TEXT DEFAULT 'No Run' CHECK(result IN ('Pass','Fail','N/A','No Run')),
      actual_result TEXT,
      note TEXT,
      priority TEXT DEFAULT '미정',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS screenshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 기본 모듈 초기 데이터
    INSERT OR IGNORE INTO modules (name, description) VALUES
      ('정산', '정산 모듈'),
      ('훅업전버튼', '훅업 전버튼 모듈'),
      ('모델+스페이스', '모델 및 스페이스 디자이너'),
      ('속성', '속성 패널');
  `);
}

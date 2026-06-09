import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'qa.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
    runMigrations(db);
  }
  return db;
}

/** 프로젝트 내 이슈 재번호 부여 ISS-001, ISS-002... */
export function renumberIssues(projectId: number | string) {
  const db = getDb();
  const issues = db.prepare('SELECT id FROM issues WHERE project_id = ? ORDER BY id ASC').all(projectId) as { id: number }[];
  const update = db.prepare('UPDATE issues SET issue_id = ? WHERE id = ?');
  db.transaction(() => {
    issues.forEach((iss, i) => update.run(`ISS-${String(i + 1).padStart(3, '0')}`, iss.id));
  })();
}

/** 모듈 내 TC를 id(삽입순) 기준으로 TC-001, TC-002... 재번호 부여 */
export function renumberModule(moduleId: number | string) {
  const db = getDb();
  const tcs = db.prepare('SELECT id FROM test_cases WHERE module_id = ? ORDER BY id ASC').all(moduleId) as { id: number }[];
  const update = db.prepare('UPDATE test_cases SET tc_id = ? WHERE id = ?');
  db.transaction(() => {
    tcs.forEach((tc, i) => update.run(`TC-${String(i + 1).padStart(3, '0')}`, tc.id));
  })();
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      issue_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      type TEXT DEFAULT 'Bug' CHECK(type IN ('Bug','Task','Improvement','Feature')),
      status TEXT DEFAULT 'Open' CHECK(status IN ('Open','In Progress','Resolved','Closed')),
      priority TEXT DEFAULT 'Medium' CHECK(priority IN ('Low','Medium','High','Critical')),
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS issue_tc_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      test_case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
      UNIQUE(issue_id, test_case_id)
    );

    CREATE TABLE IF NOT EXISTS issue_screenshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
}

function runMigrations(db: Database.Database) {
  // modules 테이블에 project_id 컬럼이 없으면 추가 (기존 DB 마이그레이션)
  const cols = (db.prepare("PRAGMA table_info(modules)").all() as { name: string }[]).map(c => c.name);
  if (!cols.includes('project_id')) {
    db.exec(`ALTER TABLE modules ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE`);
  }

  // 기존 모듈들이 어떤 프로젝트에도 속하지 않으면 기본 프로젝트에 배정
  const orphans = db.prepare('SELECT COUNT(*) as cnt FROM modules WHERE project_id IS NULL').get() as { cnt: number };
  if (orphans.cnt > 0) {
    // 기본 프로젝트 생성 (없을 때만)
    db.prepare("INSERT OR IGNORE INTO projects (name, description) VALUES ('기본 프로젝트', '기존 테스트케이스')").run();
    const proj = db.prepare("SELECT id FROM projects WHERE name = '기본 프로젝트'").get() as { id: number };
    db.prepare('UPDATE modules SET project_id = ? WHERE project_id IS NULL').run(proj.id);
  }
}

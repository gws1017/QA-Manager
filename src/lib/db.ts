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

/** 이슈 프로젝트 내 이슈 재번호 부여 ISS-001, ISS-002... */
export function renumberIssues(issueProjectId: number | string) {
  const db = getDb();
  const issues = db.prepare('SELECT id FROM issues WHERE issue_project_id = ? ORDER BY id ASC').all(issueProjectId) as { id: number }[];
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
    -- TC 관리 전용 프로젝트
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

    -- 이슈 관리 전용 프로젝트 (TC 프로젝트와 완전 별개)
    CREATE TABLE IF NOT EXISTS issue_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_project_id INTEGER NOT NULL,
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
  // modules.project_id 컬럼 추가
  const modCols = (db.prepare('PRAGMA table_info(modules)').all() as { name: string }[]).map(c => c.name);
  if (!modCols.includes('project_id')) {
    db.exec(`ALTER TABLE modules ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE`);
  }

  // 고아 모듈 → 기본 TC 프로젝트 배정
  const orphans = db.prepare('SELECT COUNT(*) as cnt FROM modules WHERE project_id IS NULL').get() as { cnt: number };
  if (orphans.cnt > 0) {
    db.prepare("INSERT OR IGNORE INTO projects (name) VALUES ('기본 프로젝트')").run();
    const proj = db.prepare("SELECT id FROM projects WHERE name = '기본 프로젝트'").get() as { id: number };
    db.prepare('UPDATE modules SET project_id = ? WHERE project_id IS NULL').run(proj.id);
  }

  // screenshots.caption 컬럼 추가
  const ssCols = (db.prepare('PRAGMA table_info(screenshots)').all() as { name: string }[]).map(c => c.name);
  if (!ssCols.includes('caption')) {
    db.exec(`ALTER TABLE screenshots ADD COLUMN caption TEXT NOT NULL DEFAULT ''`);
  }

  // issue_screenshots.caption 컬럼 추가
  const issCols2 = (db.prepare('PRAGMA table_info(issue_screenshots)').all() as { name: string }[]).map(c => c.name);
  if (!issCols2.includes('caption')) {
    db.exec(`ALTER TABLE issue_screenshots ADD COLUMN caption TEXT NOT NULL DEFAULT ''`);
  }

  // issues.due_date 컬럼 추가
  const issueCols3 = (db.prepare('PRAGMA table_info(issues)').all() as { name: string }[]).map(c => c.name);
  if (!issueCols3.includes('due_date')) {
    db.exec(`ALTER TABLE issues ADD COLUMN due_date TEXT`);
  }

  // issues 테이블에 issue_project_id 컬럼 추가 (기존 DB 마이그레이션)
  const issCols = (db.prepare('PRAGMA table_info(issues)').all() as { name: string }[]).map(c => c.name);
  if (!issCols.includes('issue_project_id')) {
    db.exec(`ALTER TABLE issues ADD COLUMN issue_project_id INTEGER`);
  }

  // 기존 issues의 project_id → issue_project_id 마이그레이션
  if (issCols.includes('project_id')) {
    // project_id가 있는 이슈 중 issue_project_id가 없는 것 처리
    const unmigrated = db.prepare('SELECT DISTINCT project_id FROM issues WHERE issue_project_id IS NULL AND project_id IS NOT NULL').all() as { project_id: number }[];
    for (const { project_id } of unmigrated) {
      // TC 프로젝트 이름으로 이슈 프로젝트 생성
      const tcProj = db.prepare('SELECT name FROM projects WHERE id = ?').get(project_id) as { name: string } | undefined;
      const name = tcProj ? `${tcProj.name} (이슈)` : `이슈 프로젝트 ${project_id}`;
      db.prepare('INSERT OR IGNORE INTO issue_projects (name) VALUES (?)').run(name);
      const issProj = db.prepare('SELECT id FROM issue_projects WHERE name = ?').get(name) as { id: number };
      db.prepare('UPDATE issues SET issue_project_id = ? WHERE project_id = ? AND issue_project_id IS NULL').run(issProj.id, project_id);
    }
    // issue_project_id가 여전히 null인 경우 기본 이슈 프로젝트로
    const nullIssues = db.prepare('SELECT COUNT(*) as cnt FROM issues WHERE issue_project_id IS NULL').get() as { cnt: number };
    if (nullIssues.cnt > 0) {
      db.prepare('INSERT OR IGNORE INTO issue_projects (name) VALUES (?)').run('기본 이슈 프로젝트');
      const def = db.prepare("SELECT id FROM issue_projects WHERE name = '기본 이슈 프로젝트'").get() as { id: number };
      db.prepare('UPDATE issues SET issue_project_id = ? WHERE issue_project_id IS NULL').run(def.id);
    }
  }
}

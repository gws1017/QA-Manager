import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data', 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const dbMap = new Map<string, Database.Database>();

export function getDb(userId: string): Database.Database {
  if (dbMap.has(userId)) return dbMap.get(userId)!;

  const dbPath = path.join(DB_DIR, `${userId}.db`);

  // 기존 qa.db 마이그레이션 (최초 1회만 — 복사 후 qa.db 이름 변경으로 재복사 방지)
  const legacyPath = path.join(process.cwd(), 'data', 'qa.db');
  const legacyDone = path.join(process.cwd(), 'data', 'qa.db.migrated');
  if (!fs.existsSync(dbPath) && fs.existsSync(legacyPath) && !fs.existsSync(legacyDone)) {
    fs.copyFileSync(legacyPath, dbPath);
    const walSrc = legacyPath + '-wal';
    const shmSrc = legacyPath + '-shm';
    if (fs.existsSync(walSrc)) fs.copyFileSync(walSrc, dbPath + '-wal');
    if (fs.existsSync(shmSrc)) fs.copyFileSync(shmSrc, dbPath + '-shm');
    // 마이그레이션 완료 표시 (qa.db는 백업으로 남김)
    fs.renameSync(legacyPath, legacyDone);
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  runMigrations(db);
  dbMap.set(userId, db);
  return db;
}

/** 부모 이슈의 하위 이슈 재번호 부여 SUB-001, SUB-002... */
export function renumberChildren(db: Database.Database, parentId: number | string) {
  const children = db.prepare('SELECT id FROM issues WHERE parent_id = ? ORDER BY id ASC').all(parentId) as { id: number }[];
  const update = db.prepare('UPDATE issues SET issue_id = ? WHERE id = ?');
  db.transaction(() => {
    children.forEach((c, i) => update.run(`SUB-${String(i + 1).padStart(3, '0')}`, c.id));
  })();
}

/** 이슈 프로젝트 내 이슈 재번호 부여 ISS-001, ISS-002... (하위작업 제외) */
export function renumberIssues(db: Database.Database, issueProjectId: number | string) {
  const issues = db.prepare('SELECT id FROM issues WHERE issue_project_id = ? AND (parent_id IS NULL OR parent_id = 0) ORDER BY id ASC').all(issueProjectId) as { id: number }[];
  const update = db.prepare('UPDATE issues SET issue_id = ? WHERE id = ?');
  db.transaction(() => {
    issues.forEach((iss, i) => update.run(`ISS-${String(i + 1).padStart(3, '0')}`, iss.id));
  })();
}

/** 모듈 내 TC를 id(삽입순) 기준으로 TC-001, TC-002... 재번호 부여 */
export function renumberModule(db: Database.Database, moduleId: number | string) {
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
      caption TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS issue_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS issue_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
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
      caption TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
}

function runMigrations(db: Database.Database) {
  const modCols = (db.prepare('PRAGMA table_info(modules)').all() as { name: string }[]).map(c => c.name);
  if (!modCols.includes('project_id')) {
    db.exec(`ALTER TABLE modules ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE`);
  }

  const orphans = db.prepare('SELECT COUNT(*) as cnt FROM modules WHERE project_id IS NULL').get() as { cnt: number };
  if (orphans.cnt > 0) {
    db.prepare("INSERT OR IGNORE INTO projects (name) VALUES ('기본 프로젝트')").run();
    const proj = db.prepare("SELECT id FROM projects WHERE name = '기본 프로젝트'").get() as { id: number };
    db.prepare('UPDATE modules SET project_id = ? WHERE project_id IS NULL').run(proj.id);
  }

  // screenshots.caption 컬럼 추가
  const screenshotCols = (db.prepare('PRAGMA table_info(screenshots)').all() as { name: string }[]).map(c => c.name);
  if (!screenshotCols.includes('caption')) {
    db.exec(`ALTER TABLE screenshots ADD COLUMN caption TEXT NOT NULL DEFAULT ''`);
  }

  // issue_screenshots.caption 컬럼 추가
  const issueShotCols = (db.prepare('PRAGMA table_info(issue_screenshots)').all() as { name: string }[]).map(c => c.name);
  if (!issueShotCols.includes('caption')) {
    db.exec(`ALTER TABLE issue_screenshots ADD COLUMN caption TEXT NOT NULL DEFAULT ''`);
  }

  // issue_projects: name UNIQUE 제약 제거 + group_id 컬럼 추가
  const ipCols = (db.prepare('PRAGMA table_info(issue_projects)').all() as { name: string }[]).map(c => c.name);
  const ipCreateSql = (db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='issue_projects'").get() as { sql: string } | undefined)?.sql ?? '';
  const hasNameUnique = /name\s+TEXT[^,)]*UNIQUE/i.test(ipCreateSql);
  if (hasNameUnique || !ipCols.includes('group_id')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS issue_projects_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        group_id INTEGER REFERENCES issue_groups(id) ON DELETE SET NULL,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      );
      INSERT INTO issue_projects_new (id, name, description, group_id, created_at)
        SELECT id, name, description,
          ${ipCols.includes('group_id') ? 'group_id' : 'NULL'},
          created_at
        FROM issue_projects;
      DROP TABLE issue_projects;
      ALTER TABLE issue_projects_new RENAME TO issue_projects;
    `);
  }

  // issues 컬럼 추가 (due_date / issue_project_id / parent_id)
  const issueCols = (db.prepare('PRAGMA table_info(issues)').all() as { name: string }[]).map(c => c.name);
  if (!issueCols.includes('due_date')) {
    db.exec(`ALTER TABLE issues ADD COLUMN due_date TEXT`);
  }
  if (!issueCols.includes('issue_project_id')) {
    db.exec(`ALTER TABLE issues ADD COLUMN issue_project_id INTEGER`);
  }
  if (!issueCols.includes('parent_id')) {
    db.exec(`ALTER TABLE issues ADD COLUMN parent_id INTEGER REFERENCES issues(id) ON DELETE CASCADE`);
  }
  if (!issueCols.includes('assignee_id')) {
    db.exec(`ALTER TABLE issues ADD COLUMN assignee_id TEXT`);
  }
  if (!issueCols.includes('created_by')) {
    db.exec(`ALTER TABLE issues ADD COLUMN created_by TEXT`);
  }

  // 기존 issues의 project_id → issue_project_id 마이그레이션
  if (issueCols.includes('project_id')) {
    // project_id가 있는 이슈 중 issue_project_id가 없는 것 처리
    const unmigrated = db.prepare('SELECT DISTINCT project_id FROM issues WHERE issue_project_id IS NULL AND project_id IS NOT NULL').all() as { project_id: number }[];
    for (const { project_id } of unmigrated) {
      const tcProj = db.prepare('SELECT name FROM projects WHERE id = ?').get(project_id) as { name: string } | undefined;
      const name = tcProj ? `${tcProj.name} (이슈)` : `이슈 프로젝트 ${project_id}`;
      db.prepare('INSERT OR IGNORE INTO issue_projects (name) VALUES (?)').run(name);
      const issProj = db.prepare('SELECT id FROM issue_projects WHERE name = ?').get(name) as { id: number };
      db.prepare('UPDATE issues SET issue_project_id = ? WHERE project_id = ? AND issue_project_id IS NULL').run(issProj.id, project_id);
    }
    const nullIssues = db.prepare('SELECT COUNT(*) as cnt FROM issues WHERE issue_project_id IS NULL').get() as { cnt: number };
    if (nullIssues.cnt > 0) {
      db.prepare('INSERT OR IGNORE INTO issue_projects (name) VALUES (?)').run('기본 이슈 프로젝트');
      const def = db.prepare("SELECT id FROM issue_projects WHERE name = '기본 이슈 프로젝트'").get() as { id: number };
      db.prepare('UPDATE issues SET issue_project_id = ? WHERE issue_project_id IS NULL').run(def.id);
    }
  }
}

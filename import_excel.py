"""
엑셀 -> QA Manager DB 임포트 스크립트
- 속성 시트: 전체 TC 삽입
- 나머지 시트: 재현스텝 또는 기대결과가 있는 행만 삽입
"""
import sqlite3
import zipfile
import xml.etree.ElementTree as ET
import os

EXCEL_PATH = r'C:\Source\etc\qa-manager\20260608_Devexpress테스트_v0_박해성.xlsx'
DB_PATH    = r'C:\Source\etc\qa-manager\data\qa.db'

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# ── DB 초기화 ────────────────────────────────────────
con = sqlite3.connect(DB_PATH)
con.execute('PRAGMA journal_mode=WAL')
con.executescript('''
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
  category TEXT, sub_category TEXT, detail TEXT,
  steps TEXT, expected TEXT,
  result TEXT DEFAULT 'No Run',
  actual_result TEXT, note TEXT,
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
''')

MODULES = ['정산', '훅업전버튼', '모델+스페이스', '속성']
for name in MODULES:
    con.execute('INSERT OR IGNORE INTO modules (name) VALUES (?)', (name,))
con.commit()

mod_ids = {row[1]: row[0] for row in con.execute('SELECT id, name FROM modules')}
print('모듈 ID:', mod_ids)

# ── 엑셀 파싱 ────────────────────────────────────────
with zipfile.ZipFile(EXCEL_PATH) as z:
    # 공유 문자열
    with z.open('xl/sharedStrings.xml') as f:
        ss_tree = ET.parse(f)
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    strings = []
    for si in ss_tree.findall('.//s:si', ns):
        parts = si.findall('.//s:t', ns)
        strings.append(''.join(p.text or '' for p in parts))

    # 워크북에서 시트 순서 확인
    with z.open('xl/workbook.xml') as f:
        wb_tree = ET.parse(f)
    sheet_elems = wb_tree.findall('.//s:sheet', ns)

    with z.open('xl/_rels/workbook.xml.rels') as f:
        rels_tree = ET.parse(f)
    rels = {r.get('Id'): r.get('Target')
            for r in rels_tree.findall('.//{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')}

    def cell_value(cell):
        t = cell.get('t', '')
        v = cell.find('s:v', ns)
        if v is None or v.text is None:
            return None
        return strings[int(v.text)] if t == 's' else v.text

    def col_letter_to_idx(ref):
        # 'A1' -> (0, 1)
        col_str = ''.join(c for c in ref if c.isalpha())
        row_str = ''.join(c for c in ref if c.isdigit())
        col = 0
        for c in col_str:
            col = col * 26 + (ord(c.upper()) - ord('A') + 1)
        return col - 1, int(row_str)  # 0-based col, 1-based row

    inserted_total = 0

    for i, sheet_elem in enumerate(sheet_elems):
        rid = sheet_elem.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        target = rels.get(rid, '')
        sheet_file = f'xl/{target}'
        module_name = MODULES[i] if i < len(MODULES) else None
        if not module_name or module_name not in mod_ids:
            continue

        mod_id = mod_ids[module_name]
        is_full = (module_name == '속성')  # 속성은 전부, 나머지는 내용있는것만

        with z.open(sheet_file) as f:
            ws_tree = ET.parse(f)

        rows_data = {}  # row_num -> {col_idx: value}
        for row_elem in ws_tree.findall('.//s:row', ns):
            rn = int(row_elem.get('r', 0))
            rows_data[rn] = {}
            for cell in row_elem.findall('s:c', ns):
                ref = cell.get('r', '')
                col_idx, _ = col_letter_to_idx(ref)
                rows_data[rn][col_idx] = cell_value(cell)

        # 헤더는 1행 - 컬럼 위치는 고정
        # 0=번호, 1=ID, 2=대분류, 3=중분류, 4=소분류, 5=재현스텝, 6=기대결과
        # 7=결과, 8=실제결과, 9=우선순위, 10=비고

        inserted = 0
        last_category = ''
        last_sub_category = ''

        sorted_rows = sorted(r for r in rows_data if r >= 2)
        for rn in sorted_rows:
            row = rows_data[rn]
            tc_id = str(row.get(1) or '').strip()
            if not tc_id.startswith('TC-'):
                continue

            # 병합셀 처리: None이면 이전 값 유지
            cat = str(row.get(2) or '').strip() or last_category
            sub = str(row.get(3) or '').strip() or last_sub_category
            if row.get(2): last_category = cat
            if row.get(3): last_sub_category = sub

            detail        = str(row.get(4) or '').strip()
            steps         = str(row.get(5) or '').strip()
            expected      = str(row.get(6) or '').strip()
            result        = str(row.get(7) or 'No Run').strip()
            actual_result = str(row.get(8) or '').strip()
            priority      = str(row.get(9) or '미정').strip()
            note          = str(row.get(10) or '').strip()

            if result not in ('Pass', 'Fail', 'N/A', 'No Run'):
                result = 'No Run'

            # 속성: 전부 / 나머지: steps 또는 expected 있는것만
            has_content = bool(steps or expected)
            if not is_full and not has_content:
                continue

            # 이미 있으면 스킵
            exists = con.execute(
                'SELECT id FROM test_cases WHERE module_id=? AND tc_id=?', (mod_id, tc_id)
            ).fetchone()
            if exists:
                continue

            con.execute('''
                INSERT INTO test_cases
                  (module_id, tc_id, category, sub_category, detail, steps, expected,
                   result, actual_result, priority, note)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)
            ''', (mod_id, tc_id, cat, sub, detail, steps, expected,
                  result, actual_result, priority, note))
            inserted += 1

        print(f'[{module_name}] {inserted}건 삽입')
        inserted_total += inserted

con.commit()
con.close()
print(f'\n완료: 총 {inserted_total}건 삽입')

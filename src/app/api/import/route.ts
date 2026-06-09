import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const db = getDb();
  const modules = db.prepare('SELECT * FROM modules').all() as { id: number; name: string }[];

  let updated = 0, inserted = 0, skipped = 0;

  for (const ws of wb.worksheets) {
    if (ws.name === '대시보드') continue;

    // 시트명으로 모듈 찾기
    const mod = modules.find(m => m.name === ws.name);
    if (!mod) { skipped++; continue; }

    // 헤더 행 파싱 (1행)
    const headerRow = ws.getRow(1);
    const headers: Record<string, number> = {};
    headerRow.eachCell((cell, colIdx) => {
      const h = String(cell.value ?? '').trim();
      headers[h] = colIdx;
    });

    const col = (name: string) => headers[name];

    // 2행부터 데이터
    ws.eachRow((row, rowIdx) => {
      if (rowIdx === 1) return;
      const tcId = String(row.getCell(col('ID') || 1).value ?? '').trim();
      if (!tcId || !tcId.startsWith('TC-')) return;

      const data = {
        category:     String(row.getCell(col('대분류')   || 2).value ?? ''),
        sub_category: String(row.getCell(col('중분류')   || 3).value ?? ''),
        detail:       String(row.getCell(col('소분류')   || 4).value ?? ''),
        steps:        String(row.getCell(col('재현스텝') || 5).value ?? ''),
        expected:     String(row.getCell(col('기대결과') || 6).value ?? ''),
        result:       String(row.getCell(col('결과')     || 7).value ?? 'No Run'),
        actual_result:String(row.getCell(col('실제결과') || 8).value ?? ''),
        priority:     String(row.getCell(col('우선순위') || 9).value ?? '미정'),
        note:         String(row.getCell(col('비고')     || 10).value ?? ''),
      };

      // result 유효성 체크
      if (!['Pass','Fail','N/A','No Run'].includes(data.result)) data.result = 'No Run';

      const existing = db.prepare(
        'SELECT id FROM test_cases WHERE module_id = ? AND tc_id = ?'
      ).get(mod.id, tcId);

      if (existing) {
        db.prepare(`
          UPDATE test_cases SET
            category=?, sub_category=?, detail=?, steps=?, expected=?,
            result=?, actual_result=?, priority=?, note=?,
            updated_at=datetime('now','localtime')
          WHERE id=?
        `).run(data.category, data.sub_category, data.detail, data.steps, data.expected,
               data.result, data.actual_result, data.priority, data.note,
               (existing as any).id);
        updated++;
      } else {
        db.prepare(`
          INSERT INTO test_cases
            (module_id, tc_id, category, sub_category, detail, steps, expected, result, actual_result, priority, note)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)
        `).run(mod.id, tcId, data.category, data.sub_category, data.detail, data.steps,
               data.expected, data.result, data.actual_result, data.priority, data.note);
        inserted++;
      }
    });
  }

  return NextResponse.json({ ok: true, updated, inserted, skipped });
}

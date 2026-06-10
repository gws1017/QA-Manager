import { withDb } from '@/lib/auth';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

const RESULT_COLORS: Record<string, string> = {
  Pass:    'FFD9F2D9',
  Fail:    'FFFFCCCC',
  'N/A':   'FFFFF3CC',
  'No Run':'FFEBEBEB',
};

export async function GET() {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db } = r;
  const modules = db.prepare('SELECT * FROM modules ORDER BY id').all() as any[];
  const allTcs = db.prepare('SELECT * FROM test_cases ORDER BY module_id, tc_id').all() as any[];

  const wb = new ExcelJS.Workbook();
  const dash = wb.addWorksheet('대시보드');
  dash.columns = [
    { header: '모듈', key: 'module', width: 20 },
    { header: '전체', key: 'total', width: 8 },
    { header: 'Pass', key: 'pass', width: 8 },
    { header: 'Fail', key: 'fail', width: 8 },
    { header: 'N/A', key: 'na', width: 8 },
    { header: 'No Run', key: 'norun', width: 8 },
    { header: '진행률', key: 'rate', width: 10 },
  ];
  dash.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  dash.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };

  for (const mod of modules) {
    const tcs = allTcs.filter((t: any) => t.module_id === mod.id);
    const pass = tcs.filter((t: any) => t.result === 'Pass').length;
    const fail = tcs.filter((t: any) => t.result === 'Fail').length;
    const na   = tcs.filter((t: any) => t.result === 'N/A').length;
    const norun= tcs.filter((t: any) => t.result === 'No Run').length;
    const row = dash.addRow({ module: mod.name, total: tcs.length, pass, fail, na, norun,
      rate: tcs.length ? `${Math.round(pass / tcs.length * 100)}%` : '-' });
    if (fail > 0) row.getCell('fail').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
  }

  for (const mod of modules) {
    const ws = wb.addWorksheet(mod.name);
    ws.columns = [
      { header: 'ID',       key: 'tc_id',        width: 10 },
      { header: '대분류',   key: 'category',      width: 14 },
      { header: '중분류',   key: 'sub_category',  width: 18 },
      { header: '소분류',   key: 'detail',        width: 22 },
      { header: '재현스텝', key: 'steps',         width: 60 },
      { header: '기대결과', key: 'expected',      width: 50 },
      { header: '결과',     key: 'result',        width: 10 },
      { header: '실제결과', key: 'actual_result', width: 28 },
      { header: '우선순위', key: 'priority',      width: 10 },
      { header: '비고',     key: 'note',          width: 40 },
    ];
    const hRow = ws.getRow(1);
    hRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
    hRow.alignment = { vertical: 'middle', horizontal: 'center' };
    const tcs = allTcs.filter((t: any) => t.module_id === mod.id);
    tcs.forEach((tc: any) => {
      const row = ws.addRow(tc);
      const color = RESULT_COLORS[tc.result] ?? 'FFFFFFFF';
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
        cell.alignment = { vertical: 'middle', wrapText: false };
      });
      if (tc.result === 'Fail') row.font = { bold: true, color: { argb: 'FFCC0000' } };
    });
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2' }];
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="qa-export-${new Date().toISOString().slice(0,10)}.xlsx"`,
    },
  });
}

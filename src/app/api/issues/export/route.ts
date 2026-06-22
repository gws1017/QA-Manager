import { withDb } from '@/lib/auth';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

const STATUS_COLORS: Record<string, string> = {
  'Open':        'FFEBEBEB',
  'In Progress': 'FFFFD9AA',
  'Resolved':    'FFD9F2D9',
  'Closed':      'FFD0D8E8',
};

const PRIORITY_COLORS: Record<string, string> = {
  'Critical': 'FFFFCCCC',
  'High':     'FFFFEECC',
  'Medium':   'FFFFFEF0',
  'Low':      'FFFFFFFF',
};

export async function GET(req: Request) {
  const r = await withDb(); if (r instanceof NextResponse) return r;
  const { db } = r;
  const { searchParams } = new URL(req.url);
  const issueProjectId = searchParams.get('issue_project_id');

  const projects = issueProjectId
    ? db.prepare('SELECT * FROM issue_projects WHERE id = ?').all(issueProjectId) as any[]
    : db.prepare('SELECT * FROM issue_projects ORDER BY id').all() as any[];

  const allIssues = db.prepare(`
    SELECT i.*,
      GROUP_CONCAT(tc.tc_id, ', ') as linked_tcs
    FROM issues i
    LEFT JOIN issue_tc_links l ON l.issue_id = i.id
    LEFT JOIN test_cases tc ON tc.id = l.test_case_id
    ${issueProjectId ? 'WHERE i.issue_project_id = ?' : ''}
    GROUP BY i.id
    ORDER BY i.issue_project_id, i.id
  `).all(...(issueProjectId ? [issueProjectId] : [])) as any[];

  const wb = new ExcelJS.Workbook();

  // 요약 시트
  const dash = wb.addWorksheet('요약');
  dash.columns = [
    { header: '프로젝트',     key: 'project',     width: 24 },
    { header: '전체',         key: 'total',        width: 8  },
    { header: 'Open',         key: 'open',         width: 10 },
    { header: 'In Progress',  key: 'inprogress',   width: 13 },
    { header: 'Resolved',     key: 'resolved',     width: 11 },
    { header: 'Closed',       key: 'closed',       width: 10 },
    { header: 'Bug',          key: 'bug',          width: 8  },
    { header: 'Task',         key: 'task',         width: 8  },
    { header: 'Feature',      key: 'feature',      width: 10 },
    { header: 'Improvement',  key: 'improvement',  width: 14 },
  ];
  const dashHeader = dash.getRow(1);
  dashHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  dashHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
  dashHeader.alignment = { vertical: 'middle', horizontal: 'center' };

  for (const proj of projects) {
    const issues = allIssues.filter((i: any) => i.issue_project_id === proj.id);
    dash.addRow({
      project:     proj.name,
      total:       issues.length,
      open:        issues.filter((i: any) => i.status === 'Open').length,
      inprogress:  issues.filter((i: any) => i.status === 'In Progress').length,
      resolved:    issues.filter((i: any) => i.status === 'Resolved').length,
      closed:      issues.filter((i: any) => i.status === 'Closed').length,
      bug:         issues.filter((i: any) => i.type === 'Bug').length,
      task:        issues.filter((i: any) => i.type === 'Task').length,
      feature:     issues.filter((i: any) => i.type === 'Feature').length,
      improvement: issues.filter((i: any) => i.type === 'Improvement').length,
    });
  }
  dash.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2' }];

  // 프로젝트별 시트
  for (const proj of projects) {
    const issues = allIssues.filter((i: any) => i.issue_project_id === proj.id);
    const sheetName = proj.name.slice(0, 31); // Excel 시트명 31자 제한
    const ws = wb.addWorksheet(sheetName);
    ws.columns = [
      { header: 'ID',       key: 'issue_id',    width: 10 },
      { header: '제목',     key: 'title',       width: 40 },
      { header: '유형',     key: 'type',        width: 12 },
      { header: '상태',     key: 'status',      width: 13 },
      { header: '우선순위', key: 'priority',    width: 11 },
      { header: '마감기한', key: 'due_date',    width: 12 },
      { header: '연관 TC',  key: 'linked_tcs',  width: 20 },
      { header: '설명',     key: 'description', width: 60 },
      { header: '등록일',   key: 'created_at',  width: 18 },
    ];
    const hRow = ws.getRow(1);
    hRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
    hRow.alignment = { vertical: 'middle', horizontal: 'center' };

    issues.forEach((iss: any) => {
      const row = ws.addRow({
        issue_id:    iss.issue_id,
        title:       iss.title,
        type:        iss.type,
        status:      iss.status,
        priority:    iss.priority,
        due_date:    iss.due_date ?? '',
        linked_tcs:  iss.linked_tcs ?? '',
        description: iss.description,
        created_at:  iss.created_at?.slice(0, 10),
      });

      const statusColor = STATUS_COLORS[iss.status] ?? 'FFFFFFFF';
      const priorityColor = PRIORITY_COLORS[iss.priority] ?? 'FFFFFFFF';

      row.eachCell((cell, colNum) => {
        cell.alignment = { vertical: 'middle', wrapText: false };
        // 상태 컬럼(4)은 상태색, 우선순위(5)는 우선순위색, 나머지는 상태색 연하게
        if (colNum === 4) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } };
        } else if (colNum === 5) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: priorityColor } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        }
      });

      if (iss.status === 'Closed') row.font = { color: { argb: 'FF888888' } };
    });

    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2' }];
  }

  const buffer = await wb.xlsx.writeBuffer();
  const filename = projects.length === 1
    ? `issues-${projects[0].name}-${new Date().toISOString().slice(0, 10)}.xlsx`
    : `issues-all-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}

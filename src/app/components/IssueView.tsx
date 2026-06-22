'use client';
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, X, Paperclip, Link2, Download } from 'lucide-react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import { STATUSES, TYPES, PRIORITIES, STATUS_STYLE, TYPE_STYLE, PRIORITY_COLOR } from '@/lib/ui';
import ScreenshotPanel from './ScreenshotPanel';

/* ── 타입 ── */
type Issue = {
  id: number; issue_id: string; title: string;
  type: string; status: string; priority: string; description: string;
  due_date: string | null; linked_tc_count: number; screenshot_count: number; created_at: string;
};
type LinkedTC = { id: number; tc_id: string; category: string; sub_category: string; module_name: string; module_id: number };
type TCOption = { id: number; tc_id: string; category: string; steps: string; module_name: string };

/* ── 연관 TC 패널 ── */
function LinkedTCPanel({ issueId, onNavigateToTC }: {
  issueId: number;
  onNavigateToTC: (moduleId: number, tcId: number) => void;
}) {
  const [linked, setLinked] = useState<LinkedTC[]>([]);
  const [options, setOptions] = useState<TCOption[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchLinked(); }, [issueId]);

  // 연결 후보: 전체 모듈 + 전체 TC를 각각 한 번에 받아 모듈명을 붙임
  useEffect(() => {
    Promise.all([
      fetch('/api/modules').then(r => r.json()),
      fetch('/api/testcases').then(r => r.json()),
    ]).then(([mods, tcs]: [{ id: number; name: string }[], { id: number; tc_id: string; category: string; steps: string; module_id: number }[]]) => {
      const moduleNames = new Map(mods.map(m => [m.id, m.name]));
      setOptions(tcs.map(tc => ({
        id: tc.id, tc_id: tc.tc_id, category: tc.category, steps: tc.steps ?? '',
        module_name: moduleNames.get(tc.module_id) ?? '',
      })));
    });
  }, []);

  async function fetchLinked() {
    const res = await fetch(`/api/issues/${issueId}/links`);
    setLinked(await res.json());
  }
  async function link(tcId: number) {
    await apiPost(`/api/issues/${issueId}/links`, { test_case_id: tcId });
    fetchLinked(); setShowPicker(false); setSearch('');
  }
  async function unlink(tcId: number) {
    await apiDelete(`/api/issues/${issueId}/links`, { test_case_id: tcId });
    fetchLinked();
  }

  const linkedIds = new Set(linked.map(l => l.id));
  const q = search.toLowerCase();
  const filtered = options.filter(o => !linkedIds.has(o.id) &&
    (!q || o.tc_id.toLowerCase().includes(q) ||
     o.category?.toLowerCase().includes(q) ||
     o.steps?.toLowerCase().includes(q) ||
     o.module_name.toLowerCase().includes(q)));

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Link2 size={13} className="text-gray-400" />
        <span className="text-xs font-medium text-gray-500">연관 테스트케이스</span>
        <button onClick={() => setShowPicker(!showPicker)}
          className="ml-auto flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-600">
          <Plus size={11} /> TC 연결
        </button>
      </div>

      {/* 연결된 TC 목록 */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {linked.length === 0 && <span className="text-xs text-gray-400">연결된 TC 없음</span>}
        {linked.map(tc => (
          <span key={tc.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            <button
              onClick={() => onNavigateToTC(tc.module_id, tc.id)}
              className="flex items-center gap-1 hover:underline cursor-pointer"
              title="해당 TC로 이동">
              <span className="font-mono font-semibold">{tc.tc_id}</span>
              {tc.category && <span className="text-blue-400">· {tc.category}</span>}
              <span className="text-blue-300 text-[10px]">[{tc.module_name}]</span>
            </button>
            <button onClick={() => unlink(tc.id)} className="ml-0.5 hover:text-red-500"><X size={10} /></button>
          </span>
        ))}
      </div>

      {/* TC 선택 피커 */}
      {showPicker && (
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="TC ID · 대분류 · 재현스텝으로 검색..."
              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {filtered.slice(0, 50).map(o => (
              <button key={o.id} onClick={() => link(o.id)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs flex flex-col gap-0.5 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-blue-600 shrink-0">{o.tc_id}</span>
                  <span className="text-gray-400 text-[10px]">{o.category}</span>
                  <span className="text-gray-300 text-[10px] ml-auto shrink-0">[{o.module_name}]</span>
                </div>
                {o.steps && <span className="text-gray-600 truncate pl-0.5">{o.steps}</span>}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-xs text-gray-400 p-3 text-center">결과 없음</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 메인 IssueView ── */
export default function IssueView({
  issueProjectId, projectName, allIssueProjects, onNavigateToTC, jumpToIssueId,
}: {
  issueProjectId: number | null;
  projectName: string;
  allIssueProjects?: { id: number; name: string }[];
  onNavigateToTC: (moduleId: number, tcId: number) => void;
  jumpToIssueId?: number | null;
}) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType]     = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [moveTargetId, setMoveTargetId] = useState<string>('');

  useEffect(() => { if (issueProjectId) fetchIssues(); else setIssues([]); }, [issueProjectId]);

  useEffect(() => {
    if (jumpToIssueId == null) return;
    setFilterStatus(''); setFilterType(''); setFilterPriority('');
    setExpandedId(jumpToIssueId);
    setTimeout(() => {
      document.getElementById(`issue-row-${jumpToIssueId}`)?.scrollIntoView({ behavior: 'instant', block: 'center' });
    }, 100);
  }, [jumpToIssueId]);

  async function fetchIssues() {
    if (!issueProjectId) return;
    const res = await fetch(`/api/issues?issue_project_id=${issueProjectId}`);
    setIssues(await res.json());
  }

  async function addIssue() {
    if (!issueProjectId) return;
    await apiPost('/api/issues', { issue_project_id: issueProjectId });
    fetchIssues();
  }

  async function cloneIssue(id: number) {
    await apiPost(`/api/issues/${id}`);
    fetchIssues();
  }

  async function deleteIssue(id: number) {
    if (!confirm('이슈를 삭제할까요?')) return;
    await apiDelete(`/api/issues/${id}`);
    if (expandedId === id) setExpandedId(null);
    fetchIssues();
  }

  async function updateIssue(id: number, field: string, value: string | null) {
    await apiPatch(`/api/issues/${id}`, { [field]: value });
    setIssues(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개 이슈를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    await Promise.all([...selectedIds].map(id => apiDelete(`/api/issues/${id}`)));
    if (expandedId !== null && selectedIds.has(expandedId)) setExpandedId(null);
    setSelectedIds(new Set());
    fetchIssues();
  }

  async function moveSelected() {
    if (!moveTargetId || selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개 이슈를 이동할까요?`)) return;
    await Promise.all([...selectedIds].map(id =>
      apiPatch(`/api/issues/${id}`, { issue_project_id: Number(moveTargetId) })));
    setSelectedIds(new Set());
    setMoveTargetId('');
    setExpandedId(null);
    fetchIssues();
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleSelectAll() {
    setSelectedIds(prev => prev.size === displayed.length ? new Set() : new Set(displayed.map(i => i.id)));
  }

  const displayed = issues.filter(i =>
    (!filterStatus   || i.status === filterStatus) &&
    (!filterType     || i.type === filterType) &&
    (!filterPriority || i.priority === filterPriority)
  );

  if (!issueProjectId) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
      <Link2 size={48} className="text-gray-200" />
      <p>왼쪽에서 프로젝트를 선택하세요</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 서브 헤더 */}
      <div className="bg-white border-b px-6 py-3 flex items-center gap-3 shrink-0">
        <h2 className="font-bold text-gray-800 mr-2">{projectName} · 이슈</h2>
        {/* 필터 */}
        {([
          ['상태', STATUSES, filterStatus, setFilterStatus],
          ['유형', TYPES,    filterType,   setFilterType],
          ['우선순위', PRIORITIES, filterPriority, setFilterPriority],
        ] as [string, readonly string[], string, (v: string) => void][]).map(([label, opts, val, set]) => (
          <select key={label} value={val} onChange={e => set(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none">
            <option value="">전체 {label}</option>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
        <span className="text-xs text-gray-400 ml-1">{displayed.length}건</span>

        {/* 일괄 이동 영역 */}
        <div className="ml-auto flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-orange-600 font-medium">{selectedIds.size}개 선택</span>
              <select value={moveTargetId} onChange={e => setMoveTargetId(e.target.value)}
                className="text-xs border border-orange-300 rounded px-2 py-1 focus:outline-none bg-orange-50">
                <option value="">— 이동할 프로젝트 —</option>
                {(allIssueProjects ?? []).filter(p => p.id !== issueProjectId).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button onClick={moveSelected} disabled={!moveTargetId}
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded hover:bg-orange-600 text-xs disabled:opacity-40 disabled:cursor-not-allowed">
                이동
              </button>
              <button onClick={deleteSelected}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 text-xs">
                <Trash2 size={13} /> 삭제
              </button>
              <button onClick={() => setSelectedIds(new Set())}
                className="flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-gray-600 text-xs">
                <X size={13} />
              </button>
            </>
          )}
          <a href={`/api/issues/export?issue_project_id=${issueProjectId}`} download
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs">
            <Download size={13} /> 엑셀 Export
          </a>
          <button onClick={addIssue}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#1f3864] text-white rounded hover:bg-[#2a4f8a] text-xs">
            <Plus size={13} /> 이슈 추가
          </button>
        </div>
      </div>

      {/* 이슈 테이블 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-[#1f3864] text-white z-10">
            <tr>
              <th className="px-3 py-2 border-r border-white/10 w-8">
                <input type="checkbox"
                  checked={displayed.length > 0 && selectedIds.size === displayed.length}
                  onChange={toggleSelectAll}
                  className="cursor-pointer accent-orange-400" />
              </th>
              {['ID','제목','유형','상태','우선순위','TC','📎','날짜','마감일',''].map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-white/10 last:border-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map(iss => (
              <React.Fragment key={iss.id}>
                <tr id={`issue-row-${iss.id}`}
                  className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer
                  ${iss.status === 'Closed' ? 'opacity-60' : ''}
                  ${selectedIds.has(iss.id) ? 'bg-orange-50' : expandedId === iss.id ? 'bg-blue-50/30' : ''}`}
                  onClick={() => setExpandedId(expandedId === iss.id ? null : iss.id)}>
                  <td className="px-3 py-2 w-8" onClick={e => { e.stopPropagation(); toggleSelect(iss.id); }}>
                    <input type="checkbox" checked={selectedIds.has(iss.id)} onChange={() => {}}
                      className="cursor-pointer accent-orange-400" />
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold text-gray-500 whitespace-nowrap">{iss.issue_id}</td>
                  <td className="px-3 py-2 font-medium text-gray-800 max-w-xs truncate" title={iss.title}>{iss.title || <span className="text-gray-400 italic">제목 없음</span>}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${TYPE_STYLE[iss.type]}`}>{iss.type}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <select value={iss.status} onChange={e => updateIssue(iss.id, 'status', e.target.value)}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-medium border-0 cursor-pointer ${STATUS_STYLE[iss.status]}`}>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`font-bold ${PRIORITY_COLOR[iss.priority]}`}>●</span>
                    <span className="ml-1 text-gray-600">{iss.priority}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {iss.linked_tc_count > 0 && <span className="flex items-center gap-1"><Link2 size={11} className="text-blue-400" />{iss.linked_tc_count}</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {iss.screenshot_count > 0 && <span className="flex items-center gap-1"><Paperclip size={11} className="text-blue-400" />{iss.screenshot_count}</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{iss.created_at?.slice(5, 10)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {iss.due_date
                      ? <span className={`text-xs font-medium ${new Date(iss.due_date) < new Date() && iss.status !== 'Closed' ? 'text-red-500' : 'text-gray-500'}`}>
                          {iss.due_date.slice(5, 10)}
                        </span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => cloneIssue(iss.id)} className="p-1 rounded hover:bg-blue-100 text-gray-300 hover:text-blue-500" title="복제"><Copy size={13} /></button>
                      <button onClick={() => deleteIssue(iss.id)} className="p-1 rounded hover:bg-red-100 text-red-300 hover:text-red-600" title="삭제"><Trash2 size={13} /></button>
                      {expandedId === iss.id ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                    </div>
                  </td>
                </tr>

                {expandedId === iss.id && (
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <td colSpan={11} className="px-8 py-5">
                      <div className="max-w-3xl space-y-4">
                        {/* 제목 */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1 font-medium">제목</label>
                          <input defaultValue={iss.title}
                            onBlur={e => { if (e.target.value !== iss.title) updateIssue(iss.id, 'title', e.target.value); }}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </div>
                        {/* 메타 행 */}
                        <div className="flex gap-4 flex-wrap">
                          {([
                            ['유형', 'type', TYPES],
                            ['우선순위', 'priority', PRIORITIES],
                          ] as [string, string, readonly string[]][]).map(([label, field, opts]) => (
                            <div key={field}>
                              <label className="block text-xs text-gray-500 mb-1 font-medium">{label}</label>
                              <select defaultValue={String(iss[field as keyof Issue])}
                                onChange={e => updateIssue(iss.id, field, e.target.value)}
                                className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none">
                                {opts.map(o => <option key={o}>{o}</option>)}
                              </select>
                            </div>
                          ))}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">마감기한</label>
                            <input type="date" defaultValue={iss.due_date ?? ''}
                              onChange={e => updateIssue(iss.id, 'due_date', e.target.value || null)}
                              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          </div>
                        </div>
                        {/* 설명 */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1 font-medium">설명 / 에러 로그</label>
                          <textarea rows={5} defaultValue={iss.description}
                            onBlur={e => { if (e.target.value !== iss.description) updateIssue(iss.id, 'description', e.target.value); }}
                            placeholder="에러 스택, 재현 방법, 메모 등..."
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-mono resize-y focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </div>
                        {/* 연관 TC */}
                        <LinkedTCPanel issueId={iss.id} onNavigateToTC={onNavigateToTC} />
                        {/* 스크린샷 */}
                        <ScreenshotPanel endpoint="/api/issue-screenshots" ownerKey="issue_id" ownerId={iss.id} />
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {displayed.length === 0 && (
              <tr><td colSpan={11} className="text-center py-20 text-gray-400">
                {issues.length === 0 ? '이슈가 없습니다. 이슈 추가 버튼을 눌러주세요.' : '필터 조건에 맞는 이슈가 없습니다.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

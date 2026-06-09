'use client';
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, X, ImageIcon, Paperclip, Link2, Link2Off } from 'lucide-react';

/* ── 타입 ── */
type Issue = {
  id: number; project_id: number; issue_id: string; title: string;
  type: string; status: string; priority: string; description: string;
  linked_tc_count: number; screenshot_count: number; created_at: string;
};
type LinkedTC = { id: number; tc_id: string; category: string; sub_category: string; module_name: string };
type Screenshot = { id: number; issue_id: number; filename: string };
type TCOption = { id: number; tc_id: string; category: string; module_name: string };

/* ── 상수 ── */
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;
const TYPES    = ['Bug', 'Task', 'Improvement', 'Feature'] as const;
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

const STATUS_STYLE: Record<string, string> = {
  'Open':        'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Resolved':    'bg-green-100 text-green-700',
  'Closed':      'bg-gray-200 text-gray-500',
};
const TYPE_STYLE: Record<string, string> = {
  Bug:         'bg-red-100 text-red-700',
  Task:        'bg-blue-100 text-blue-600',
  Improvement: 'bg-green-100 text-green-700',
  Feature:     'bg-purple-100 text-purple-700',
};
const PRIORITY_COLOR: Record<string, string> = {
  Critical: 'text-red-500', High: 'text-orange-400', Medium: 'text-yellow-400', Low: 'text-blue-300',
};

/* ── 스크린샷 패널 ── */
function IssueScreenshotPanel({ issueId }: { issueId: number }) {
  const [shots, setShots] = useState<Screenshot[]>([]);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => { fetch(`/api/issue-screenshots?issue_id=${issueId}`).then(r => r.json()).then(setShots); }, [issueId]);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'));
      if (item) { e.preventDefault(); upload(item.getAsFile()!); }
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [issueId]);

  async function upload(file: File) {
    const form = new FormData();
    form.append('issue_id', String(issueId));
    form.append('file', file);
    await fetch('/api/issue-screenshots', { method: 'POST', body: form });
    const res = await fetch(`/api/issue-screenshots?issue_id=${issueId}`);
    setShots(await res.json());
  }

  async function del(id: number) {
    await fetch(`/api/issue-screenshots/${id}`, { method: 'DELETE' });
    setShots(prev => prev.filter(s => s.id !== id));
  }

  return (
    <>
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon size={13} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500">스크린샷</span>
          <span className="text-xs text-gray-400">— Ctrl+V 또는 드롭</span>
          <label className="ml-auto flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs cursor-pointer text-gray-600">
            <Plus size={11} /> 파일 선택
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { upload(f); e.target.value = ''; } }} />
          </label>
        </div>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/')); if (f) upload(f); }}
          className={`min-h-[72px] rounded-lg border-2 border-dashed p-3 flex flex-wrap gap-3 items-start transition-colors
            ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
          {shots.length === 0 && !dragging && <span className="text-xs text-gray-400 m-auto">이미지를 여기에 드롭하거나 Ctrl+V</span>}
          {shots.map(s => (
            <div key={s.id} className="relative group">
              <img src={`/screenshots/${s.filename}`} alt="" onClick={() => setLightbox(`/screenshots/${s.filename}`)}
                className="h-20 w-auto rounded border border-gray-200 cursor-pointer hover:opacity-90 object-cover shadow-sm" />
              <button onClick={() => del(s.id)}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>
      {lightbox && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] rounded shadow-xl" />
          <button className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2"><X size={20} /></button>
        </div>
      )}
    </>
  );
}

/* ── 연관 TC 패널 ── */
function LinkedTCPanel({ issueId, projectId }: { issueId: number; projectId: number }) {
  const [linked, setLinked] = useState<LinkedTC[]>([]);
  const [options, setOptions] = useState<TCOption[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchLinked(); }, [issueId]);
  useEffect(() => {
    fetch(`/api/testcases?project_id_hint=${projectId}`)
      .then(() => fetch(`/api/modules?project_id=${projectId}`))
      .then(r => r.json())
      .then(async (mods: { id: number; name: string }[]) => {
        const all: TCOption[] = [];
        for (const m of mods) {
          const tcs = await fetch(`/api/testcases?module_id=${m.id}`).then(r => r.json());
          tcs.forEach((tc: { id: number; tc_id: string; category: string }) =>
            all.push({ id: tc.id, tc_id: tc.tc_id, category: tc.category, module_name: m.name }));
        }
        setOptions(all);
      });
  }, [projectId]);

  async function fetchLinked() {
    const res = await fetch(`/api/issues/${issueId}/links`);
    setLinked(await res.json());
  }
  async function link(tcId: number) {
    await fetch(`/api/issues/${issueId}/links`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_case_id: tcId }) });
    fetchLinked(); setShowPicker(false); setSearch('');
  }
  async function unlink(tcId: number) {
    await fetch(`/api/issues/${issueId}/links`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_case_id: tcId }) });
    fetchLinked();
  }

  const linkedIds = new Set(linked.map(l => l.id));
  const filtered = options.filter(o => !linkedIds.has(o.id) &&
    (o.tc_id.toLowerCase().includes(search.toLowerCase()) ||
     o.category?.toLowerCase().includes(search.toLowerCase()) ||
     o.module_name.toLowerCase().includes(search.toLowerCase())));

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
            <span className="font-mono font-semibold">{tc.tc_id}</span>
            {tc.category && <span className="text-blue-400">· {tc.category}</span>}
            <span className="text-blue-300 text-[10px]">[{tc.module_name}]</span>
            <button onClick={() => unlink(tc.id)} className="ml-0.5 hover:text-red-500"><X size={10} /></button>
          </span>
        ))}
      </div>

      {/* TC 선택 피커 */}
      {showPicker && (
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="TC ID 또는 대분류로 검색..."
              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {filtered.slice(0, 50).map(o => (
              <button key={o.id} onClick={() => link(o.id)}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs flex items-center gap-2 border-b border-gray-50">
                <span className="font-mono text-blue-600 shrink-0">{o.tc_id}</span>
                <span className="text-gray-600 truncate">{o.category}</span>
                <span className="text-gray-400 text-[10px] ml-auto shrink-0">{o.module_name}</span>
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
export default function IssueView({ projectId, projectName }: { projectId: number | null; projectName: string }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType]     = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  useEffect(() => { if (projectId) fetchIssues(); }, [projectId]);

  async function fetchIssues() {
    if (!projectId) return;
    const res = await fetch(`/api/issues?project_id=${projectId}`);
    setIssues(await res.json());
  }

  async function addIssue() {
    if (!projectId) return;
    await fetch('/api/issues', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId }) });
    fetchIssues();
  }

  async function deleteIssue(id: number) {
    if (!confirm('이슈를 삭제할까요?')) return;
    await fetch(`/api/issues/${id}`, { method: 'DELETE' });
    if (expandedId === id) setExpandedId(null);
    fetchIssues();
  }

  async function updateIssue(id: number, field: string, value: string) {
    await fetch(`/api/issues/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }) });
    setIssues(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }

  const displayed = issues.filter(i =>
    (!filterStatus   || i.status === filterStatus) &&
    (!filterType     || i.type === filterType) &&
    (!filterPriority || i.priority === filterPriority)
  );

  if (!projectId) return (
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
        <button onClick={addIssue}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-[#1f3864] text-white rounded hover:bg-[#2a4f8a] text-xs">
          <Plus size={13} /> 이슈 추가
        </button>
      </div>

      {/* 이슈 테이블 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-[#1f3864] text-white z-10">
            <tr>
              {['ID','제목','유형','상태','우선순위','TC','📎','날짜',''].map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-white/10 last:border-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map(iss => (
              <React.Fragment key={iss.id}>
                <tr className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer
                  ${iss.status === 'Closed' ? 'opacity-60' : ''}`}
                  onClick={() => setExpandedId(expandedId === iss.id ? null : iss.id)}>
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
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => deleteIssue(iss.id)} className="p-1 rounded hover:bg-red-100 text-red-300 hover:text-red-600"><Trash2 size={13} /></button>
                      {expandedId === iss.id ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                    </div>
                  </td>
                </tr>

                {expandedId === iss.id && (
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <td colSpan={9} className="px-8 py-5">
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
                            ['유형', 'type', TYPES, TYPE_STYLE[iss.type]],
                            ['우선순위', 'priority', PRIORITIES, ''],
                          ] as [string, string, readonly string[], string][]).map(([label, field, opts]) => (
                            <div key={field}>
                              <label className="block text-xs text-gray-500 mb-1 font-medium">{label}</label>
                              <select defaultValue={String(iss[field as keyof Issue])}
                                onChange={e => updateIssue(iss.id, field, e.target.value)}
                                className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none">
                                {opts.map(o => <option key={o}>{o}</option>)}
                              </select>
                            </div>
                          ))}
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
                        <LinkedTCPanel issueId={iss.id} projectId={projectId!} />
                        {/* 스크린샷 */}
                        <IssueScreenshotPanel issueId={iss.id} />
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {displayed.length === 0 && (
              <tr><td colSpan={9} className="text-center py-20 text-gray-400">
                {issues.length === 0 ? '이슈가 없습니다. 이슈 추가 버튼을 눌러주세요.' : '필터 조건에 맞는 이슈가 없습니다.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

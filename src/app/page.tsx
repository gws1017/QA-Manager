'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
  Download, Upload, Plus, Trash2, ChevronDown, ChevronUp,
  CheckSquare, Square, Paperclip, X, ImageIcon, Copy,
  FolderOpen, Folder, ChevronRight, ClipboardList, Bug, LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import IssueView from './components/IssueView';

type Project = { id: number; name: string; description: string };
type Module  = { id: number; project_id: number; name: string; description: string };
type TC = {
  id: number; module_id: number; tc_id: string;
  category: string; sub_category: string; detail: string;
  steps: string; expected: string; result: string;
  actual_result: string; note: string; priority: string;
  screenshot_count: number;
};
type Screenshot = { id: number; test_case_id: number; filename: string; caption: string };

const RESULTS = ['Pass', 'Fail', 'N/A', 'No Run'] as const;
const RESULT_STYLE: Record<string, string> = {
  Pass:    'bg-green-100 text-green-800',
  Fail:    'bg-red-100 text-red-800 font-bold',
  'N/A':   'bg-yellow-100 text-yellow-800',
  'No Run':'bg-gray-100 text-gray-600',
};
const ROW_STYLE: Record<string, string> = {
  Pass: 'bg-green-50', Fail: 'bg-red-50', 'N/A': 'bg-yellow-50', 'No Run': '',
};

/* ───────── TC에 연결된 이슈 패널 ───────── */
type LinkedIssue = { id: number; issue_id: string; title: string; status: string; priority: string; type: string; issue_project_id: number };
const STATUS_STYLE_MINI: Record<string, string> = {
  'Open': 'bg-gray-100 text-gray-600', 'In Progress': 'bg-blue-100 text-blue-700',
  'Resolved': 'bg-green-100 text-green-700', 'Closed': 'bg-gray-200 text-gray-500',
};
const PRIORITY_DOT: Record<string, string> = { Critical: 'text-red-500', High: 'text-orange-400', Medium: 'text-yellow-400', Low: 'text-blue-300' };

function LinkedIssuesPanel({ tcId, onNavigateToIssue }: {
  tcId: number;
  onNavigateToIssue: (projectId: number, issueId: number) => void;
}) {
  const [issues, setIssues] = useState<LinkedIssue[]>([]);
  useEffect(() => {
    fetch(`/api/testcases/${tcId}/issues`).then(r => r.json()).then(setIssues);
  }, [tcId]);

  if (issues.length === 0) return null;

  return (
    <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-500">🔗 연관 이슈</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {issues.map(iss => (
          <button key={iss.id}
            onClick={() => onNavigateToIssue(iss.issue_project_id, iss.id)}
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 hover:bg-orange-100 transition-colors"
            title="해당 이슈로 이동">
            <span className={`font-bold text-[10px] ${PRIORITY_DOT[iss.priority]}`}>●</span>
            <span className="font-mono font-semibold">{iss.issue_id}</span>
            <span className="text-orange-600 max-w-[160px] truncate">{iss.title}</span>
            <span className={`px-1 py-0.5 rounded text-[10px] ${STATUS_STYLE_MINI[iss.status]}`}>{iss.status}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────── 스크린샷 패널 ───────── */
function ScreenshotPanel({ tcId }: { tcId: number }) {
  const [shots, setShots] = useState<Screenshot[]>([]);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; caption: string } | null>(null);

  useEffect(() => { fetchShots(); }, [tcId]);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imgItem = items.find(i => i.type.startsWith('image/'));
      if (imgItem) { e.preventDefault(); upload(imgItem.getAsFile()!); }
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [tcId]);

  async function fetchShots() {
    const res = await fetch(`/api/screenshots?tc_id=${tcId}`);
    setShots(await res.json());
  }
  async function upload(file: File) {
    const form = new FormData();
    form.append('tc_id', String(tcId));
    form.append('file', file);
    await fetch('/api/screenshots', { method: 'POST', body: form });
    fetchShots();
  }
  async function deleteShot(id: number) {
    await fetch(`/api/screenshots/${id}`, { method: 'DELETE' });
    setShots(prev => prev.filter(s => s.id !== id));
  }
  async function updateCaption(id: number, caption: string) {
    await fetch(`/api/screenshots/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption }) });
    setShots(prev => prev.map(s => s.id === id ? { ...s, caption } : s));
  }

  return (
    <>
      <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon size={13} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500">스크린샷</span>
          <span className="text-xs text-gray-400">— Ctrl+V 붙여넣기 또는 드롭</span>
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
          className={`min-h-[80px] rounded-lg border-2 border-dashed p-3 flex flex-wrap gap-3 items-start transition-colors
            ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
          {shots.length === 0 && !dragging && (
            <span className="text-xs text-gray-400 m-auto">이미지를 여기에 드롭하거나 Ctrl+V로 붙여넣기</span>
          )}
          {shots.map(s => (
            <div key={s.id} className="relative group flex flex-col items-center gap-1">
              <div className="relative">
                <img src={`/api/img/${s.filename}`} alt={s.caption || 'screenshot'}
                  onClick={() => setLightbox({ src: `/api/img/${s.filename}`, caption: s.caption })}
                  className="h-24 w-auto rounded border border-gray-200 cursor-pointer hover:opacity-90 object-cover shadow-sm" />
                <button onClick={() => deleteShot(s.id)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={10} />
                </button>
              </div>
              <input
                defaultValue={s.caption}
                onBlur={e => { if (e.target.value !== s.caption) updateCaption(s.id, e.target.value); }}
                placeholder="캡션 입력..."
                className="w-24 text-[11px] text-center text-gray-500 border-0 border-b border-gray-200 bg-transparent focus:outline-none focus:border-blue-400 placeholder-gray-300 truncate"
              />
            </div>
          ))}
        </div>
      </div>
      {lightbox && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center gap-3" onClick={() => setLightbox(null)}>
          <img src={lightbox.src} alt={lightbox.caption || 'fullsize'} className="max-w-[90vw] max-h-[85vh] rounded shadow-xl" />
          {lightbox.caption && (
            <p className="text-white text-sm bg-black/40 px-4 py-1.5 rounded-full">{lightbox.caption}</p>
          )}
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2"><X size={20} /></button>
        </div>
      )}
    </>
  );
}

/* ───────── 메인 ───────── */
export default function Home() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [projects, setProjects]           = useState<Project[]>([]);       // TC 전용
  const [issueProjects, setIssueProjects] = useState<Project[]>([]);       // 이슈 전용
  const [modules, setModules]             = useState<Module[]>([]);
  const [view, setView] = useState<'tc' | 'issue'>('tc');
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [selectedModule, setSelectedModule]         = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId]   = useState<number | null>(null); // TC 프로젝트
  const [selectedIssueProjectId, setSelectedIssueProjectId] = useState<number | null>(null); // 이슈 프로젝트
  const [tcs, setTcs]                     = useState<TC[]>([]);
  const [expandedId, setExpandedId]       = useState<number | null>(null);
  const [importing, setImporting]         = useState(false);
  const [selected, setSelected]           = useState<Set<number>>(new Set());
  const [filterResult, setFilterResult]   = useState<string>('');
  const [moveTargetModule, setMoveTargetModule] = useState<string>('');
  const [jumpToIssueId, setJumpToIssueId] = useState<number | null>(null);
  const scrollTargetTC = useRef<number | null>(null);

  // 추가 입력 상태
  const [newProjectName, setNewProjectName] = useState('');
  const [newModuleName, setNewModuleName]   = useState('');
  const [addingModuleFor, setAddingModuleFor] = useState<number | null>(null);

  // 이름 변경 상태  { type: 'project'|'module', id, value }
  const [renaming, setRenaming] = useState<{ type: 'project' | 'module'; id: number; value: string } | null>(null);

  useEffect(() => {
    fetchAll();
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.userId) setUserId(d.userId); });
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }
  useEffect(() => {
    if (selectedModule) {
      // 네비게이션으로 온 경우엔 expandedId 초기화 안 함
      if (scrollTargetTC.current === null) setExpandedId(null);
      setSelected(new Set());
      setFilterResult('');
      fetchTCs(selectedModule);
    }
  }, [selectedModule]);

  // tcs가 렌더된 후 스크롤 타겟 처리
  useEffect(() => {
    const target = scrollTargetTC.current;
    if (target == null) return;
    // 다음 paint 후 스크롤
    requestAnimationFrame(() => {
      const el = document.getElementById(`tc-row-${target}`);
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        scrollTargetTC.current = null;
      }
    });
  }, [tcs]);

  async function fetchAll() {
    const [pRes, mRes, ipRes] = await Promise.all([
      fetch('/api/projects'), fetch('/api/modules'), fetch('/api/issue-projects'),
    ]);
    const projs: Project[]  = await pRes.json();
    const mods: Module[]    = await mRes.json();
    const iProjs: Project[] = await ipRes.json();
    setProjects(projs);
    setModules(mods);
    setIssueProjects(iProjs);
    setExpandedProjects(new Set(projs.map(p => p.id)));
    if (mods.length > 0 && !selectedModule) {
      setSelectedModule(mods[0].id);
      setSelectedProjectId(mods[0].project_id);
    }
    if (iProjs.length > 0 && !selectedIssueProjectId) {
      setSelectedIssueProjectId(iProjs[0].id);
    }
  }

  async function fetchTCs(moduleId: number) {
    const res = await fetch(`/api/testcases?module_id=${moduleId}`);
    setTcs(await res.json());
  }

  /* 프로젝트 */
  async function addProject() {
    if (!newProjectName.trim()) return;
    await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProjectName }) });
    setNewProjectName('');
    fetchAll();
  }
  async function renameProject(id: number, name: string) {
    if (!name.trim()) return;
    await fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }) });
    setRenaming(null); fetchAll();
  }
  async function renameModule(id: number, name: string) {
    if (!name.trim()) return;
    await fetch(`/api/modules/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }) });
    setRenaming(null); fetchAll();
  }

  async function deleteProject(id: number) {
    const proj = projects.find(p => p.id === id);
    if (!confirm(`"${proj?.name}" 프로젝트를 삭제할까요?\n포함된 탭과 테스트케이스가 모두 삭제됩니다.`)) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (selectedProjectId === id) { setSelectedModule(null); setSelectedProjectId(null); setTcs([]); }
    fetchAll();
  }

  /* 이슈 프로젝트 */
  const [newIssueProjectName, setNewIssueProjectName] = useState('');
  async function addIssueProject() {
    if (!newIssueProjectName.trim()) return;
    await fetch('/api/issue-projects', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newIssueProjectName }) });
    setNewIssueProjectName(''); fetchAll();
  }
  async function deleteIssueProject(id: number) {
    const proj = issueProjects.find(p => p.id === id);
    if (!confirm(`"${proj?.name}" 이슈 프로젝트를 삭제할까요?\n포함된 이슈가 모두 삭제됩니다.`)) return;
    await fetch(`/api/issue-projects/${id}`, { method: 'DELETE' });
    if (selectedIssueProjectId === id) setSelectedIssueProjectId(null);
    fetchAll();
  }
  async function renameIssueProject(id: number, name: string) {
    if (!name.trim()) return;
    await fetch(`/api/issue-projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }) });
    setRenaming(null); fetchAll();
  }

  /* 모듈 */
  async function addModule(projectId: number) {
    if (!newModuleName.trim()) return;
    await fetch('/api/modules', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newModuleName, project_id: projectId }) });
    setNewModuleName(''); setAddingModuleFor(null);
    fetchAll();
  }
  async function deleteModule(id: number) {
    const mod = modules.find(m => m.id === id);
    if (!confirm(`"${mod?.name}" 탭을 삭제할까요?\n포함된 테스트케이스도 모두 삭제됩니다.`)) return;
    await fetch(`/api/modules/${id}`, { method: 'DELETE' });
    if (selectedModule === id) { setSelectedModule(null); setTcs([]); }
    fetchAll();
  }

  /* 뷰 간 네비게이션 */
  function navigateToTC(moduleId: number, tcId: number) {
    const mod = modules.find(m => m.id === moduleId);
    if (mod) setSelectedProjectId(mod.project_id);
    setExpandedId(tcId);
    setView('tc');

    if (selectedModule === moduleId) {
      // 이미 같은 모듈 선택 중 → useEffect 트리거 안 됨 → 직접 스크롤
      requestAnimationFrame(() => {
        document.getElementById(`tc-row-${tcId}`)?.scrollIntoView({ behavior: 'instant', block: 'center' });
      });
    } else {
      // 다른 모듈 → fetchTCs 후 tcs 변경 시 useEffect에서 스크롤
      scrollTargetTC.current = tcId;
      setSelectedModule(moduleId);
    }
  }

  function navigateToIssue(issueProjectId: number, issueId: number) {
    setSelectedIssueProjectId(issueProjectId);
    setJumpToIssueId(issueId);
    setView('issue');
    setTimeout(() => setJumpToIssueId(null), 500);
  }

  /* TC */
  async function addTC() {
    if (!selectedModule) return;
    await fetch('/api/testcases', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_id: selectedModule }) });
    fetchTCs(selectedModule);
  }
  async function deleteTC(id: number) {
    if (!confirm('삭제할까요?')) return;
    await fetch(`/api/testcases/${id}`, { method: 'DELETE' });
    fetchTCs(selectedModule!);
  }
  async function duplicateTC(id: number) {
    await fetch(`/api/testcases/${id}`, { method: 'POST' });
    fetchTCs(selectedModule!);
  }
  async function updateTC(id: number, field: string, value: string) {
    await fetch(`/api/testcases/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }) });
    setTcs(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  }
  async function bulkAction(action: 'delete' | 'result' | 'move', result?: string) {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (action === 'delete' && !confirm(`${ids.length}건을 삭제할까요?`)) return;
    if (action === 'move') {
      if (!moveTargetModule) return;
      if (!confirm(`${ids.length}건을 선택한 탭으로 이동할까요?`)) return;
      await fetch('/api/testcases/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'move', target_module_id: Number(moveTargetModule) }) });
      setSelected(new Set());
      setMoveTargetModule('');
      if (selectedModule) fetchTCs(selectedModule);
      return;
    }
    await fetch('/api/testcases/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action, result }) });
    setSelected(new Set());
    if (selectedModule) fetchTCs(selectedModule);
  }

  async function importExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/import', { method: 'POST', body: form });
    const data = await res.json();
    setImporting(false); e.target.value = '';
    alert(`Import 완료\n업데이트: ${data.updated}건\n신규: ${data.inserted}건`);
    if (selectedModule) fetchTCs(selectedModule);
  }

  function toggleSelect(id: number) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(prev => prev.size === tcs.length ? new Set() : new Set(tcs.map(t => t.id)));
  }
  function toggleProject(id: number) {
    setExpandedProjects(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const allSelected = tcs.length > 0 && selected.size === tcs.length;
  const stats = {
    total: tcs.length,
    pass:  tcs.filter(t => t.result === 'Pass').length,
    fail:  tcs.filter(t => t.result === 'Fail').length,
    norun: tcs.filter(t => t.result === 'No Run').length,
  };
  const displayedTcs = filterResult ? tcs.filter(t => t.result === filterResult) : tcs;
  const currentModule  = modules.find(m => m.id === selectedModule);
  const currentProject = projects.find(p => p.id === currentModule?.project_id);

  return (
    <div className="flex h-screen bg-gray-50 text-sm">

      {/* ── 사이드바 ── */}
      <aside className="w-60 bg-[#1f3864] text-white flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-white/20 flex items-center justify-between">
          <span className="text-base font-bold tracking-wide">QA Manager</span>
          <div className="flex items-center gap-2">
            {userId && <span className="text-xs text-white/60 truncate max-w-[80px]">{userId}</span>}
            <button onClick={logout} title="로그아웃" className="p-1 rounded hover:bg-white/20 text-white/60 hover:text-white">
              <LogOut size={14} />
            </button>
          </div>
        </div>
        {/* 뷰 전환 탭 */}
        <div className="flex border-b border-white/20 shrink-0">
          <button onClick={() => setView('tc')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors
              ${view === 'tc' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}`}>
            <ClipboardList size={13} /> TC 관리
          </button>
          <button onClick={() => setView('issue')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors
              ${view === 'issue' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}`}>
            <Bug size={13} /> 이슈
          </button>
        </div>

        {/* ── TC 뷰: 프로젝트 + 탭 트리 ── */}
        {view === 'tc' && (
          <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
            {projects.map(proj => {
              const projModules = modules.filter(m => m.project_id === proj.id);
              const isOpen = expandedProjects.has(proj.id);
              return (
                <div key={proj.id}>
                  <div className="group flex items-center px-2 py-1.5 hover:bg-white/10 cursor-pointer rounded mx-1"
                    onClick={() => toggleProject(proj.id)}>
                    <button className="text-white/60 hover:text-white mr-1 shrink-0" onClick={e => { e.stopPropagation(); toggleProject(proj.id); }}>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    {isOpen
                      ? <FolderOpen size={14} className="mr-2 text-yellow-300 shrink-0" />
                      : <Folder    size={14} className="mr-2 text-yellow-300 shrink-0" />}
                    {renaming?.type === 'project' && renaming.id === proj.id ? (
                      <input autoFocus value={renaming.value}
                        onChange={e => setRenaming({ ...renaming, value: e.target.value })}
                        onBlur={() => renameProject(proj.id, renaming.value)}
                        onKeyDown={e => { if (e.key === 'Enter') renameProject(proj.id, renaming.value); if (e.key === 'Escape') setRenaming(null); }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 min-w-0 px-1 py-0 text-sm font-semibold bg-white/20 text-white rounded border border-white/40 focus:outline-none" />
                    ) : (
                      <span className="flex-1 text-sm font-semibold truncate"
                        onDoubleClick={e => { e.stopPropagation(); setRenaming({ type: 'project', id: proj.id, value: proj.name }); }}>
                        {proj.name}
                      </span>
                    )}
                    <button title="탭 추가" onClick={e => { e.stopPropagation(); setAddingModuleFor(addingModuleFor === proj.id ? null : proj.id); setNewModuleName(''); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/20 text-white/60 hover:text-white shrink-0">
                      <Plus size={12} />
                    </button>
                    <button title="프로젝트 삭제" onClick={e => { e.stopPropagation(); deleteProject(proj.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/40 text-white/60 hover:text-white shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {addingModuleFor === proj.id && (
                    <div className="mx-3 mb-1 flex gap-1" onClick={e => e.stopPropagation()}>
                      <input autoFocus value={newModuleName} onChange={e => setNewModuleName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addModule(proj.id); if (e.key === 'Escape') setAddingModuleFor(null); }}
                        placeholder="새 탭 이름"
                        className="min-w-0 flex-1 px-2 py-1 text-xs text-white bg-white/10 placeholder-white/40 rounded border border-white/30 focus:outline-none focus:border-white/60" />
                      <button onClick={() => addModule(proj.id)} className="px-2 py-1 bg-white/20 rounded hover:bg-white/30 text-xs shrink-0">추가</button>
                    </div>
                  )}
                  {isOpen && projModules.map(mod => (
                    <div key={mod.id}
                      className={`group flex items-center pl-8 pr-2 py-1.5 cursor-pointer hover:bg-white/10 rounded mx-1
                        ${selectedModule === mod.id ? 'bg-white/20 font-semibold' : ''}`}
                      onClick={() => { setSelectedModule(mod.id); setSelectedProjectId(proj.id); }}>
                      {renaming?.type === 'module' && renaming.id === mod.id ? (
                        <input autoFocus value={renaming.value}
                          onChange={e => setRenaming({ ...renaming, value: e.target.value })}
                          onBlur={() => renameModule(mod.id, renaming.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameModule(mod.id, renaming.value); if (e.key === 'Escape') setRenaming(null); }}
                          onClick={e => e.stopPropagation()}
                          className="flex-1 min-w-0 px-1 py-0 text-xs bg-white/20 text-white rounded border border-white/40 focus:outline-none" />
                      ) : (
                        <span className="flex-1 text-xs truncate"
                          onDoubleClick={e => { e.stopPropagation(); setRenaming({ type: 'module', id: mod.id, value: mod.name }); }}>
                          {mod.name}
                        </span>
                      )}
                      <button onClick={e => { e.stopPropagation(); deleteModule(mod.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/40 text-white/60 hover:text-white shrink-0">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </nav>
        )}

        {/* ── 이슈 뷰: 이슈 전용 프로젝트 목록 ── */}
        {view === 'issue' && (
          <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
            {issueProjects.map(proj => (
              <div key={proj.id}
                className={`group flex items-center px-3 py-2.5 cursor-pointer hover:bg-white/10 rounded mx-1 transition-colors
                  ${selectedIssueProjectId === proj.id ? 'bg-white/20 font-semibold' : ''}`}
                onClick={() => setSelectedIssueProjectId(proj.id)}>
                <FolderOpen size={14} className="mr-2 text-orange-300 shrink-0" />
                {renaming?.type === 'project' && renaming.id === proj.id ? (
                  <input autoFocus value={renaming.value}
                    onChange={e => setRenaming({ ...renaming, value: e.target.value })}
                    onBlur={() => renameIssueProject(proj.id, renaming.value)}
                    onKeyDown={e => { if (e.key === 'Enter') renameIssueProject(proj.id, renaming.value); if (e.key === 'Escape') setRenaming(null); }}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 min-w-0 px-1 py-0 text-sm bg-white/20 text-white rounded border border-white/40 focus:outline-none" />
                ) : (
                  <span className="flex-1 text-sm truncate"
                    onDoubleClick={e => { e.stopPropagation(); setRenaming({ type: 'project', id: proj.id, value: proj.name }); }}>
                    {proj.name}
                  </span>
                )}
                <button title="삭제" onClick={e => { e.stopPropagation(); deleteIssueProject(proj.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/40 text-white/60 hover:text-white shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </nav>
        )}

        {/* ── TC 프로젝트 추가 ── */}
        {view === 'tc' && <div className="px-3 pt-3 pb-6 border-t border-white/20">
          <p className="text-white/40 text-[10px] mb-1.5 uppercase tracking-wider">새 프로젝트</p>
          <div className="flex gap-1 w-full">
            <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addProject()}
              placeholder="프로젝트 이름"
              className="min-w-0 flex-1 px-2 py-1 text-xs text-white bg-white/10 placeholder-white/40 rounded border border-white/20 focus:outline-none focus:border-white/50" />
            <button onClick={addProject}
              className="w-8 h-7 flex items-center justify-center bg-white/20 rounded hover:bg-white/30 shrink-0">
              <Plus size={14} />
            </button>
          </div>
        </div>}

        {/* ── 이슈 프로젝트 추가 ── */}
        {view === 'issue' && <div className="px-3 pt-3 pb-6 border-t border-white/20">
          <p className="text-white/40 text-[10px] mb-1.5 uppercase tracking-wider">새 이슈 프로젝트</p>
          <div className="flex gap-1 w-full">
            <input value={newIssueProjectName} onChange={e => setNewIssueProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addIssueProject()}
              placeholder="이슈 프로젝트 이름"
              className="min-w-0 flex-1 px-2 py-1 text-xs text-white bg-white/10 placeholder-white/40 rounded border border-white/20 focus:outline-none focus:border-white/50" />
            <button onClick={addIssueProject}
              className="w-8 h-7 flex items-center justify-center bg-white/20 rounded hover:bg-white/30 shrink-0">
              <Plus size={14} />
            </button>
          </div>
        </div>}
      </aside>

      {/* ── 메인 영역 ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* TC 헤더 (TC 뷰일 때만) */}
        {view === 'tc' && <header className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {currentProject && <span className="text-gray-400 text-xs">{currentProject.name}</span>}
            {currentProject && <ChevronRight size={13} className="text-gray-300" />}
            <h1 className="font-bold text-gray-800">{currentModule?.name ?? '탭을 선택하세요'}</h1>
            <div className="flex gap-2 text-xs ml-3">
              <button onClick={() => setFilterResult('')}
                className={`px-2 py-1 rounded transition-all ${filterResult === '' ? 'bg-gray-400 text-white font-bold ring-2 ring-gray-400 ring-offset-1' : 'bg-gray-100 hover:bg-gray-200'}`}>
                전체 {stats.total}
              </button>
              <button onClick={() => setFilterResult(filterResult === 'Pass' ? '' : 'Pass')}
                className={`px-2 py-1 rounded transition-all ${filterResult === 'Pass' ? 'bg-green-500 text-white font-bold ring-2 ring-green-400 ring-offset-1' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                Pass {stats.pass}
              </button>
              <button onClick={() => setFilterResult(filterResult === 'Fail' ? '' : 'Fail')}
                className={`px-2 py-1 rounded transition-all ${filterResult === 'Fail' ? 'bg-red-500 text-white font-bold ring-2 ring-red-400 ring-offset-1' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                Fail {stats.fail}
              </button>
              <button onClick={() => setFilterResult(filterResult === 'No Run' ? '' : 'No Run')}
                className={`px-2 py-1 rounded transition-all ${filterResult === 'No Run' ? 'bg-gray-500 text-white font-bold ring-2 ring-gray-400 ring-offset-1' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                No Run {stats.norun}
              </button>
              {stats.total > 0 && (
                <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">
                  진행률 {Math.round(stats.pass / stats.total * 100)}%
                </span>
              )}
              {filterResult && (
                <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 font-medium">
                  {displayedTcs.length}건 표시중
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addTC} disabled={!selectedModule}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#1f3864] text-white rounded hover:bg-[#2a4f8a] text-xs disabled:opacity-40">
              <Plus size={13} /> TC 추가
            </button>
            <label className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs cursor-pointer text-white ${importing ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
              <Upload size={13} /> {importing ? '처리중...' : '엑셀 Import'}
              <input type="file" accept=".xlsx" className="hidden" onChange={importExcel} disabled={importing} />
            </label>
            <a href="/api/export" className="flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800 text-xs">
              <Download size={13} /> 엑셀 Export
            </a>
          </div>
        </header>}

        {/* 일괄 작업 툴바 */}
        {view === 'tc' && selected.size > 0 && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-2 flex items-center gap-3 shrink-0">
            <span className="text-blue-700 font-semibold text-xs">{selected.size}건 선택됨</span>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-500">결과 일괄 변경:</span>
            {RESULTS.map(r => (
              <button key={r} onClick={() => bulkAction('result', r)}
                className={`px-2.5 py-1 rounded text-xs font-medium ${RESULT_STYLE[r]} hover:opacity-80`}>{r}</button>
            ))}
            <span className="text-gray-300">|</span>
            <button onClick={() => bulkAction('delete')}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200 font-medium">
              <Trash2 size={12} /> 일괄 삭제
            </button>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-500">탭 이동:</span>
            <select value={moveTargetModule} onChange={e => setMoveTargetModule(e.target.value)}
              className="text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none bg-white max-w-[200px]">
              <option value="">— 이동할 탭 선택 —</option>
              {projects.map(proj => (
                <optgroup key={proj.id} label={proj.name}>
                  {modules.filter(m => m.project_id === proj.id && m.id !== selectedModule).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button onClick={() => bulkAction('move')} disabled={!moveTargetModule}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-blue-500 text-white hover:bg-blue-600 font-medium disabled:opacity-40 disabled:cursor-not-allowed">
              이동
            </button>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-gray-400 hover:text-gray-600">선택 해제</button>
          </div>
        )}

        {/* 이슈 뷰 */}
        {view === 'issue' && (
          <IssueView
            issueProjectId={selectedIssueProjectId}
            projectName={issueProjects.find(p => p.id === selectedIssueProjectId)?.name ?? ''}
            onNavigateToTC={navigateToTC}
            jumpToIssueId={jumpToIssueId}
          />
        )}

        {/* TC 테이블 */}
        {view === 'tc' && <div className="flex-1 overflow-auto">
          {!selectedModule ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <FolderOpen size={48} className="text-gray-200" />
              <p>왼쪽에서 탭을 선택하세요</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-[#1f3864] text-white z-10">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <button onClick={toggleAll} className="text-white/80 hover:text-white">
                      {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                    </button>
                  </th>
                  {['ID','대분류','중분류','소분류','재현스텝','기대결과','결과','실제결과','비고',''].map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-white/10 last:border-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedTcs.map(tc => (
                  <React.Fragment key={tc.id}>
                    <tr
                      id={`tc-row-${tc.id}`}
                      className={`border-b border-gray-200 hover:brightness-95 cursor-pointer ${selected.has(tc.id) ? 'ring-2 ring-inset ring-blue-400' : ''} ${ROW_STYLE[tc.result] ?? ''}`}
                      onClick={() => setExpandedId(expandedId === tc.id ? null : tc.id)}>
                      <td className="px-3 py-2" onClick={e => { e.stopPropagation(); toggleSelect(tc.id); }}>
                        {selected.has(tc.id)
                          ? <CheckSquare size={14} className="text-blue-500" />
                          : <Square size={14} className="text-gray-300 hover:text-gray-500" />}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {tc.tc_id}
                          {tc.screenshot_count > 0 && <Paperclip size={11} className="text-blue-400" title={`스크린샷 ${tc.screenshot_count}개`} />}
                        </div>
                      </td>
                      <td className="px-3 py-2 max-w-[100px] truncate" title={tc.category}>{tc.category}</td>
                      <td className="px-3 py-2 max-w-[120px] truncate" title={tc.sub_category}>{tc.sub_category}</td>
                      <td className="px-3 py-2 max-w-[130px] truncate" title={tc.detail}>{tc.detail}</td>
                      <td className="px-3 py-2 max-w-[250px] truncate" title={tc.steps}>{tc.steps}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={tc.expected}>{tc.expected}</td>
                      <td className="px-3 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <select value={tc.result} onChange={e => updateTC(tc.id, 'result', e.target.value)}
                          className={`px-2 py-0.5 rounded text-xs cursor-pointer border-0 ${RESULT_STYLE[tc.result]}`}>
                          {RESULTS.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 max-w-[120px] truncate" title={tc.actual_result}>{tc.actual_result}</td>
                      <td className="px-3 py-2 max-w-[150px] truncate" title={tc.note}>{tc.note}</td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => duplicateTC(tc.id)} title="복제" className="p-1 rounded hover:bg-blue-100 text-gray-300 hover:text-blue-500">
                            <Copy size={13} />
                          </button>
                          <button onClick={() => deleteTC(tc.id)} title="삭제" className="p-1 rounded hover:bg-red-100 text-red-300 hover:text-red-600">
                            <Trash2 size={13} />
                          </button>
                          {expandedId === tc.id ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                        </div>
                      </td>
                    </tr>
                    {expandedId === tc.id && (
                      <tr className="bg-white border-b border-gray-200">
                        <td colSpan={11} className="px-8 py-4">
                          <div className="grid grid-cols-2 gap-4 max-w-4xl">
                            {([
                              ['category','대분류',false],
                              ['sub_category','중분류',false], ['detail','소분류',false],
                              ['steps','재현스텝',true], ['expected','기대결과',true],
                              ['actual_result','실제결과',false], ['note','비고',false],
                            ] as [keyof TC, string, boolean][]).map(([field, label, wide]) => (
                              <div key={field} className={wide ? 'col-span-2' : ''}>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">{label}</label>
                                <textarea rows={wide ? 3 : 1}
                                  defaultValue={String(tc[field] ?? '')}
                                  onBlur={e => { if (e.target.value !== String(tc[field] ?? '')) updateTC(tc.id, field, e.target.value); }}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
                              </div>
                            ))}
                            <LinkedIssuesPanel tcId={tc.id} onNavigateToIssue={navigateToIssue} />
                            <ScreenshotPanel tcId={tc.id} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {tcs.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-20 text-gray-400">
                    TC가 없습니다. 상단의 TC 추가 버튼을 눌러주세요.
                  </td></tr>
                )}
                {tcs.length > 0 && displayedTcs.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-20 text-gray-400">
                    <span className="text-yellow-500 font-medium">{filterResult}</span> 결과인 TC가 없습니다.
                    <button onClick={() => setFilterResult('')} className="ml-2 text-blue-400 hover:underline text-xs">필터 해제</button>
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>}
      </main>
    </div>
  );
}

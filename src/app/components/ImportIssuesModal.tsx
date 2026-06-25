'use client';
import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { apiPost } from '@/lib/api';

type ExternalProject = { id: number; name: string };
type ExternalIssue = { id: number; issue_project_id: number; issue_id: string; title: string; type: string; status: string; priority: string; due_date: string | null };

export default function ImportIssuesModal({
  currentWorkspaceId, workspaces, targetIssueProjectId, onClose, onImported,
}: {
  currentWorkspaceId: number | null;
  workspaces: { id: number; name: string }[];
  targetIssueProjectId: number;
  onClose: () => void;
  onImported: () => void;
}) {
  const sourceOptions = [
    ...(currentWorkspaceId !== null ? [{ key: 'personal', label: '개인 스페이스' }] : []),
    ...workspaces.filter(w => w.id !== currentWorkspaceId).map(w => ({ key: String(w.id), label: w.name })),
  ];

  const [source, setSource] = useState(sourceOptions[0]?.key ?? '');
  const [projects, setProjects] = useState<ExternalProject[]>([]);
  const [issues, setIssues] = useState<ExternalIssue[]>([]);
  const [filterProjectId, setFilterProjectId] = useState<number | ''>('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!source) return;
    setLoading(true);
    setSelected(new Set());
    fetch(`/api/issues/external?source=${source}`).then(r => r.json()).then(d => {
      setProjects(d.projects ?? []);
      setIssues(d.issues ?? []);
      setFilterProjectId('');
      setLoading(false);
    });
  }, [source]);

  function toggle(id: number) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  const displayed = filterProjectId ? issues.filter(i => i.issue_project_id === filterProjectId) : issues;

  async function doImport() {
    if (selected.size === 0) return;
    setImporting(true);
    await apiPost('/api/issues/import', {
      source, issue_ids: [...selected], target_issue_project_id: targetIssueProjectId,
    });
    setImporting(false);
    onImported();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-[#1f3864]">이슈 가져오기</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="px-6 py-4 flex gap-3 border-b border-gray-100">
          <select value={source} onChange={e => setSource(e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none">
            {sourceOptions.length === 0 && <option value="">가져올 곳이 없습니다</option>}
            {sourceOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <select value={filterProjectId} onChange={e => setFilterProjectId(e.target.value ? Number(e.target.value) : '')}
            className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none">
            <option value="">전체 프로젝트</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {!loading && displayed.length > 0 && (
          <div className="px-6 pt-3 flex items-center gap-2 text-xs text-gray-500">
            <input type="checkbox"
              checked={displayed.every(i => selected.has(i.id))}
              onChange={() => {
                const allSelected = displayed.every(i => selected.has(i.id));
                setSelected(prev => {
                  const s = new Set(prev);
                  displayed.forEach(i => allSelected ? s.delete(i.id) : s.add(i.id));
                  return s;
                });
              }}
              className="accent-blue-500" />
            전체 선택
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading && <p className="text-center text-gray-400 text-sm py-10">불러오는 중...</p>}
          {!loading && displayed.length === 0 && <p className="text-center text-gray-400 text-sm py-10">가져올 이슈가 없습니다.</p>}
          {!loading && displayed.map(iss => (
            <label key={iss.id} className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 rounded cursor-pointer text-sm">
              <input type="checkbox" checked={selected.has(iss.id)} onChange={() => toggle(iss.id)} className="accent-blue-500" />
              <span className="font-mono text-xs text-gray-400 w-16 shrink-0">{iss.issue_id}</span>
              <span className="flex-1 truncate">{iss.title || <span className="text-gray-400 italic">제목 없음</span>}</span>
              <span className="text-xs text-gray-400 shrink-0">{iss.type}</span>
              <span className="text-xs text-gray-400 shrink-0">{iss.status}</span>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <span className="text-xs text-gray-500">{selected.size}개 선택됨</span>
          <button onClick={doImport} disabled={selected.size === 0 || importing}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1f3864] text-white rounded text-sm hover:bg-[#2a4f8a] disabled:opacity-40 disabled:cursor-not-allowed">
            <Download size={14} /> {importing ? '가져오는 중...' : `${selected.size}개 가져오기`}
          </button>
        </div>
      </div>
    </div>
  );
}

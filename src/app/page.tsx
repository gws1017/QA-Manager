'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Plus, Trash2, ChevronDown, ChevronUp, CheckSquare, Square, Paperclip, X, ImageIcon } from 'lucide-react';

type Module = { id: number; name: string; description: string };
type TC = {
  id: number; module_id: number; tc_id: string;
  category: string; sub_category: string; detail: string;
  steps: string; expected: string; result: string;
  actual_result: string; note: string; priority: string;
  screenshot_count: number;
};
type Screenshot = { id: number; test_case_id: number; filename: string };

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

function ScreenshotPanel({ tcId }: { tcId: number }) {
  const [shots, setShots] = useState<Screenshot[]>([]);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchShots(); }, [tcId]);

  // Ctrl+V 붙여넣기
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

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
    if (file) upload(file);
  }

  return (
    <>
      <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon size={13} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500">스크린샷</span>
          <span className="text-xs text-gray-400">— Ctrl+V 붙여넣기 또는 파일 드롭</span>
          <label className="ml-auto flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs cursor-pointer text-gray-600">
            <Plus size={11} /> 파일 선택
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { upload(f); e.target.value=''; } }} />
          </label>
        </div>

        {/* 드롭 영역 + 썸네일 */}
        <div ref={dropRef}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`min-h-[80px] rounded-lg border-2 border-dashed p-3 flex flex-wrap gap-3 items-start transition-colors
            ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
          {shots.length === 0 && !dragging && (
            <span className="text-xs text-gray-400 m-auto">이미지를 여기에 드롭하거나 Ctrl+V로 붙여넣기</span>
          )}
          {shots.map(s => (
            <div key={s.id} className="relative group">
              <img src={`/screenshots/${s.filename}`} alt="screenshot"
                onClick={() => setLightbox(`/screenshots/${s.filename}`)}
                className="h-24 w-auto rounded border border-gray-200 cursor-pointer hover:opacity-90 object-cover shadow-sm" />
              <button onClick={() => deleteShot(s.id)}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 라이트박스 */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="fullsize" className="max-w-[90vw] max-h-[90vh] rounded shadow-xl" />
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2">
            <X size={20} />
          </button>
        </div>
      )}
    </>
  );
}

export default function Home() {
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [tcs, setTcs] = useState<TC[]>([]);
  const [newModName, setNewModName] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => { fetchModules(); }, []);
  useEffect(() => { if (selectedModule) { fetchTCs(selectedModule); setSelected(new Set()); setExpandedId(null); } }, [selectedModule]);

  async function fetchModules() {
    const res = await fetch('/api/modules');
    const data = await res.json();
    setModules(data);
    if (data.length > 0) setSelectedModule(prev => prev ?? data[0].id);
  }

  async function fetchTCs(moduleId: number) {
    const res = await fetch(`/api/testcases?module_id=${moduleId}`);
    setTcs(await res.json());
  }

  async function addModule() {
    if (!newModName.trim()) return;
    await fetch('/api/modules', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newModName }) });
    setNewModName(''); fetchModules();
  }

  async function addTC() {
    if (!selectedModule) return;
    const nextId = `TC-${String(tcs.length + 1).padStart(2, '0')}`;
    await fetch('/api/testcases', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_id: selectedModule, tc_id: nextId }) });
    fetchTCs(selectedModule);
  }

  async function deleteTC(id: number) {
    if (!confirm('삭제할까요?')) return;
    await fetch(`/api/testcases/${id}`, { method: 'DELETE' });
    fetchTCs(selectedModule!);
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

  async function updateTC(id: number, field: string, value: string) {
    await fetch(`/api/testcases/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }) });
    setTcs(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  }

  async function bulkAction(action: 'delete' | 'result', result?: string) {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (action === 'delete' && !confirm(`${ids.length}건을 삭제할까요?`)) return;
    await fetch('/api/testcases/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action, result }) });
    setSelected(new Set());
    if (selectedModule) fetchTCs(selectedModule);
  }

  function toggleSelect(id: number) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(prev => prev.size === tcs.length ? new Set() : new Set(tcs.map(t => t.id)));
  }

  const allSelected = tcs.length > 0 && selected.size === tcs.length;
  const stats = {
    total: tcs.length,
    pass: tcs.filter(t => t.result === 'Pass').length,
    fail: tcs.filter(t => t.result === 'Fail').length,
    norun: tcs.filter(t => t.result === 'No Run').length,
  };

  return (
    <div className="flex h-screen bg-gray-50 text-sm">
      <aside className="w-52 bg-[#1f3864] text-white flex flex-col shrink-0">
        <div className="px-4 py-5 text-base font-bold border-b border-white/20">QA Manager</div>
        <nav className="flex-1 overflow-y-auto py-2">
          {modules.map(m => (
            <button key={m.id} onClick={() => setSelectedModule(m.id)}
              className={`w-full text-left px-4 py-2.5 hover:bg-white/10 transition-colors ${selectedModule === m.id ? 'bg-white/20 font-semibold' : ''}`}>
              {m.name}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/20">
          <div className="flex gap-1">
            <input value={newModName} onChange={e => setNewModName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addModule()}
              placeholder="새 모듈명" className="flex-1 px-2 py-1 text-xs text-black rounded" />
            <button onClick={addModule} className="px-2 py-1 bg-white/20 rounded hover:bg-white/30"><Plus size={14} /></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-gray-800">{modules.find(m => m.id === selectedModule)?.name ?? ''}</h1>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-gray-100">전체 {stats.total}</span>
              <span className="px-2 py-1 rounded bg-green-100 text-green-700">Pass {stats.pass}</span>
              <span className="px-2 py-1 rounded bg-red-100 text-red-700 font-bold">Fail {stats.fail}</span>
              <span className="px-2 py-1 rounded bg-gray-100 text-gray-500">No Run {stats.norun}</span>
              {stats.total > 0 && (
                <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">
                  진행률 {Math.round(stats.pass / stats.total * 100)}%
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addTC} className="flex items-center gap-1 px-3 py-1.5 bg-[#1f3864] text-white rounded hover:bg-[#2a4f8a] text-xs">
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
        </header>

        {selected.size > 0 && (
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
            <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-gray-400 hover:text-gray-600">선택 해제</button>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-[#1f3864] text-white z-10">
              <tr>
                <th className="px-3 py-2 w-8">
                  <button onClick={toggleAll} className="text-white/80 hover:text-white">
                    {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  </button>
                </th>
                {['ID','대분류','중분류','소분류','재현스텝','기대결과','결과','실제결과','비고',''].map((h,i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-white/10 last:border-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tcs.map(tc => (
                <>
                  <tr key={tc.id}
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
                        {tc.screenshot_count > 0 && (
                          <Paperclip size={11} className="text-blue-400" title={`스크린샷 ${tc.screenshot_count}개`} />
                        )}
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
                        <button onClick={() => deleteTC(tc.id)} className="p-1 rounded hover:bg-red-100 text-red-300 hover:text-red-600">
                          <Trash2 size={13} />
                        </button>
                        {expandedId === tc.id ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                      </div>
                    </td>
                  </tr>
                  {expandedId === tc.id && (
                    <tr key={`${tc.id}-exp`} className="bg-white border-b border-gray-200">
                      <td colSpan={11} className="px-8 py-4">
                        <div className="grid grid-cols-2 gap-4 max-w-4xl">
                          {([
                            ['tc_id','TC ID',false], ['category','대분류',false],
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
                          <ScreenshotPanel tcId={tc.id} />
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {tcs.length === 0 && (
                <tr><td colSpan={11} className="text-center py-20 text-gray-400">
                  TC가 없습니다. 상단의 TC 추가 버튼을 눌러주세요.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { Download, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

type Module = { id: number; name: string; description: string };
type TC = {
  id: number; module_id: number; tc_id: string;
  category: string; sub_category: string; detail: string;
  steps: string; expected: string; result: string;
  actual_result: string; note: string; priority: string;
};

const RESULTS = ['Pass', 'Fail', 'N/A', 'No Run'] as const;
const RESULT_STYLE: Record<string, string> = {
  Pass:    'bg-green-100 text-green-800',
  Fail:    'bg-red-100 text-red-800 font-bold',
  'N/A':   'bg-yellow-100 text-yellow-800',
  'No Run':'bg-gray-100 text-gray-600',
};
const ROW_STYLE: Record<string, string> = {
  Pass:    'bg-green-50',
  Fail:    'bg-red-50',
  'N/A':   'bg-yellow-50',
  'No Run':'',
};

export default function Home() {
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [tcs, setTcs] = useState<TC[]>([]);
  const [newModName, setNewModName] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => { fetchModules(); }, []);
  useEffect(() => { if (selectedModule) fetchTCs(selectedModule); }, [selectedModule]);

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
    setNewModName('');
    fetchModules();
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

  async function updateTC(id: number, field: string, value: string) {
    await fetch(`/api/testcases/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }) });
    setTcs(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  }

  const stats = {
    total: tcs.length,
    pass: tcs.filter(t => t.result === 'Pass').length,
    fail: tcs.filter(t => t.result === 'Fail').length,
    norun: tcs.filter(t => t.result === 'No Run').length,
  };

  return (
    <div className="flex h-screen bg-gray-50 text-sm">
      {/* 사이드바 */}
      <aside className="w-52 bg-[#1f3864] text-white flex flex-col shrink-0">
        <div className="px-4 py-5 text-base font-bold border-b border-white/20">QA Manager</div>
        <nav className="flex-1 overflow-y-auto py-2">
          {modules.map(m => (
            <button key={m.id} onClick={() => { setSelectedModule(m.id); setExpandedId(null); }}
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
            <button onClick={addModule} className="px-2 py-1 bg-white/20 rounded hover:bg-white/30 text-white">
              <Plus size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* 메인 */}
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
            <button onClick={addTC}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#1f3864] text-white rounded hover:bg-[#2a4f8a] text-xs">
              <Plus size={13} /> TC 추가
            </button>
            <a href="/api/export"
              className="flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800 text-xs">
              <Download size={13} /> 엑셀 Export
            </a>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-[#1f3864] text-white z-10">
              <tr>
                {['ID','대분류','중분류','소분류','재현스텝','기대결과','결과','실제결과','비고',''].map((h,i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-white/10 last:border-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tcs.map(tc => (
                <>
                  <tr key={tc.id}
                    className={`border-b border-gray-200 hover:brightness-95 cursor-pointer ${ROW_STYLE[tc.result] ?? ''}`}
                    onClick={() => setExpandedId(expandedId === tc.id ? null : tc.id)}>
                    <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">{tc.tc_id}</td>
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
                        <button onClick={() => deleteTC(tc.id)}
                          className="p-1 rounded hover:bg-red-100 text-red-300 hover:text-red-600">
                          <Trash2 size={13} />
                        </button>
                        {expandedId === tc.id ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                      </div>
                    </td>
                  </tr>
                  {expandedId === tc.id && (
                    <tr key={`${tc.id}-exp`} className="bg-white border-b border-gray-200">
                      <td colSpan={10} className="px-8 py-4">
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
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {tcs.length === 0 && (
                <tr><td colSpan={10} className="text-center py-20 text-gray-400">
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

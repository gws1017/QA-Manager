'use client';
import { useEffect, useState } from 'react';
import { Plus, X, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiPatch, apiDelete } from '@/lib/api';

type Screenshot = { id: number; filename: string; caption: string };

/**
 * TC / 이슈 공용 스크린샷 패널.
 * Ctrl+V 붙여넣기 · 드래그&드롭 · 파일 선택 업로드, 캡션 편집, 라이트박스 확대보기.
 *
 * @param endpoint  API 베이스 경로 (예: '/api/screenshots', '/api/issue-screenshots')
 * @param ownerKey  소유자 쿼리/폼 필드명 (예: 'tc_id', 'issue_id')
 * @param ownerId   소유자(TC 또는 이슈) id
 */
export default function ScreenshotPanel({ endpoint, ownerKey, ownerId, className = 'mt-4' }: {
  endpoint: string;
  ownerKey: 'tc_id' | 'issue_id';
  ownerId: number;
  className?: string;
}) {
  const [shots, setShots] = useState<Screenshot[]>([]);
  const [dragging, setDragging] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => { fetchShots(); }, [ownerId]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setLightboxIdx(i => i !== null ? Math.min(i + 1, shots.length - 1) : null);
      else if (e.key === 'ArrowLeft') setLightboxIdx(i => i !== null ? Math.max(i - 1, 0) : null);
      else if (e.key === 'Escape') setLightboxIdx(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx, shots.length]);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'));
      if (item) { e.preventDefault(); upload(item.getAsFile()!); }
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [ownerId]);

  async function fetchShots() {
    const res = await fetch(`${endpoint}?${ownerKey}=${ownerId}`);
    setShots(await res.json());
  }
  async function upload(file: File) {
    const form = new FormData();
    form.append(ownerKey, String(ownerId));
    form.append('file', file);
    await fetch(endpoint, { method: 'POST', body: form });
    fetchShots();
  }
  async function deleteShot(id: number) {
    await apiDelete(`${endpoint}/${id}`);
    setShots(prev => prev.filter(s => s.id !== id));
  }
  async function updateCaption(id: number, caption: string) {
    await apiPatch(`${endpoint}/${id}`, { caption });
    setShots(prev => prev.map(s => s.id === id ? { ...s, caption } : s));
  }

  return (
    <>
      <div className={className}>
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
                  onClick={() => setLightboxIdx(shots.indexOf(s))}
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
      {lightboxIdx !== null && shots[lightboxIdx] && (() => {
        const s = shots[lightboxIdx];
        return (
          <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center gap-3" onClick={() => setLightboxIdx(null)}>
            <img src={`/api/img/${s.filename}`} alt={s.caption || 'fullsize'} className="max-w-[90vw] max-h-[80vh] rounded shadow-xl object-contain" />
            {s.caption && <p className="text-white text-sm bg-black/40 px-4 py-1.5 rounded-full">{s.caption}</p>}
            <p className="text-white/50 text-xs">{lightboxIdx + 1} / {shots.length}</p>
            {lightboxIdx > 0 && (
              <button onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2">
                <ChevronLeft size={28} />
              </button>
            )}
            {lightboxIdx < shots.length - 1 && (
              <button onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2">
                <ChevronRight size={28} />
              </button>
            )}
            <button onClick={() => setLightboxIdx(null)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2"><X size={20} /></button>
          </div>
        );
      })()}
    </>
  );
}

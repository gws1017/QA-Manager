'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { useEffect, useRef } from 'react';

const BTN = 'px-2 py-0.5 rounded text-xs hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed';
const BTN_ACTIVE = 'bg-gray-200 font-bold';

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  // 한글 IME 조합 중 이중입력 방지
  const composing = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '',
    onUpdate({ editor }) {
      if (composing.current) return;
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'min-h-[80px] px-2 py-1.5 focus:outline-none text-xs leading-relaxed',
      },
      handleDOMEvents: {
        compositionstart: () => { composing.current = true; return false; },
        compositionend: (_view, event) => {
          composing.current = false;
          // 조합 완료 후 한 번만 onChange 발행
          const editor = _view.state;
          void editor; // suppress unused warning
          // 실제 발행은 onUpdate가 처리하므로 여기선 플래그만 해제
          return false;
        },
      },
    },
  });

  // 외부에서 value가 바뀌면 (이슈 전환) 에디터 내용 동기화
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  function insertTable() {
    editor!.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  const inTable = editor.isActive('table');

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white focus-within:ring-1 focus-within:ring-blue-400">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-gray-100 bg-gray-50">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${BTN} ${editor.isActive('bold') ? BTN_ACTIVE : ''}`} title="굵게">B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${BTN} italic ${editor.isActive('italic') ? BTN_ACTIVE : ''}`} title="기울임">I</button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`${BTN} line-through ${editor.isActive('strike') ? BTN_ACTIVE : ''}`} title="취소선">S</button>
        <button type="button" onClick={() => editor.chain().focus().toggleCode().run()}
          className={`${BTN} font-mono ${editor.isActive('code') ? BTN_ACTIVE : ''}`} title="인라인 코드">{`<>`}</button>

        <span className="w-px h-4 bg-gray-200 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${BTN} ${editor.isActive('bulletList') ? BTN_ACTIVE : ''}`} title="글머리 기호">• 목록</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${BTN} ${editor.isActive('orderedList') ? BTN_ACTIVE : ''}`} title="번호 목록">1. 목록</button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`${BTN} font-mono ${editor.isActive('codeBlock') ? BTN_ACTIVE : ''}`} title="코드 블록">코드</button>

        <span className="w-px h-4 bg-gray-200 mx-1" />

        {/* 표 관련 */}
        <button type="button" onClick={insertTable}
          className={`${BTN} ${inTable ? BTN_ACTIVE : ''}`} title="표 삽입">
          표 삽입
        </button>
        {inTable && (
          <>
            <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()}
              className={BTN} title="열 추가">열+</button>
            <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()}
              className={BTN} title="행 추가">행+</button>
            <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()}
              className={BTN} title="열 삭제">열-</button>
            <button type="button" onClick={() => editor.chain().focus().deleteRow().run()}
              className={BTN} title="행 삭제">행-</button>
            <button type="button" onClick={() => editor.chain().focus().deleteTable().run()}
              className={`${BTN} text-red-500`} title="표 삭제">표 삭제</button>
          </>
        )}
      </div>

      {/* 에디터 본문 */}
      <div className="relative">
        {editor.isEmpty && placeholder && (
          <p className="absolute top-1.5 left-2 text-xs text-gray-300 pointer-events-none select-none">{placeholder}</p>
        )}
        <EditorContent editor={editor} />
      </div>

      <style>{`
        .ProseMirror { outline: none; }
        .ProseMirror p { margin: 2px 0; }
        .ProseMirror ul { list-style-type: disc; padding-left: 20px; margin: 4px 0; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 20px; margin: 4px 0; }
        .ProseMirror li { margin: 1px 0; }
        .ProseMirror li p { margin: 0; }
        .ProseMirror table { border-collapse: collapse; width: 100%; margin: 4px 0; }
        .ProseMirror th, .ProseMirror td { border: 1px solid #d1d5db; padding: 4px 8px; min-width: 60px; vertical-align: top; }
        .ProseMirror th { background: #f3f4f6; font-weight: 600; }
        .ProseMirror code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 11px; font-family: monospace; }
        .ProseMirror pre { background: #1e293b; color: #e2e8f0; padding: 8px; border-radius: 6px; overflow-x: auto; margin: 4px 0; }
        .ProseMirror pre code { background: none; color: inherit; padding: 0; }
        .ProseMirror .selectedCell { background: #dbeafe; }
        .ProseMirror strong { font-weight: 700; }
        .ProseMirror em { font-style: italic; }
        .ProseMirror s { text-decoration: line-through; }
      `}</style>
    </div>
  );
}

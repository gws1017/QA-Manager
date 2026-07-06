'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { useEffect } from 'react';

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
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-xs max-w-none min-h-[80px] px-2 py-1.5 focus:outline-none text-xs leading-relaxed',
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
  }, [value]);

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
        .ProseMirror table { border-collapse: collapse; width: 100%; margin: 4px 0; }
        .ProseMirror th, .ProseMirror td { border: 1px solid #d1d5db; padding: 4px 8px; min-width: 60px; }
        .ProseMirror th { background: #f3f4f6; font-weight: 600; }
        .ProseMirror p { margin: 2px 0; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 20px; margin: 2px 0; }
        .ProseMirror code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
        .ProseMirror pre { background: #1e293b; color: #e2e8f0; padding: 8px; border-radius: 6px; overflow-x: auto; margin: 4px 0; }
        .ProseMirror pre code { background: none; color: inherit; }
        .ProseMirror .selectedCell { background: #dbeafe; }
      `}</style>
    </div>
  );
}

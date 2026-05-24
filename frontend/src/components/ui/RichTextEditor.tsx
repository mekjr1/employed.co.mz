"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { classNames } from "@/lib/utils";

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function ToolbarButton({ active, onClick, label }: { active?: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className={classNames(
        "rounded-lg border px-3 py-2 text-xs font-medium transition",
        active
          ? "border-indigo-500 bg-indigo-500/15 text-indigo-200"
          : "border-zinc-800 bg-[#0f172a] text-zinc-300 hover:border-zinc-700"
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function RichTextEditor({ label, value, onChange, error }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: {
        class: "min-h-[240px] rounded-b-2xl px-4 py-4 focus:outline-none text-zinc-100 job-copy"
      }
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    }
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "<p></p>", false);
    }
  }, [editor, value]);

  return (
    <div className="flex flex-col gap-2 text-sm text-zinc-300">
      <span className="font-medium text-zinc-100">{label}</span>
      <div className={classNames("overflow-hidden rounded-2xl border border-zinc-800 bg-[#111827]", error && "border-rose-500")}>
        <div className="flex flex-wrap gap-2 border-b border-zinc-800 px-3 py-3">
          <ToolbarButton label="Bold" active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} />
          <ToolbarButton label="Italic" active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} />
          <ToolbarButton label="Bullets" active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()} />
          <ToolbarButton label="Numbers" active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
          <ToolbarButton label="Quote" active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
          <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}>
            Clear
          </Button>
        </div>
        <EditorContent editor={editor} />
      </div>
      <span className="text-xs text-zinc-500">Use the editor for paragraphs, lists, highlights, and links.</span>
      {error ? <span className="text-xs text-rose-400">{error}</span> : null}
    </div>
  );
}

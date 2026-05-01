import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import styles from "./RichTextEditor.module.css";

interface Props {
  content: string;
  onChange: (html: string) => void;
}

export function RichTextEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Sync external content changes into the editor (e.g. async data load)
  const lastExternalContent = useRef(content);
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (content !== lastExternalContent.current && content !== editor.getHTML()) {
      lastExternalContent.current = content;
      editor.commands.setContent(content, false); // false = don't emit onUpdate
    }
  }, [editor, content]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.btn}${editor?.isActive("bold") ? ` ${styles.active}` : ""}`}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >B</button>
        <button
          type="button"
          className={`${styles.btn}${editor?.isActive("italic") ? ` ${styles.active}` : ""}`}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        ><em>I</em></button>
        <button
          type="button"
          className={`${styles.btn}${editor?.isActive("bulletList") ? ` ${styles.active}` : ""}`}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >• List</button>
        <button
          type="button"
          className={`${styles.btn}${editor?.isActive("orderedList") ? ` ${styles.active}` : ""}`}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >1. List</button>
        <button
          type="button"
          className={`${styles.btn}${editor?.isActive("heading", { level: 2 }) ? ` ${styles.active}` : ""}`}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >H2</button>
        <button
          type="button"
          className={`${styles.btn}${editor?.isActive("blockquote") ? ` ${styles.active}` : ""}`}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >❝</button>
        <div className={styles.divider} />
        <button
          type="button"
          className={styles.btn}
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
        >↩</button>
        <button
          type="button"
          className={styles.btn}
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
        >↪</button>
      </div>
      <EditorContent editor={editor} className={styles.editor} />
    </div>
  );
}

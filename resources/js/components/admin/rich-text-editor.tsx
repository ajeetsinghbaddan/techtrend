import Image from '@tiptap/extension-image';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold, Code, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Loader2,
    Minus, Quote, Redo2, RemoveFormatting, Strikethrough, Underline, Undo2,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

type Props = {
    value: string;
    onChange: (html: string) => void;
    uploadUrl: string;
};

/** Laravel puts the CSRF token in a cookie; send it back as a header on fetch requests. */
function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function ToolButton({ label, active, disabled, onClick, children }: {
    label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode;
}) {
    return (
        <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={`flex size-8 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-30 ${
                active ? 'bg-slate-200 text-slate-900' : ''
            }`}>
            {children}
        </button>
    );
}

export default function RichTextEditor({ value, onChange, uploadUrl }: Props) {
    const fileInput = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                link: { openOnClick: false, autolink: true, HTMLAttributes: { target: null, rel: null } },
            }),
            Image,
        ],
        content: value,
        editorProps: {
            attributes: {
                class: 'prose prose-slate max-w-none min-h-[320px] px-4 py-3 focus:outline-none',
            },
        },
        onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
    });

    // Re-render the toolbar only when these values change, not on every keystroke.
    const state = useEditorState({
        editor,
        selector: ({ editor }: { editor: Editor | null }) => ({
            bold: editor?.isActive('bold') ?? false,
            italic: editor?.isActive('italic') ?? false,
            underline: editor?.isActive('underline') ?? false,
            strike: editor?.isActive('strike') ?? false,
            code: editor?.isActive('code') ?? false,
            h2: editor?.isActive('heading', { level: 2 }) ?? false,
            h3: editor?.isActive('heading', { level: 3 }) ?? false,
            bullet: editor?.isActive('bulletList') ?? false,
            ordered: editor?.isActive('orderedList') ?? false,
            quote: editor?.isActive('blockquote') ?? false,
            link: editor?.isActive('link') ?? false,
            canUndo: editor?.can().undo() ?? false,
            canRedo: editor?.can().redo() ?? false,
        }),
    });

    if (!editor) return null;

    const setLink = () => {
        const previous = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('Link address (https://…, /page, or mailto:…). Leave empty to remove.', previous ?? '');

        if (url === null) return;

        if (url.trim() === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        if (!/^(https:\/\/|http:\/\/|\/(?!\/)|mailto:)/i.test(url.trim())) {
            window.alert('Use a full https:// address, a path starting with /, or mailto:.');
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    };

    const uploadImage = async (file: File) => {
        setUploading(true);
        setUploadError(null);

        const body = new FormData();
        body.append('image', file);

        try {
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body,
                headers: { Accept: 'application/json', 'X-XSRF-TOKEN': xsrfToken() },
            });

            if (!response.ok) {
                const data = await response.json().catch(() => null);
                setUploadError(data?.errors?.image?.[0] ?? 'Upload failed.');
                return;
            }

            const { url } = await response.json();
            const alt = window.prompt('Describe the image for screen readers and search engines (alt text):', '') ?? '';
            editor.chain().focus().setImage({ src: url, alt }).run();
        } finally {
            setUploading(false);
            if (fileInput.current) fileInput.current.value = '';
        }
    };

    return (
        <div className="rounded-lg border focus-within:ring-2 focus-within:ring-violet-200">
            <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b bg-slate-50 p-1">
                <ToolButton label="Heading" active={state.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                    <Heading2 className="size-4" />
                </ToolButton>
                <ToolButton label="Subheading" active={state.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                    <Heading3 className="size-4" />
                </ToolButton>
                <span className="mx-1 h-5 w-px bg-slate-300" aria-hidden />
                <ToolButton label="Bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
                    <Bold className="size-4" />
                </ToolButton>
                <ToolButton label="Italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <Italic className="size-4" />
                </ToolButton>
                <ToolButton label="Underline" active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                    <Underline className="size-4" />
                </ToolButton>
                <ToolButton label="Strikethrough" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
                    <Strikethrough className="size-4" />
                </ToolButton>
                <ToolButton label="Inline code" active={state.code} onClick={() => editor.chain().focus().toggleCode().run()}>
                    <Code className="size-4" />
                </ToolButton>
                <span className="mx-1 h-5 w-px bg-slate-300" aria-hidden />
                <ToolButton label="Bulleted list" active={state.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                    <List className="size-4" />
                </ToolButton>
                <ToolButton label="Numbered list" active={state.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                    <ListOrdered className="size-4" />
                </ToolButton>
                <ToolButton label="Quote" active={state.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                    <Quote className="size-4" />
                </ToolButton>
                <ToolButton label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                    <Minus className="size-4" />
                </ToolButton>
                <span className="mx-1 h-5 w-px bg-slate-300" aria-hidden />
                <ToolButton label="Link" active={state.link} onClick={setLink}>
                    <Link2 className="size-4" />
                </ToolButton>
                <ToolButton label="Insert image" disabled={uploading} onClick={() => fileInput.current?.click()}>
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                </ToolButton>
                <ToolButton label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
                    <RemoveFormatting className="size-4" />
                </ToolButton>
                <span className="ml-auto flex">
                    <ToolButton label="Undo" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
                        <Undo2 className="size-4" />
                    </ToolButton>
                    <ToolButton label="Redo" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
                        <Redo2 className="size-4" />
                    </ToolButton>
                </span>
            </div>

            <EditorContent editor={editor} />

            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f); }} />

            {uploadError && <p className="border-t px-4 py-2 text-sm text-red-600">{uploadError}</p>}
        </div>
    );
}

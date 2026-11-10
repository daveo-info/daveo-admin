import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { caricaImmagine } from './immagini'

function Barra({ editor, cartella }: { editor: Editor; cartella: string }) {
  const file = useRef<HTMLInputElement>(null)
  const [carico, setCarico] = useState(false)
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      b: e.isActive('bold'),
      i: e.isActive('italic'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      ul: e.isActive('bulletList'),
      ol: e.isActive('orderedList'),
      q: e.isActive('blockquote'),
      a: e.isActive('link'),
    }),
  })

  const link = () => {
    const attuale = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Indirizzo del link (es. https://...). Lascia vuoto per toglierlo.', attuale ?? 'https://')
    if (url === null) return
    if (url.trim() === '' || url.trim() === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    if (!/^(https?:\/\/|mailto:|\/)/i.test(url.trim())) {
      window.alert('Il link deve iniziare con https://, http://, mailto: oppure /')
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const immagine = async (f: File | undefined) => {
    if (!f) return
    setCarico(true)
    try {
      const url = await caricaImmagine(f, cartella)
      const alt = window.prompt('Descrivi brevemente l’immagine (serve a chi non vede):', '') ?? ''
      editor.chain().focus().setImage({ src: url, alt }).run()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Caricamento non riuscito.')
    } finally {
      setCarico(false)
    }
  }

  const B = ({ on, label, titolo, fa }: { on?: boolean; label: string; titolo: string; fa: () => void }) => (
    <button type="button" aria-pressed={on ?? undefined} title={titolo} aria-label={titolo} onClick={fa}>
      {label}
    </button>
  )

  return (
    <div className="adm-editor__barra" role="toolbar" aria-label="Formattazione">
      <B on={s.b} label="B" titolo="Grassetto" fa={() => editor.chain().focus().toggleBold().run()} />
      <B on={s.i} label="I" titolo="Corsivo" fa={() => editor.chain().focus().toggleItalic().run()} />
      <B on={s.h2} label="Titolo" titolo="Titolo di sezione" fa={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <B on={s.h3} label="Sottotitolo" titolo="Sottotitolo di sezione" fa={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <B on={s.ul} label="• Elenco" titolo="Elenco puntato" fa={() => editor.chain().focus().toggleBulletList().run()} />
      <B on={s.ol} label="1. Elenco" titolo="Elenco numerato" fa={() => editor.chain().focus().toggleOrderedList().run()} />
      <B on={s.q} label="Citazione" titolo="Citazione" fa={() => editor.chain().focus().toggleBlockquote().run()} />
      <B on={s.a} label="Link" titolo="Link" fa={link} />
      <B label={carico ? 'Carico…' : 'Immagine'} titolo="Inserisci immagine" fa={() => file.current?.click()} />
      <B label="Annulla" titolo="Annulla" fa={() => editor.chain().focus().undo().run()} />
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { immagine(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )
}

export function EditorTesto({
  valore,
  onChange,
  etichetta,
  cartella = 'articoli',
}: {
  valore: string
  onChange: (html: string) => void
  etichetta: string
  cartella?: string
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] },
        code: false,
        codeBlock: false,
      }),
      Image,
    ],
    content: valore,
    editorProps: { attributes: { 'aria-label': etichetta, role: 'textbox', 'aria-multiline': 'true' } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
  })

  // Se il contenuto cambia da fuori (es. si apre un altro articolo), aggiorna l'editor.
  useEffect(() => {
    if (editor && valore !== editor.getHTML() && !(valore === '' && editor.isEmpty)) {
      editor.commands.setContent(valore, { emitUpdate: false })
    }
  }, [valore, editor])

  if (!editor) return null
  return (
    <div className="adm-editor">
      <Barra editor={editor} cartella={cartella} />
      <EditorContent editor={editor} />
    </div>
  )
}

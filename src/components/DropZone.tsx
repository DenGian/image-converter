import { ClipboardPaste, ImagePlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { ACCEPTED_FILES } from '../formats'

interface DropZoneProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

export function DropZone({ onFiles, disabled = false }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [pasteError, setPasteError] = useState<string | null>(null)
  const pasteImage = async () => {
    setPasteError(null)
    try {
      const items = await navigator.clipboard.read()
      const files: File[] = []
      for (const item of items) {
        const type = item.types.find((entry) => entry.startsWith('image/'))
        if (type) {
          files.push(new File([await item.getType(type)], 'pasted-image', { type }))
        }
      }
      if (files.length) onFiles(files)
      else setPasteError('No supported image was found on the clipboard.')
    } catch (error) {
      setPasteError(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Clipboard access was denied. Use the file picker or keyboard paste.'
          : 'Could not read an image from the clipboard. Use the file picker or keyboard paste.',
      )
    }
  }
  return (
    <section
      className={`drop-zone${dragging ? ' is-dragging' : ''}`}
      aria-label="Add images"
      onDragEnter={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        onFiles(Array.from(event.dataTransfer.files))
      }}
    >
      <div className="drop-icon" aria-hidden="true">
        <ImagePlus size={27} strokeWidth={1.8} />
      </div>
      <div className="drop-copy">
        <h2>Add images</h2>
        <p>Drop files here, choose images, or paste. Supported input formats are listed below.</p>
      </div>
      <div className="drop-actions">
        <button
          className="button primary"
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Choose images
        </button>
        <button
          className="button ghost"
          type="button"
          disabled={disabled || !navigator.clipboard?.read}
          aria-label="Paste image from clipboard"
          onClick={() => void pasteImage()}
        >
          <ClipboardPaste size={17} /> Paste
        </button>
      </div>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        tabIndex={-1}
        aria-hidden="true"
        multiple
        accept={ACCEPTED_FILES}
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []))
          event.target.value = ''
        }}
      />
      {pasteError && (
        <p className="file-error" role="alert">
          {pasteError}
        </p>
      )}
    </section>
  )
}

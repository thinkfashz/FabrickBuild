'use client'

import { useField } from '@payloadcms/ui'
import { useMemo, useRef, useState } from 'react'

type UploadTarget = 'desktopFrames' | 'mobileFrames'

type Props = {
  path?: string
}

const naturalNumber = (name: string, fallback: number) => {
  const matches = name.match(/(\d+)(?!.*\d)/)
  return matches ? Number(matches[1]) : fallback
}

const naturalSort = (files: File[]) =>
  [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
  )

export default function FrameFolderUploader({ path = 'frameUploader' }: Props) {
  const folderInput = useRef<HTMLInputElement | null>(null)
  const imageInput = useRef<HTMLInputElement | null>(null)
  const [target, setTarget] = useState<UploadTarget>('desktopFrames')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const desktop = useField<unknown[]>({ path: 'desktopFrames' })
  const mobile = useField<unknown[]>({ path: 'mobileFrames' })

  const activeField = target === 'desktopFrames' ? desktop : mobile
  const targetLabel = target === 'desktopFrames' ? 'Web / escritorio' : 'Móvil vertical'
  const existingIDs = useMemo(() => {
    const value = Array.isArray(activeField.value) ? activeField.value : []
    return value.map((item: any) => (typeof item === 'object' && item ? item.id : item)).filter(Boolean)
  }, [activeField.value])

  async function upload(filesList: FileList | null) {
    if (!filesList?.length || busy) return

    const files = naturalSort(Array.from(filesList).filter((file) => file.type.startsWith('image/')))
    if (!files.length) {
      setMessage('La selección no contiene imágenes compatibles.')
      return
    }

    setBusy(true)
    setProgress(0)
    setMessage(`Preparando ${files.length} frames para ${targetLabel}…`)

    try {
      const uploadedIDs: Array<string | number> = []
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const frameOrder = naturalNumber(file.name, index + 1)
        const payload = {
          alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
          category: 'frame',
          targetDevice: target === 'desktopFrames' ? 'desktop' : 'mobile',
          frameOrder,
          frameGroup: file.webkitRelativePath?.split('/')[0] || file.name.replace(/\.[^.]+$/, ''),
        }
        const form = new FormData()
        form.append('file', file)
        form.append('_payload', JSON.stringify(payload))

        const response = await fetch('/api/media', {
          method: 'POST',
          body: form,
          credentials: 'include',
        })
        const result = await response.json().catch(() => null)
        if (!response.ok || !result?.doc?.id) {
          throw new Error(result?.errors?.[0]?.message || `No se pudo subir ${file.name}`)
        }

        uploadedIDs.push(result.doc.id)
        setProgress(Math.round(((index + 1) / files.length) * 100))
      }

      activeField.setValue([...existingIDs, ...uploadedIDs])
      setMessage(
        `${uploadedIDs.length} frames cargados. El CMS los ordenará automáticamente por número y nombre al guardar.`,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ocurrió un error durante la carga.')
    } finally {
      setBusy(false)
      if (folderInput.current) folderInput.current.value = ''
      if (imageInput.current) imageInput.current.value = ''
    }
  }

  return (
    <section className="frame-folder-uploader" data-path={path}>
      <div className="frame-folder-uploader__head">
        <div>
          <strong>Carga automatizada de frames</strong>
          <p>Sube una carpeta completa o selecciona imágenes. El orden se detecta desde nombres como frame_001, 002, 003…</p>
        </div>
        <select value={target} onChange={(event) => setTarget(event.target.value as UploadTarget)} disabled={busy}>
          <option value="desktopFrames">Web / escritorio</option>
          <option value="mobileFrames">Móvil vertical</option>
        </select>
      </div>

      <div className="frame-folder-uploader__actions">
        <button type="button" disabled={busy} onClick={() => folderInput.current?.click()}>
          Subir carpeta de frames
        </button>
        <button type="button" disabled={busy} onClick={() => imageInput.current?.click()}>
          Seleccionar imágenes
        </button>
      </div>

      <input
        ref={(element) => {
          folderInput.current = element
          element?.setAttribute('webkitdirectory', '')
          element?.setAttribute('directory', '')
        }}
        hidden
        type="file"
        multiple
        accept="image/*"
        onChange={(event) => void upload(event.target.files)}
      />
      <input
        ref={imageInput}
        hidden
        type="file"
        multiple
        accept="image/*"
        onChange={(event) => void upload(event.target.files)}
      />

      {(busy || message) && (
        <div className="frame-folder-uploader__status" role="status">
          {busy && <progress max={100} value={progress} />}
          <span>{message}</span>
        </div>
      )}

      <style jsx>{`
        .frame-folder-uploader { border: 1px solid var(--theme-elevation-150); border-radius: 12px; padding: 18px; margin: 8px 0 22px; background: var(--theme-elevation-50); }
        .frame-folder-uploader__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        strong { display: block; font-size: 16px; margin-bottom: 5px; }
        p { margin: 0; max-width: 700px; color: var(--theme-elevation-600); line-height: 1.5; }
        select { min-width: 190px; padding: 10px 12px; border: 1px solid var(--theme-elevation-250); border-radius: 8px; background: var(--theme-input-bg); color: var(--theme-text); }
        .frame-folder-uploader__actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
        button { border: 0; border-radius: 8px; padding: 11px 15px; cursor: pointer; background: var(--theme-success-500); color: #fff; font-weight: 700; }
        button + button { background: var(--theme-elevation-800); }
        button:disabled { opacity: .55; cursor: wait; }
        .frame-folder-uploader__status { display: grid; gap: 8px; margin-top: 14px; color: var(--theme-elevation-700); }
        progress { width: 100%; height: 8px; }
        @media (max-width: 720px) { .frame-folder-uploader__head { flex-direction: column; } select, button { width: 100%; } .frame-folder-uploader__actions { display: grid; } }
      `}</style>
    </section>
  )
}

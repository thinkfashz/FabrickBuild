'use client'

import { useField } from '@payloadcms/ui'
import { useMemo, useRef, useState } from 'react'

type UploadTarget = 'desktopFrames' | 'mobileFrames'

type Props = {
  path?: string
}

type PreviewFile = {
  file: File
  url: string
  order: number
}

const naturalSort = (files: File[]) =>
  [...files].sort((a, b) => {
    const pathA = a.webkitRelativePath || a.name
    const pathB = b.webkitRelativePath || b.name
    return pathA.localeCompare(pathB, undefined, { numeric: true, sensitivity: 'base' })
  })

const cleanName = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()

const groupName = (files: File[]) => {
  const first = files[0]
  const folder = first?.webkitRelativePath?.split('/').filter(Boolean)[0]
  if (folder) return folder
  return cleanName(first?.name || 'secuencia').replace(/\s*\d+\s*$/, '').trim() || 'secuencia'
}

export default function FrameFolderUploader({ path = 'frameUploader' }: Props) {
  const folderInput = useRef<HTMLInputElement | null>(null)
  const imageInput = useRef<HTMLInputElement | null>(null)
  const [target, setTarget] = useState<UploadTarget>('desktopFrames')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<PreviewFile[]>([])
  const desktop = useField<unknown[]>({ path: 'desktopFrames' })
  const mobile = useField<unknown[]>({ path: 'mobileFrames' })

  const activeField = target === 'desktopFrames' ? desktop : mobile
  const targetLabel = target === 'desktopFrames' ? 'Web / escritorio' : 'Móvil vertical'
  const existingIDs = useMemo(() => {
    const value = Array.isArray(activeField.value) ? activeField.value : []
    return value.map((item: any) => (typeof item === 'object' && item ? item.id : item)).filter(Boolean)
  }, [activeField.value])

  function clearPreview() {
    preview.forEach((item) => URL.revokeObjectURL(item.url))
    setPreview([])
  }

  function prepare(filesList: FileList | null) {
    if (!filesList?.length || busy) return
    const files = naturalSort(Array.from(filesList).filter((file) => file.type.startsWith('image/')))
    if (!files.length) {
      setMessage('La selección no contiene imágenes compatibles.')
      return
    }

    clearPreview()
    setPreview(files.map((file, index) => ({ file, url: URL.createObjectURL(file), order: index + 1 })))
    setMessage(`${files.length} imágenes detectadas para ${targetLabel}. Revisa el orden y pulsa “Subir y organizar”.`)
  }

  async function upload() {
    if (!preview.length || busy) return
    const files = preview.map((item) => item.file)
    const collectionKey = groupName(files)

    setBusy(true)
    setProgress(0)
    setMessage(`Subiendo ${files.length} frames para ${targetLabel}…`)

    try {
      const uploadedIDs: Array<string | number> = []
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const payload = {
          alt: cleanName(file.name),
          category: 'frame',
          device: target === 'desktopFrames' ? 'desktop' : 'mobile',
          frameOrder: index + 1,
          collectionKey,
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
      setMessage(`${uploadedIDs.length} frames cargados y numerados del 1 al ${uploadedIDs.length}. Guarda el background para fijar el orden final.`)
      clearPreview()
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
          <p>Selecciona primero Web o Móvil. Puedes subir una carpeta completa o imágenes sueltas; el sistema aplica orden natural y luego numera la secuencia sin saltos.</p>
        </div>
        <select value={target} onChange={(event) => setTarget(event.target.value as UploadTarget)} disabled={busy}>
          <option value="desktopFrames">Web / escritorio</option>
          <option value="mobileFrames">Móvil vertical</option>
        </select>
      </div>

      <div className="frame-folder-uploader__actions">
        <button type="button" disabled={busy} onClick={() => folderInput.current?.click()}>Subir carpeta</button>
        <button type="button" disabled={busy} onClick={() => imageInput.current?.click()}>Seleccionar imágenes</button>
        {preview.length > 0 && <button type="button" className="primary" disabled={busy} onClick={() => void upload()}>Subir y organizar</button>}
        {preview.length > 0 && <button type="button" className="ghost" disabled={busy} onClick={clearPreview}>Cancelar</button>}
      </div>

      <input ref={(element) => { folderInput.current = element; element?.setAttribute('webkitdirectory', ''); element?.setAttribute('directory', '') }} hidden type="file" multiple accept="image/*" onChange={(event) => prepare(event.target.files)} />
      <input ref={imageInput} hidden type="file" multiple accept="image/*" onChange={(event) => prepare(event.target.files)} />

      {preview.length > 0 && (
        <div className="frame-folder-uploader__preview" aria-label="Vista previa del orden de frames">
          {preview.slice(0, 60).map((item) => (
            <figure key={`${item.file.name}-${item.order}`}>
              <img src={item.url} alt="" />
              <figcaption><b>{String(item.order).padStart(3, '0')}</b><span>{item.file.name}</span></figcaption>
            </figure>
          ))}
          {preview.length > 60 && <div className="more">+{preview.length - 60} frames</div>}
        </div>
      )}

      {(busy || message) && <div className="frame-folder-uploader__status" role="status">{busy && <progress max={100} value={progress} />}<span>{message}</span></div>}

      <style jsx>{`
        .frame-folder-uploader{border:1px solid var(--theme-elevation-150);border-radius:14px;padding:18px;margin:8px 0 22px;background:var(--theme-elevation-50)}
        .frame-folder-uploader__head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px} strong{display:block;font-size:16px;margin-bottom:5px} p{margin:0;max-width:760px;color:var(--theme-elevation-600);line-height:1.5}
        select{min-width:190px;padding:10px 12px;border:1px solid var(--theme-elevation-250);border-radius:8px;background:var(--theme-input-bg);color:var(--theme-text)}
        .frame-folder-uploader__actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px} button{border:0;border-radius:8px;padding:11px 15px;cursor:pointer;background:var(--theme-elevation-800);color:#fff;font-weight:700} button.primary{background:#c99b19;color:#111} button.ghost{background:transparent;color:var(--theme-text);border:1px solid var(--theme-elevation-250)} button:disabled{opacity:.55;cursor:wait}
        .frame-folder-uploader__preview{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px;margin-top:18px;max-height:430px;overflow:auto;padding:10px;border-radius:10px;background:var(--theme-elevation-100)} figure{margin:0;min-width:0;border-radius:8px;overflow:hidden;background:var(--theme-elevation-50)} img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover} figcaption{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px;padding:7px;font-size:10px} figcaption span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.more{display:grid;place-items:center;min-height:100px;font-weight:800}
        .frame-folder-uploader__status{display:grid;gap:8px;margin-top:14px;color:var(--theme-elevation-700)} progress{width:100%;height:8px}
        @media(max-width:720px){.frame-folder-uploader__head{flex-direction:column}select,button{width:100%}.frame-folder-uploader__actions{display:grid}.frame-folder-uploader__preview{grid-template-columns:repeat(3,minmax(0,1fr));padding:6px;gap:6px}figcaption span{display:none}}
      `}</style>
    </section>
  )
}

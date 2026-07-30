'use client'

import { useField } from '@payloadcms/ui'
import { Image as ImageIcon, Paintbrush, RotateCcw, Type } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import styles from './VisualAppearanceField.module.css'

type Asset = {
  id: string | number
  alt?: string | null
  filename?: string | null
  name?: string | null
  url?: string | null
  externalURL?: string | null
  kind?: string | null
  image?: unknown
  poster?: unknown
  desktopFrames?: unknown[]
  mobileFrames?: unknown[]
}

type Appearance = Record<string, unknown>

type VisualAppearanceFieldProps = {
  field?: { name?: string }
  path: string
  readOnly?: boolean
}

const palettes = [
  { name: 'Grafito', surface: '#111111', heading: '#ffffff', copy: '#d6d4ce', accent: '#f4c84b' },
  { name: 'Arena', surface: '#f4f0e8', heading: '#1a1916', copy: '#5a554c', accent: '#aa5c20' },
  { name: 'Noche azul', surface: '#0d1b2a', heading: '#f5fbff', copy: '#c2d3e3', accent: '#62d0ff' },
  { name: 'Bosque', surface: '#173d32', heading: '#f4fff7', copy: '#c8e4d6', accent: '#a4e454' },
  { name: 'Noir Racing', surface: '#090305', heading: '#fff7f8', copy: '#dfc6cc', accent: '#ff1f35' },
]

const fieldValue = (value: unknown): Appearance =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Appearance) : {}

const assetLabel = (asset: Asset) => asset.name || asset.alt || asset.filename || `Archivo ${asset.id}`

function compactMedia(asset: Asset): Asset {
  return {
    id: asset.id,
    alt: asset.alt || asset.filename || asset.name || '',
    filename: asset.filename,
    url: asset.url,
    externalURL: asset.externalURL,
  }
}

function compactBackground(asset: Asset): Asset {
  return {
    id: asset.id,
    name: asset.name,
    kind: asset.kind,
    externalURL: asset.externalURL,
    image: asset.image,
    poster: asset.poster,
    desktopFrames: asset.desktopFrames,
    mobileFrames: asset.mobileFrames,
  }
}

/**
 * A compact editor that writes the same JSON used by the original visual
 * editor. It intentionally lives inside the native Payload document form so
 * autosave, versions, drafts and block ordering remain Payload features.
 */
export default function VisualAppearanceField({ field, path, readOnly }: VisualAppearanceFieldProps) {
  const { value, setValue } = useField<Appearance>({ path })
  const [media, setMedia] = useState<Asset[]>([])
  const [backgrounds, setBackgrounds] = useState<Asset[]>([])
  const [assetsLoaded, setAssetsLoaded] = useState(false)
  const isPage = field?.name === 'pageAppearance'
  const appearance = useMemo(() => fieldValue(value), [value])

  const update = useCallback(
    (key: string, nextValue: unknown) => {
      if (readOnly) return
      setValue({ ...appearance, [key]: nextValue })
    },
    [appearance, readOnly, setValue],
  )

  useEffect(() => {
    let active = true
    const loadAssets = async () => {
      try {
        const [mediaResponse, backgroundsResponse] = await Promise.all([
          fetch('/api/media?limit=100&depth=1&sort=-updatedAt'),
          fetch('/api/backgrounds?limit=100&depth=2&sort=-updatedAt&where[status][equals]=ready'),
        ])
        const [mediaData, backgroundsData] = await Promise.all([
          mediaResponse.ok ? mediaResponse.json() : { docs: [] },
          backgroundsResponse.ok ? backgroundsResponse.json() : { docs: [] },
        ])
        if (!active) return
        setMedia(Array.isArray(mediaData.docs) ? mediaData.docs : [])
        setBackgrounds(Array.isArray(backgroundsData.docs) ? backgroundsData.docs : [])
      } finally {
        if (active) setAssetsLoaded(true)
      }
    }
    loadAssets()
    return () => { active = false }
  }, [])

  const backgroundMode = String(appearance.backgroundMode || 'none')
  const selectedMediaID = String((appearance.backgroundMedia as Asset | undefined)?.id || '')
  const selectedBackgroundID = String((appearance.savedBackground as Asset | undefined)?.id || '')

  return (
    <section className={styles.inspector} aria-label={isPage ? 'Diseño global de página' : 'Apariencia visual del bloque'}>
      <header className={styles.header}>
        <span className={styles.icon}><Paintbrush size={16} /></span>
        <span><strong>{isPage ? 'Lienzo de página' : 'Estilo del bloque'}</strong><small>{isPage ? 'Fondo y tipografía para toda la página' : 'Cambios seguros sin editar código'}</small></span>
        {!readOnly && <button className={styles.reset} type="button" onClick={() => setValue({})} title="Restablecer estilo"><RotateCcw size={15} /></button>}
      </header>

      <div className={styles.quickPalettes} aria-label="Paletas rápidas">
        {palettes.map((palette) => (
          <button
            key={palette.name}
            type="button"
            disabled={readOnly}
            className={styles.palette}
            onClick={() => setValue({ ...appearance, backgroundMode: 'color', surfaceColor: palette.surface, surfaceOpacity: 100, headingColor: palette.heading, bodyColor: palette.copy, buttonColor: palette.accent, buttonTextColor: '#111111' })}
          >
            <i style={{ background: palette.surface }} /><i style={{ background: palette.heading }} /><i style={{ background: palette.accent }} /><span>{palette.name}</span>
          </button>
        ))}
      </div>

      <details className={styles.details} open>
        <summary><Paintbrush size={15} /> Fondo y transparencia</summary>
        <div className={styles.grid}>
          <label className={styles.field}><span>Tipo de fondo</span><select disabled={readOnly} value={backgroundMode} onChange={(event) => update('backgroundMode', event.target.value)}><option value="none">Sin fondo / transparente</option><option value="color">Color translúcido</option><option value="image">Imagen o multimedia</option></select></label>
          {(backgroundMode === 'color' || backgroundMode === 'image') && <ColorField label="Color de superficie" value={String(appearance.surfaceColor || '#ffffff')} disabled={readOnly} onChange={(next) => update('surfaceColor', next)} />}
          {(backgroundMode === 'color' || backgroundMode === 'image') && <RangeField label="Opacidad del fondo" value={Number(appearance.surfaceOpacity ?? 100)} disabled={readOnly} min={0} max={100} onChange={(next) => update('surfaceOpacity', next)} />}
          {backgroundMode === 'image' && <>
            <label className={styles.field}><span><ImageIcon size={14} /> Imagen de biblioteca</span><select disabled={readOnly || !assetsLoaded} value={selectedMediaID} onChange={(event) => update('backgroundMedia', compactMedia(media.find((asset) => String(asset.id) === event.target.value) || ({ id: '' } as Asset)))}><option value="">Seleccionar archivo…</option>{media.map((asset) => <option value={String(asset.id)} key={asset.id}>{assetLabel(asset)}</option>)}</select></label>
            <label className={styles.field}><span>Background guardado</span><select disabled={readOnly || !assetsLoaded} value={selectedBackgroundID} onChange={(event) => update('savedBackground', compactBackground(backgrounds.find((asset) => String(asset.id) === event.target.value) || ({ id: '' } as Asset)))}><option value="">Seleccionar background…</option>{backgrounds.map((asset) => <option value={String(asset.id)} key={asset.id}>{assetLabel(asset)}{asset.kind ? ` · ${asset.kind}` : ''}</option>)}</select></label>
            <label className={styles.field}><span>URL externa HTTPS</span><input disabled={readOnly} value={String(appearance.backgroundURL || '')} onChange={(event) => update('backgroundURL', event.target.value)} inputMode="url" placeholder="https://…" /></label>
            <label className={styles.field}><span>Encuadre</span><select disabled={readOnly} value={String(appearance.backgroundFit || 'cover')} onChange={(event) => update('backgroundFit', event.target.value)}><option value="cover">Cubrir</option><option value="contain">Contener</option></select></label>
            <RangeField label="Capa sobre imagen" value={Number(appearance.overlayOpacity ?? 0)} disabled={readOnly} min={0} max={90} onChange={(next) => update('overlayOpacity', next)} />
          </>}
        </div>
      </details>

      <details className={styles.details}>
        <summary><Type size={15} /> Texto, botones y forma</summary>
        <div className={styles.grid}>
          <label className={styles.field}><span>Tipografía</span><select disabled={readOnly} value={String(appearance.fontFamily || 'sans')} onChange={(event) => update('fontFamily', event.target.value)}><option value="sans">Satoshi / moderna</option><option value="serif">Editorial / serif</option><option value="display">Display / títulos</option><option value="mono">Técnica / mono</option></select></label>
          <ColorField label="Títulos" value={String(appearance.headingColor || '#15130f')} disabled={readOnly} onChange={(next) => update('headingColor', next)} />
          <ColorField label="Párrafos" value={String(appearance.bodyColor || '#4f493f')} disabled={readOnly} onChange={(next) => update('bodyColor', next)} />
          <ColorField label="Botones" value={String(appearance.buttonColor || '#f2b90c')} disabled={readOnly} onChange={(next) => update('buttonColor', next)} />
          <ColorField label="Texto de botón" value={String(appearance.buttonTextColor || '#15130f')} disabled={readOnly} onChange={(next) => update('buttonTextColor', next)} />
          <ColorField label="Borde de botón" value={String(appearance.buttonBorderColor || '#f2b90c')} disabled={readOnly} onChange={(next) => update('buttonBorderColor', next)} />
          <RangeField label="Grosor del borde" value={Number(appearance.buttonBorderWidth ?? 0)} disabled={readOnly} min={0} max={6} suffix="px" onChange={(next) => update('buttonBorderWidth', next)} />
          <label className={styles.field}><span>Tamaño de botón</span><select disabled={readOnly} value={String(appearance.buttonSize || 'medium')} onChange={(event) => update('buttonSize', event.target.value)}><option value="small">Pequeño</option><option value="medium">Mediano</option><option value="large">Grande</option></select></label>
          <label className={styles.field}><span>Forma de botón</span><select disabled={readOnly} value={String(appearance.buttonShape || 'pill')} onChange={(event) => update('buttonShape', event.target.value)}><option value="pill">Píldora</option><option value="rounded">Redondeado</option><option value="square">Recto</option></select></label>
          <RangeField label="Escala tipográfica" value={Number(appearance.fontScale ?? 100)} disabled={readOnly} min={80} max={150} onChange={(next) => update('fontScale', next)} />
          <RangeField label="Brillo de títulos" value={Number(appearance.textGlow ?? 18)} disabled={readOnly} min={0} max={100} onChange={(next) => update('textGlow', next)} />
          <RangeField label="Redondez" value={Number(appearance.cornerRadius ?? 0)} disabled={readOnly} min={0} max={36} suffix="px" onChange={(next) => update('cornerRadius', next)} />
          {!isPage && <label className={styles.field}><span>Espaciado vertical</span><select disabled={readOnly} value={String(appearance.verticalSpacing || 'normal')} onChange={(event) => update('verticalSpacing', event.target.value)}><option value="compact">Compacto</option><option value="normal">Normal</option><option value="large">Amplio</option></select></label>}
        </div>
      </details>
    </section>
  )
}

function ColorField({ label, value, disabled, onChange }: { label: string; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  return <label className={`${styles.field} ${styles.colorField}`}><span>{label}</span><input aria-label={label} disabled={disabled} type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#15130f'} onChange={(event) => onChange(event.target.value)} /><code>{value}</code></label>
}

function RangeField({ label, value, disabled, min, max, suffix = '%', onChange }: { label: string; value: number; disabled?: boolean; min: number; max: number; suffix?: string; onChange: (value: number) => void }) {
  const safe = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min
  return <label className={`${styles.field} ${styles.rangeField}`}><span>{label}<b>{safe}{suffix}</b></span><input disabled={disabled} type="range" min={min} max={max} value={safe} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

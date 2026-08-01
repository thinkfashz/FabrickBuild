'use client'

import { useField } from '@payloadcms/ui'
import type { CSSProperties, ReactNode } from 'react'

import { defaultAppearance, type AppearanceValue } from '@/fields/appearance'

type Props = {
  path: string
  field?: { label?: string }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="appearance-editor__control">
      <span>{label}</span>
      {children}
    </label>
  )
}

export default function AppearanceEditor({ path, field }: Props) {
  const { value, setValue } = useField<AppearanceValue>({ path })
  const current = { ...defaultAppearance, ...(value || {}) }

  const patch = (next: Partial<AppearanceValue>) => setValue({ ...current, ...next })
  const number = (key: keyof AppearanceValue, min: number, max: number) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(event.target.value)
      patch({ [key]: Number.isFinite(parsed) ? clamp(parsed, min, max) : min } as Partial<AppearanceValue>)
    }

  const previewStyle = {
    '--preview-surface': current.surfaceColor,
    '--preview-opacity': String((current.surfaceOpacity || 0) / 100),
    '--preview-blur': `${current.backdropBlur || 0}px`,
    '--preview-heading': current.headingColor,
    '--preview-body': current.bodyColor,
    '--preview-button': current.buttonColor,
    '--preview-button-text': current.buttonTextColor,
    '--preview-radius': `${current.cornerRadius || 0}px`,
    '--preview-border': current.borderColor,
    '--preview-border-width': `${current.borderWidth || 0}px`,
  } as CSSProperties

  return (
    <div className="appearance-editor">
      <div className="appearance-editor__heading">
        <div>
          <strong>{field?.label || 'Apariencia y responsive'}</strong>
          <p>Los cambios se guardan con el bloque y se aplican tanto en la vista previa como en la página publicada.</p>
        </div>
        <button type="button" onClick={() => setValue(defaultAppearance)}>Restablecer</button>
      </div>

      <div className="appearance-editor__preview" style={previewStyle} data-surface={current.surfaceMode}>
        <div>
          <small>PREVISUALIZACIÓN</small>
          <h3>Contenido comercial protagonista</h3>
          <p>El fondo apoya el mensaje sin competir con el texto ni con la acción principal.</p>
          <button type="button">Acción principal</button>
        </div>
      </div>

      <div className="appearance-editor__grid">
        <fieldset>
          <legend>Superficie</legend>
          <Control label="Tipo de fondo">
            <select value={current.surfaceMode} onChange={(event) => patch({ surfaceMode: event.target.value as AppearanceValue['surfaceMode'] })}>
              <option value="transparent">Transparente</option>
              <option value="glass">Translúcido / glass</option>
              <option value="solid">Sólido</option>
              <option value="image">Imagen por URL</option>
            </select>
          </Control>
          <Control label="Color de superficie">
            <input type="color" value={current.surfaceColor} onChange={(event) => patch({ surfaceColor: event.target.value })} />
          </Control>
          <Control label={`Opacidad ${current.surfaceOpacity}%`}>
            <input type="range" min="0" max="100" value={current.surfaceOpacity} onChange={number('surfaceOpacity', 0, 100)} />
          </Control>
          <Control label={`Difuminado ${current.backdropBlur}px`}>
            <input type="range" min="0" max="48" value={current.backdropBlur} onChange={number('backdropBlur', 0, 48)} />
          </Control>
          <Control label="Imagen de fondo por URL">
            <input type="text" value={current.backgroundURL || ''} onChange={(event) => patch({ backgroundURL: event.target.value })} placeholder="https://… o /media/…" />
          </Control>
          <Control label="Ajuste de imagen">
            <select value={current.backgroundFit} onChange={(event) => patch({ backgroundFit: event.target.value as AppearanceValue['backgroundFit'] })}>
              <option value="cover">Cubrir</option>
              <option value="contain">Contener</option>
            </select>
          </Control>
          <Control label="Color del overlay">
            <input type="color" value={current.overlayColor} onChange={(event) => patch({ overlayColor: event.target.value })} />
          </Control>
          <Control label={`Oscurecimiento ${current.overlayOpacity}%`}>
            <input type="range" min="0" max="90" value={current.overlayOpacity} onChange={number('overlayOpacity', 0, 90)} />
          </Control>
        </fieldset>

        <fieldset>
          <legend>Texto y botones</legend>
          <Control label="Color de títulos"><input type="color" value={current.headingColor} onChange={(event) => patch({ headingColor: event.target.value })} /></Control>
          <Control label="Color de párrafos"><input type="color" value={current.bodyColor} onChange={(event) => patch({ bodyColor: event.target.value })} /></Control>
          <Control label="Color de acento"><input type="color" value={current.accentColor} onChange={(event) => patch({ accentColor: event.target.value })} /></Control>
          <Control label="Color del botón"><input type="color" value={current.buttonColor} onChange={(event) => patch({ buttonColor: event.target.value })} /></Control>
          <Control label="Texto del botón"><input type="color" value={current.buttonTextColor} onChange={(event) => patch({ buttonTextColor: event.target.value })} /></Control>
          <Control label={`Escala tipográfica ${current.fontScale}%`}><input type="range" min="75" max="145" value={current.fontScale} onChange={number('fontScale', 75, 145)} /></Control>
          <Control label="Alineación">
            <select value={current.textAlign} onChange={(event) => patch({ textAlign: event.target.value as AppearanceValue['textAlign'] })}>
              <option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>
            </select>
          </Control>
          <Control label="Ancho del contenido">
            <select value={current.contentWidth} onChange={(event) => patch({ contentWidth: event.target.value as AppearanceValue['contentWidth'] })}>
              <option value="narrow">Estrecho</option><option value="normal">Normal</option><option value="wide">Amplio</option><option value="full">Completo</option>
            </select>
          </Control>
        </fieldset>

        <fieldset>
          <legend>Forma y espaciado</legend>
          <Control label={`Radio ${current.cornerRadius}px`}><input type="range" min="0" max="64" value={current.cornerRadius} onChange={number('cornerRadius', 0, 64)} /></Control>
          <Control label="Color del borde"><input type="color" value={current.borderColor} onChange={(event) => patch({ borderColor: event.target.value })} /></Control>
          <Control label={`Borde ${current.borderWidth}px`}><input type="range" min="0" max="6" value={current.borderWidth} onChange={number('borderWidth', 0, 6)} /></Control>
          <Control label={`Espacio superior ${current.paddingTop}px`}><input type="range" min="0" max="240" value={current.paddingTop} onChange={number('paddingTop', 0, 240)} /></Control>
          <Control label={`Espacio inferior ${current.paddingBottom}px`}><input type="range" min="0" max="240" value={current.paddingBottom} onChange={number('paddingBottom', 0, 240)} /></Control>
        </fieldset>

        <fieldset>
          <legend>Móvil</legend>
          <Control label="Composición móvil">
            <select value={current.mobileLayout} onChange={(event) => patch({ mobileLayout: event.target.value as AppearanceValue['mobileLayout'] })}>
              <option value="stack">Apilada</option><option value="horizontal">Horizontal</option><option value="compact">Compacta</option>
            </select>
          </Control>
          <Control label="Alineación móvil">
            <select value={current.mobileTextAlign} onChange={(event) => patch({ mobileTextAlign: event.target.value as AppearanceValue['mobileTextAlign'] })}>
              <option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>
            </select>
          </Control>
          <Control label={`Margen interno ${current.mobilePadding}px`}><input type="range" min="12" max="48" value={current.mobilePadding} onChange={number('mobilePadding', 12, 48)} /></Control>
          <Control label={`Escala del título ${current.mobileHeadingScale}%`}><input type="range" min="60" max="120" value={current.mobileHeadingScale} onChange={number('mobileHeadingScale', 60, 120)} /></Control>
          <label className="appearance-editor__check"><input type="checkbox" checked={Boolean(current.hideOnMobile)} onChange={(event) => patch({ hideOnMobile: event.target.checked })} /> Ocultar este bloque en móvil</label>
        </fieldset>

        <fieldset>
          <legend>Animación</legend>
          <Control label="Entrada">
            <select value={current.animationPreset} onChange={(event) => patch({ animationPreset: event.target.value as AppearanceValue['animationPreset'] })}>
              <option value="none">Sin animación</option><option value="fade-up">Subir y aparecer</option><option value="fade">Aparecer</option><option value="scale">Escala suave</option><option value="slide-left">Desde la izquierda</option><option value="slide-right">Desde la derecha</option>
            </select>
          </Control>
          <Control label={`Duración ${current.animationDuration} ms`}><input type="range" min="150" max="1800" step="50" value={current.animationDuration} onChange={number('animationDuration', 150, 1800)} /></Control>
          <Control label={`Retraso ${current.animationDelay} ms`}><input type="range" min="0" max="1200" step="50" value={current.animationDelay} onChange={number('animationDelay', 0, 1200)} /></Control>
        </fieldset>
      </div>
    </div>
  )
}

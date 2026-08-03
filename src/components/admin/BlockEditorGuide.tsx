'use client'

type Props = {
  path?: string
}

export default function BlockEditorGuide({ path = '' }: Props) {
  const match = path.match(/layout\.(\d+)/)
  const index = match ? Number(match[1]) : null
  const position = index === null || !Number.isFinite(index) ? 'Sección' : `Sección ${index + 1}`

  return (
    <div className="block-editor-guide">
      <span className="block-editor-guide__position">{position}</span>
      <p>
        Esta sección aparece en ese mismo orden dentro de la página. Usa el encabezado del bloque
        para arrastrarla, duplicarla, contraerla o eliminarla.
      </p>
      <small>Contenido cambia la información. Diseño controla fondo, responsive y animación.</small>
    </div>
  )
}

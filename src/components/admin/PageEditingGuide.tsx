'use client'

import { MonitorSmartphone, MousePointer2, PanelsTopLeft } from 'lucide-react'

import styles from './PageEditingGuide.module.css'

export default function PageEditingGuide() {
  return (
    <aside className={styles.guide}>
      <span className={styles.badge}><MonitorSmartphone size={15} /> EDICIÓN NATIVA</span>
      <div><h3>Un solo editor, una sola fuente de verdad.</h3><p>Abre <b>Live Preview</b> arriba para ver cada cambio sin publicar. En el layout arrastra desde el asa de cada bloque; en móvil mantén presionado el asa y usa los paneles plegables para que el formulario no invada la pantalla.</p></div>
      <div className={styles.actions}><span><PanelsTopLeft size={15} /> Añade bloques en “Contenido”</span><span><MousePointer2 size={15} /> Selecciona, ordena y guarda con autosave</span></div>
    </aside>
  )
}

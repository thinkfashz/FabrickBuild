import type { Metadata } from 'next'

import { InstallConsole } from '@/components/InstallConsole'
import styles from './install.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Instalación segura | FabrickBuild',
  description: 'Asistente de instalación inicial de FabrickBuild CMS.',
  robots: { index: false, follow: false },
}

export default function InstallPage() {
  return (
    <section className={styles.shell}>
      <div className={styles.card}>
        <span className={styles.badge}>INSTALACIÓN ÚNICA</span>
        <h1 className={styles.title}>Creador y verificador blindado.</h1>
        <p className={styles.copy}>
          Este proceso sincroniza una base vacía, crea o valida el superusuario, carga el contenido inicial,
          comprueba PostgreSQL y Blob, y después se bloquea permanentemente.
        </p>
        <InstallConsole />
      </div>
    </section>
  )
}

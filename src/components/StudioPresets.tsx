import { ArrowRight, ChevronDown, Menu, TableProperties } from 'lucide-react'
import Link from 'next/link'

import styles from './StudioPresets.module.css'
import { AnimatedReusablePreset } from './AnimatedReusablePreset'

export function isStudioPreset(slug: string) {
  return ['preset-action-buttons', 'preset-project-table', 'preset-navigation-menu', 'preset-text-drawer', 'preset-animated-solid-cta', 'preset-animated-glass-cards'].includes(slug)
}

export function StudioPreset({ slug }: { slug: string }) {
  if (slug === 'preset-animated-solid-cta' || slug === 'preset-animated-glass-cards') return <AnimatedReusablePreset slug={slug} />
  if (slug === 'preset-action-buttons') {
    return <section className={styles.action}><span className={styles.eyebrow}>PATRÓN EDITABLE</span><h2>Un llamado claro para cada decisión.</h2><p>Modifica el color, fondo, opacidad, escala y espaciado desde el inspector del bloque.</p><div><Link href="#contacto">Hablar con un experto <ArrowRight size={16} /></Link><Link href="/proyectos">Ver proyectos</Link></div></section>
  }
  if (slug === 'preset-project-table') {
    return <section className={styles.table}><header><span><TableProperties size={17} /> TABLA DE PROYECTO</span><h2>Alcance visible, sin esconder detalles.</h2></header><div className={styles.rows}><div><b>Etapa</b><b>Entrega</b><b>Estado</b></div><div><span>01 · Diagnóstico</span><span>Presupuesto y plano</span><em>Listo</em></div><div><span>02 · Ejecución</span><span>Seguimiento semanal</span><em>En curso</em></div><div><span>03 · Cierre</span><span>Entrega y garantía</span><em>Próximo</em></div></div></section>
  }
  if (slug === 'preset-navigation-menu') {
    return <section className={styles.menu}><header><b>FabrickBuild</b><nav><Link href="/servicios">Servicios</Link><Link href="/proyectos">Proyectos</Link><Link href="/nosotros">Nosotros</Link></nav><button type="button" aria-label="Abrir menú"><Menu size={18} /></button></header><div><span>MENÚ RESPONSIVE</span><h2>Navegación que se adapta a cada pantalla.</h2><Link href="#contacto">Cotizar <ArrowRight size={16} /></Link></div></section>
  }
  return <section className={styles.drawer}><div><span>BLOQUE DE TEXTO</span><h2>Explica el proceso sin perder foco.</h2><p>Ideal para preguntas frecuentes, especificaciones, términos o detalles de una propuesta.</p></div><details open><summary>¿Qué incluye el primer diagnóstico? <ChevronDown size={17} /></summary><p>Visita, definición de alcance, riesgos visibles y una hoja de ruta para tomar la siguiente decisión.</p></details><details><summary>¿Cómo se actualiza este bloque? <ChevronDown size={17} /></summary><p>Selecciona este componente en el canvas y cambia su apariencia en tiempo real.</p></details></section>
}

'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import Image from 'next/image'
import { ArrowRight, Box, Code2, Cpu, Figma, Sparkles, Star } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { getMediaURL } from '@/lib/media'
import { RuntimeBlobFrameBackground } from './RuntimeBlobFrameBackground'
import styles from './PortfolioExperience.module.css'

type Doc = Record<string, any>

const fallbackStack = ['Dirección visual', 'Desarrollo', 'Payload CMS', 'Movimiento', 'Vercel']
const fallbackProjects = [
  {
    title: 'Atrapar la mirada',
    type: 'Inicio / primera impresión',
    description: 'El primer impacto no necesita gritar. Ordenamos imagen, ritmo y mensaje para que tu marca se entienda desde los primeros segundos.',
    imageURL: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1400&q=85',
  },
  {
    title: 'Guiar la decisión',
    type: 'Recorrido / conversión',
    description: 'Cada sección responde una pregunta real del cliente y lo acerca a la acción sin perderlo entre efectos, bloques repetidos o información innecesaria.',
    imageURL: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85',
  },
  {
    title: 'Mantener el control',
    type: 'CMS / crecimiento',
    description: 'La experiencia queda preparada para crecer: puedes cambiar textos, proyectos, fondos y llamados a la acción sin reconstruir la página completa.',
    imageURL: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85',
  },
]

const legacyDescriptions: Record<string, string> = {
  'Una identidad fluida convertida en una experiencia de compra con carácter.': fallbackProjects[0].description,
  'Una presencia editorial para mostrar espacios, proceso y confianza con claridad.': fallbackProjects[1].description,
  'Un producto que une operaciones, contenido y decisiones en tiempo real.': fallbackProjects[2].description,
  'Convertimos el recorrido de tu página en una presentación guiada que mantiene la atención y explica tu propuesta sin saturar al visitante.': fallbackProjects[0].description,
  'Organizamos contenido, imágenes y llamados a la acción para que tus servicios se perciban profesionales, claros y confiables desde cualquier dispositivo.': fallbackProjects[1].description,
  'Entregamos una experiencia que puede crecer contigo: fondos, textos, secciones y proyectos se administran sin reconstruir toda la página.': fallbackProjects[2].description,
}

const techIcon = (index: number) => [Code2, Figma, Cpu, Sparkles, Box][index % 5]

export function PortfolioExperience({ block, frameCount = 0 }: { block: Doc; frameCount?: number }) {
  const root = useRef<HTMLElement>(null)
  const stack = Array.isArray(block.techStack) && block.techStack.length
    ? block.techStack
    : fallbackStack.map((label) => ({ label }))
  const projects = Array.isArray(block.projects) && block.projects.length ? block.projects : fallbackProjects
  const sequenceLabel = frameCount > 0 ? String(frameCount) : '61'

  useEffect(() => {
    const element = root.current
    if (!element) return
    element.dataset.editorialHost = 'true'
    return () => {
      delete element.dataset.editorialHost
    }
  }, [])

  return (
    <section ref={root} className={styles.portfolio}>
      {frameCount === 0 && <RuntimeBlobFrameBackground />}

      <section className={`${styles.hero} ${styles.sceneLeft}`} data-cinematic-scene data-side="left">
        <div className={styles.heroCopy}>
          <span data-cinematic-copy className="eyebrow">
            {block.eyebrow || 'PORTAFOLIO FABRICK / EXPERIENCIAS DIGITALES'}
          </span>
          <h1 data-cinematic-copy>
            {block.heading || 'Tu marca, contada en movimiento.'}
            <em>{block.highlight || 'Diseño que guía la mirada.'}</em>
          </h1>
          <p data-cinematic-copy>
            {block.description || 'Creamos sitios que se sienten claros, vivos y propios. Cada imagen, palabra y transición acompaña al cliente hasta entender por qué elegirte.'}
          </p>
          <div data-cinematic-copy className={styles.actions}>
            <a className="button button-yellow" href={block.primaryCTA?.url || '#proyectos'}>
              {block.primaryCTA?.label || 'Ver cómo se siente'} <ArrowRight size={18} />
            </a>
            <a className="button button-ghost" href={block.secondaryCTA?.url || '#contacto'}>
              {block.secondaryCTA?.label || 'Crear mi experiencia'}
            </a>
          </div>
        </div>
        <aside data-cinematic-copy className={styles.heroTelemetry}>
          <span>{sequenceLabel} FRAMES</span>
          <strong>DESLIZA PARA RECORRER</strong>
          <i />
        </aside>
      </section>

      <section className={`${styles.scene} ${styles.sceneRight}`} data-cinematic-scene data-side="right">
        <div className={styles.sceneCopy}>
          <span data-cinematic-copy className="eyebrow">UNA IDEA A LA VEZ</span>
          <h2 data-cinematic-copy>
            No llenamos la pantalla.
            <em>Elegimos qué mostrar.</em>
          </h2>
          <p data-cinematic-copy>
            Texto, imagen y movimiento aparecen cuando aportan algo. El resultado se siente más humano, deja respirar los fotogramas y mantiene el mensaje visible en móvil y escritorio.
          </p>
          <a data-cinematic-copy className="button button-ghost" href="#tecnologia">
            Ver nuestro método <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <section id="tecnologia" className={`${styles.techScene} ${styles.sceneLeft}`} data-cinematic-scene data-side="left">
        <div className={styles.sceneCopy}>
          <span data-cinematic-copy className="eyebrow">DISEÑO CON PROPÓSITO</span>
          <h2 data-cinematic-copy>Cada gesto tiene una razón.</h2>
          <p data-cinematic-copy>
            El movimiento no decora: ordena la atención, explica tu propuesta y hace que cada llamado a la acción llegue en el momento correcto.
          </p>
        </div>
        <div data-cinematic-copy className={styles.stack} aria-label="Capacidades del estudio">
          {stack.map((item: Doc, index: number) => {
            const Icon = techIcon(index)
            return (
              <span key={item.id || item.label || index}>
                <Icon size={15} />
                {item.label || item.name}
              </span>
            )
          })}
        </div>
      </section>

      <section className={`${styles.scene} ${styles.sceneRight}`} data-cinematic-scene data-side="right">
        <div className={styles.sceneCopy}>
          <span data-cinematic-copy className="eyebrow">RITMO NATURAL</span>
          <h2 data-cinematic-copy>La página avanza contigo.</h2>
          <p data-cinematic-copy>
            El scroll controla la secuencia, prioriza lo que estás viendo y conserva continuidad incluso cuando la conexión es lenta. Nada corre por delante de ti.
          </p>
          <div data-cinematic-copy className={styles.motionRule}>
            <b>{sequenceLabel}</b>
            <span>FOTOGRAMAS LIGEROS<br />SINCRONIZADOS CON TU RECORRIDO</span>
          </div>
        </div>
      </section>

      <section id="proyectos" className={styles.projects}>
        <div className={`${styles.projectIntro} ${styles.sceneRight}`} data-cinematic-scene data-side="right">
          <span data-cinematic-copy className="eyebrow">TRES CAPAS DE UNA BUENA EXPERIENCIA</span>
          <h2 data-cinematic-copy>Una presencia que se entiende antes de explicarse.</h2>
        </div>

        <div className={styles.projectList}>
          {projects.map((project: Doc, index: number) => {
            const fallback = fallbackProjects[index % fallbackProjects.length]
            const src = getMediaURL(project.image) || project.imageURL || fallback.imageURL
            const description = legacyDescriptions[String(project.description || '')] || project.description || fallback.description

            return (
              <article
                data-cinematic-scene
                data-side={index % 2 ? 'left' : 'right'}
                key={project.id || project.title || index}
              >
                <div className={`${styles.projectImage} ${styles[`tone${index % 3}`]}`}>
                  <Image
                    src={src}
                    alt={project.title || fallback.title}
                    fill
                    sizes="(max-width: 760px) 100vw, 54vw"
                  />
                  <span>{String(index + 1).padStart(2, '0')}</span>
                </div>
                <div className={styles.projectCopy}>
                  <small data-cinematic-copy>{project.type || project.category || fallback.type}</small>
                  <h3 data-cinematic-copy>{project.title || fallback.title}</h3>
                  <p data-cinematic-copy>{description}</p>
                  <a data-cinematic-copy href={project.url || '#contacto'}>
                    Ver la experiencia <ArrowRight size={17} />
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className={styles.closing} data-cinematic-scene data-side="left">
        <div data-cinematic-copy>
          <Star size={18} />
          <span className="eyebrow">TU MARCA, EL SIGUIENTE RECORRIDO</span>
        </div>
        <h2 data-cinematic-copy>
          Haz que tu página
          <em>se sienta propia.</em>
        </h2>
        <a data-cinematic-copy className="button button-yellow" href="#contacto">
          Empezar mi proyecto <ArrowRight size={18} />
        </a>
      </section>
    </section>
  )
}

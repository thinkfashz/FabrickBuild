'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import Image from 'next/image'
import { ArrowRight, Box, Code2, Cpu, Figma, Sparkles, Star } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { getMediaURL } from '@/lib/media'
import { RuntimeBlobFrameBackground } from './RuntimeBlobFrameBackground'
import styles from './PortfolioExperience.module.css'

type Doc = Record<string, any>

const fallbackStack = ['Next.js', 'React', 'Payload CMS', 'GSAP', 'Vercel']
const fallbackProjects = [
  {
    title: 'Experiencia visual inmersiva',
    type: 'Narrativa / movimiento',
    description: 'Convertimos el recorrido de tu página en una presentación guiada que mantiene la atención y explica tu propuesta sin saturar al visitante.',
    imageURL: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1400&q=85',
  },
  {
    title: 'Diseño que transmite valor',
    type: 'Identidad / conversión',
    description: 'Organizamos contenido, imágenes y llamados a la acción para que tus servicios se perciban profesionales, claros y confiables desde cualquier dispositivo.',
    imageURL: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85',
  },
  {
    title: 'Sistema editable y escalable',
    type: 'CMS / automatización',
    description: 'Entregamos una experiencia que puede crecer contigo: fondos, textos, secciones y proyectos se administran sin reconstruir toda la página.',
    imageURL: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85',
  },
]

const legacyDescriptions: Record<string, string> = {
  'Una identidad fluida convertida en una experiencia de compra con carácter.': fallbackProjects[0].description,
  'Una presencia editorial para mostrar espacios, proceso y confianza con claridad.': fallbackProjects[1].description,
  'Un producto que une operaciones, contenido y decisiones en tiempo real.': fallbackProjects[2].description,
}

const benefits = [
  ['Scroll inmersivo', 'Carga progresiva', 'Marca memorable'],
  ['Jerarquía clara', 'Diseño responsive', 'Mejor conversión'],
  ['Edición desde CMS', 'Fondos reutilizables', 'Escalable'],
]

const techIcon = (index: number) => [Code2, Figma, Cpu, Sparkles, Box][index % 5]

export function PortfolioExperience({ block, frameCount = 0 }: { block: Doc; frameCount?: number }) {
  const root = useRef<HTMLElement>(null)
  const stack = Array.isArray(block.techStack) && block.techStack.length ? block.techStack : fallbackStack.map((label) => ({ label }))
  const projects = Array.isArray(block.projects) && block.projects.length ? block.projects : fallbackProjects
  const sequenceLabel = frameCount > 0 ? String(frameCount) : '61'

  useEffect(() => {
    const element = root.current
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.registerPlugin(ScrollTrigger)
    const animeAnimations: Array<{ revert?: () => void }> = []
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-cinematic-scene]').forEach((scene) => {
        const direction = scene.dataset.side === 'right' ? 38 : -38
        gsap.fromTo(scene, { x: direction, autoAlpha: 0 }, {
          x: 0,
          autoAlpha: 1,
          duration: 0.68,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: scene,
            start: 'top 84%',
            once: true,
            onEnter: () => {
              const copy = Array.from(scene.querySelectorAll<HTMLElement>('[data-cinematic-copy]'))
              if (copy.length) animeAnimations.push(animate(copy, { opacity: [0, 1], translateY: [14, 0], delay: stagger(48), duration: 560, ease: 'outExpo' }))
            },
          },
        })
      })
    }, element)
    return () => {
      animeAnimations.forEach((animation) => animation.revert?.())
      context.revert()
    }
  }, [])

  return (
    <section ref={root} className={styles.portfolio}>
      {frameCount === 0 && <RuntimeBlobFrameBackground />}

      <section className={`${styles.hero} ${styles.sceneLeft}`} data-cinematic-scene data-side="left">
        <div className={styles.heroCopy}>
          <span data-cinematic-copy className="eyebrow">{block.eyebrow || 'PORTAFOLIO FABRICK / EXPERIENCIA DIGITAL'}</span>
          <h1 data-cinematic-copy>{block.heading || 'Diseñamos experiencias que se sienten vivas.'}<em>{block.highlight || 'Diseño · código · movimiento'}</em></h1>
          <p data-cinematic-copy>{block.description || 'Creamos páginas que presentan tus servicios como una experiencia visual completa: rápidas, editables y preparadas para convertir atención en confianza.'}</p>
          <div data-cinematic-copy className={styles.actions}><a className="button button-yellow" href={block.primaryCTA?.url || '#proyectos'}>{block.primaryCTA?.label || 'Ver experiencias'} <ArrowRight size={17} /></a><a className="button button-ghost" href={block.secondaryCTA?.url || '#contacto'}>{block.secondaryCTA?.label || 'Hablemos'}</a></div>
        </div>
        <aside data-cinematic-copy className={styles.heroTelemetry}><span>{sequenceLabel} FRAMES</span><strong>SCROLL PARA CONTINUAR</strong><i /></aside>
      </section>

      <section className={`${styles.scene} ${styles.sceneRight}`} data-cinematic-scene data-side="right">
        <div className={styles.sceneCopy}>
          <span data-cinematic-copy className="eyebrow">EXPERIENCIA PARA TU MARCA</span>
          <h2 data-cinematic-copy>La imagen atrae.<em>La estructura convence.</em></h2>
          <p data-cinematic-copy>Cada escena presenta una idea en el momento correcto. El visitante descubre tus servicios mediante movimiento, contraste y contenido legible, sin perder orientación ni velocidad.</p>
          <a data-cinematic-copy className="button button-ghost" href="#tecnologia">Conocer el sistema <ArrowRight size={17} /></a>
        </div>
      </section>

      <section id="tecnologia" className={`${styles.techScene} ${styles.sceneLeft}`} data-cinematic-scene data-side="left">
        <div className={styles.sceneCopy}>
          <span data-cinematic-copy className="eyebrow">SISTEMA CREATIVO</span>
          <h2 data-cinematic-copy>Una presencia visual que también puedes administrar.</h2>
          <p data-cinematic-copy>Diseño, desarrollo, contenido y fondos cinematográficos trabajan como un mismo sistema, adaptable desde el CMS y optimizado para móvil y escritorio.</p>
        </div>
        <div data-cinematic-copy className={styles.stack}>{stack.map((item: Doc, index: number) => { const Icon = techIcon(index); return <span key={item.id || item.label || index}><Icon size={16} />{item.label || item.name}</span> })}</div>
      </section>

      <section className={`${styles.scene} ${styles.sceneRight}`} data-cinematic-scene data-side="right">
        <div className={styles.sceneCopy}>
          <span data-cinematic-copy className="eyebrow">MOTION / NARRATIVA</span>
          <h2 data-cinematic-copy>El recorrido responde a cada movimiento.</h2>
          <p data-cinematic-copy>La secuencia no es un video automático pesado. El scroll controla los frames, la carga prioriza lo visible y la imagen conserva continuidad incluso en conexiones móviles.</p>
          <div data-cinematic-copy className={styles.motionRule}><b>{sequenceLabel}</b><span>FRAMES PROGRESIVOS<br />CONTROLADOS POR SCROLL</span></div>
        </div>
      </section>

      <section id="proyectos" className={styles.projects}>
        <div className={`${styles.projectIntro} ${styles.sceneRight}`} data-cinematic-scene data-side="right"><span data-cinematic-copy className="eyebrow">LO QUE OFRECEMOS</span><h2 data-cinematic-copy>Una experiencia diseñada para presentar, explicar y convertir.</h2></div>
        <div className={styles.projectList}>{projects.map((project: Doc, index: number) => {
          const fallback = fallbackProjects[index % fallbackProjects.length]
          const src = getMediaURL(project.image) || project.imageURL || fallback.imageURL
          const description = legacyDescriptions[String(project.description || '')] || project.description || fallback.description
          const projectBenefits = benefits[index % benefits.length]
          return <article data-cinematic-scene data-side={index % 2 ? 'left' : 'right'} key={project.id || project.title || index}>
            <div className={`${styles.projectImage} ${styles[`tone${index % 3}`]}`}><Image src={src} alt={project.title || fallback.title} fill sizes="(max-width: 760px) 100vw, 54vw" /><span>{String(index + 1).padStart(2, '0')}</span></div>
            <div className={styles.projectCopy}>
              <small data-cinematic-copy>{project.type || project.category || fallback.type}</small>
              <h3 data-cinematic-copy>{project.title || fallback.title}</h3>
              <p data-cinematic-copy>{description}</p>
              <ul data-cinematic-copy className="project-benefits">{projectBenefits.map((item) => <li key={item}>{item}</li>)}</ul>
              <a data-cinematic-copy href={project.url || '#contacto'}>Explorar experiencia <ArrowRight size={16} /></a>
            </div>
          </article>
        })}</div>
      </section>

      <section className={styles.closing} data-cinematic-scene data-side="left"><div><Star size={18} /><span data-cinematic-copy className="eyebrow">TU MARCA, EL SIGUIENTE FRAME</span></div><h2 data-cinematic-copy>Una página que no solo se mira.<em>Se recuerda.</em></h2><a data-cinematic-copy className="button button-yellow" href="#contacto">Crear una experiencia <ArrowRight size={17} /></a></section>
    </section>
  )
}

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
  { title: 'Marca en movimiento', type: 'Ecommerce / estrategia', description: 'Una identidad fluida convertida en una experiencia de compra con carácter.', imageURL: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1400&q=85' },
  { title: 'Arquitectura digital', type: 'Web / editorial', description: 'Una presencia editorial para mostrar espacios, proceso y confianza con claridad.', imageURL: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85' },
  { title: 'Sistema vivo', type: 'Producto / IA', description: 'Un producto que une operaciones, contenido y decisiones en tiempo real.', imageURL: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85' },
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
        const direction = scene.dataset.side === 'right' ? 54 : -54
        gsap.fromTo(scene, { x: direction, autoAlpha: 0 }, {
          x: 0,
          autoAlpha: 1,
          duration: 0.82,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: scene,
            start: 'top 82%',
            once: true,
            onEnter: () => {
              const copy = Array.from(scene.querySelectorAll<HTMLElement>('[data-cinematic-copy]'))
              if (copy.length) animeAnimations.push(animate(copy, { opacity: [0, 1], translateY: [18, 0], delay: stagger(60), duration: 680, ease: 'outExpo' }))
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
          <span data-cinematic-copy className="eyebrow">{block.eyebrow || 'FABRICKBUILD / EXPERIENCIA DIGITAL'}</span>
          <h1 data-cinematic-copy>{block.heading || 'Diseñamos experiencias que se sienten vivas.'}<em>{block.highlight || 'Diseño · código · movimiento'}</em></h1>
          <p data-cinematic-copy>{block.description || 'Una narrativa digital inmersiva, pensada para guiar cada mirada desde el primer frame hasta la última decisión.'}</p>
          <div data-cinematic-copy className={styles.actions}><a className="button button-yellow" href={block.primaryCTA?.url || '#proyectos'}>{block.primaryCTA?.label || 'Ver proyectos'} <ArrowRight size={17} /></a><a className="button button-ghost" href={block.secondaryCTA?.url || '#contacto'}>{block.secondaryCTA?.label || 'Hablemos'}</a></div>
        </div>
        <aside data-cinematic-copy className={styles.heroTelemetry}><span>{sequenceLabel} FRAMES</span><strong>SCROLL PARA CONTINUAR</strong><i /></aside>
      </section>

      <section className={`${styles.scene} ${styles.sceneRight}`} data-cinematic-scene data-side="right">
        <div className={styles.sceneCopy}>
          <span data-cinematic-copy className="eyebrow">NUESTRA FORMA DE TRABAJAR</span>
          <h2 data-cinematic-copy>La imagen abre el camino.<em>La experiencia lo confirma.</em></h2>
          <p data-cinematic-copy>Cada sección ocupa su propio momento. El texto no compite con el contenido: aparece en el costado preciso mientras la iluminación y la escena cambian con el scroll.</p>
          <a data-cinematic-copy className="button button-ghost" href="#tecnologia">Ver metodología <ArrowRight size={17} /></a>
        </div>
      </section>

      <section id="tecnologia" className={`${styles.techScene} ${styles.sceneLeft}`} data-cinematic-scene data-side="left">
        <div className={styles.sceneCopy}>
          <span data-cinematic-copy className="eyebrow">SISTEMA CREATIVO</span>
          <h2 data-cinematic-copy>Herramientas que hacen que una marca avance.</h2>
          <p data-cinematic-copy>Diseño, desarrollo y contenido trabajan como un mismo sistema, adaptable desde Payload y preparado para cualquier pantalla.</p>
        </div>
        <div data-cinematic-copy className={styles.stack}>{stack.map((item: Doc, index: number) => { const Icon = techIcon(index); return <span key={item.id || item.label || index}><Icon size={16} />{item.label || item.name}</span> })}</div>
      </section>

      <section className={`${styles.scene} ${styles.sceneRight}`} data-cinematic-scene data-side="right">
        <div className={styles.sceneCopy}>
          <span data-cinematic-copy className="eyebrow">MOTION / NARRATIVA</span>
          <h2 data-cinematic-copy>El recorrido avanza con tu mano.</h2>
          <p data-cinematic-copy>La portada no reproduce un video automático por detrás: el scroll controla todos los frames generados y transforma la luz con cada avance, de manera natural y precisa.</p>
          <div data-cinematic-copy className={styles.motionRule}><b>{sequenceLabel}</b><span>FRAMES SINCRONIZADOS<br />CON SCROLLTRIGGER</span></div>
        </div>
      </section>

      <section id="proyectos" className={styles.projects}>
        <div className={`${styles.projectIntro} ${styles.sceneRight}`} data-cinematic-scene data-side="right"><span data-cinematic-copy className="eyebrow">SELECCIÓN</span><h2 data-cinematic-copy>Interfaces con una personalidad propia.</h2></div>
        <div className={styles.projectList}>{projects.map((project: Doc, index: number) => {
          const src = getMediaURL(project.image) || project.imageURL || fallbackProjects[index % fallbackProjects.length].imageURL
          return <article data-cinematic-scene data-side={index % 2 ? 'left' : 'right'} key={project.id || project.title || index}>
            <div className={`${styles.projectImage} ${styles[`tone${index % 3}`]}`}><Image src={src} alt={project.title || 'Proyecto'} fill sizes="(max-width: 760px) 100vw, 54vw" /><span>{String(index + 1).padStart(2, '0')}</span></div>
            <div className={styles.projectCopy}><small data-cinematic-copy>{project.type || project.category || 'Portfolio'}</small><h3 data-cinematic-copy>{project.title || `Proyecto ${index + 1}`}</h3><p data-cinematic-copy>{project.description || 'Una experiencia diseñada para navegar, descubrir y recordar.'}</p><a data-cinematic-copy href={project.url || '#contacto'}>Explorar caso <ArrowRight size={16} /></a></div>
          </article>
        })}</div>
      </section>

      <section className={styles.closing} data-cinematic-scene data-side="left"><div><Star size={18} /><span data-cinematic-copy className="eyebrow">LISTO PARA EL SIGUIENTE FRAME</span></div><h2 data-cinematic-copy>Una historia que no se mira.<em>Se recorre.</em></h2><a data-cinematic-copy className="button button-yellow" href="#contacto">Crear algo memorable <ArrowRight size={17} /></a></section>
    </section>
  )
}

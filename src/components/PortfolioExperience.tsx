'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import Image from 'next/image'
import { ArrowRight, Box, Code2, Cpu, Figma, Sparkles, Star } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { getMediaURL } from '@/lib/media'
import styles from './PortfolioExperience.module.css'

type Doc = Record<string, any>

const fallbackStack = ['Next.js', 'React', 'Payload CMS', 'GSAP', 'Vercel']
const fallbackProjects = [
  { title: 'Marca en movimiento', type: 'Ecommerce / estrategia', description: 'Una identidad fluida convertida en una experiencia de compra con carácter.', imageURL: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1400&q=85' },
  { title: 'Arquitectura digital', type: 'Web / editorial', description: 'Una presencia editorial para mostrar espacios, proceso y confianza con claridad.', imageURL: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85' },
  { title: 'Sistema vivo', type: 'Producto / IA', description: 'Un producto que une operaciones, contenido y decisiones en tiempo real.', imageURL: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85' },
]

const techIcon = (index: number) => [Code2, Figma, Cpu, Sparkles, Box][index % 5]

export function PortfolioExperience({ block }: { block: Doc }) {
  const root = useRef<HTMLElement>(null)
  const stack = Array.isArray(block.techStack) && block.techStack.length ? block.techStack : fallbackStack.map((label) => ({ label }))
  const projects = Array.isArray(block.projects) && block.projects.length ? block.projects : fallbackProjects

  useEffect(() => {
    const element = root.current
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.registerPlugin(ScrollTrigger)
    const animeAnimations: Array<{ revert?: () => void }> = []
    const context = gsap.context(() => {
      gsap.fromTo(`.${styles.heroCopy} > *`, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .1, ease: 'power3.out' })
      gsap.fromTo(`.${styles.orbital}`, { rotate: -12, scale: .84, opacity: 0 }, { rotate: 0, scale: 1, opacity: 1, duration: 1.1, ease: 'expo.out' })
      gsap.to(`.${styles.orbital}`, { rotate: 360, ease: 'none', scrollTrigger: { trigger: element, start: 'top bottom', end: 'bottom top', scrub: 1 } })
      gsap.utils.toArray<HTMLElement>('[data-cinematic-section]').forEach((section) => {
        const direction = section.dataset.side === 'right' ? 58 : -58
        gsap.fromTo(section, { x: direction, autoAlpha: 0 }, {
          x: 0,
          autoAlpha: 1,
          duration: .85,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 84%',
            once: true,
            onEnter: () => {
              const copy = Array.from(section.querySelectorAll<HTMLElement>('[data-cinematic-copy]'))
              if (copy.length) animeAnimations.push(animate(copy, { opacity: [0, 1], translateY: [16, 0], delay: stagger(58), duration: 620, ease: 'outExpo' }))
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
      <div className={styles.hero} data-cinematic-section data-side="left">
        <div className={`${styles.heroCopy} ${styles.reveal}`}>
          <span data-cinematic-copy className="eyebrow">{block.eyebrow || 'ESTUDIO DIGITAL INDEPENDIENTE'}</span>
          <h1 data-cinematic-copy>{block.heading || 'Diseñamos experiencias que se sienten vivas.'}<em>{block.highlight || 'Diseño · código · movimiento'}</em></h1>
          <p data-cinematic-copy>{block.description || 'Estrategia, identidad y producto digital para marcas que buscan una presencia imposible de ignorar.'}</p>
          <div data-cinematic-copy className={styles.actions}><a className="button button-yellow" href={block.primaryCTA?.url || '#proyectos'}>{block.primaryCTA?.label || 'Ver proyectos'} <ArrowRight size={17} /></a><a className="button button-ghost" href={block.secondaryCTA?.url || '#contacto'}>{block.secondaryCTA?.label || 'Hablemos'}</a></div>
        </div>
        <div className={styles.orbital} aria-hidden="true"><span>01</span><span>UX</span><span>AI</span><span>WEBGL</span><i /><b /></div>
      </div>

      <div className={`${styles.stackSection} ${styles.reveal}`} data-cinematic-section data-side="left"><div className={styles.sectionHead}><span data-cinematic-copy className="eyebrow">TECNOLOGÍAS</span><h2 data-cinematic-copy>Construido con herramientas que escalan.</h2></div><div data-cinematic-copy className={styles.stack}>{stack.map((item: Doc, index: number) => { const Icon = techIcon(index); return <span key={item.id || item.label || index}><Icon size={16} />{item.label || item.name}</span> })}</div></div>

      <section className={styles.story} data-cinematic-section data-side="right">
        <div className={styles.storyVisual} aria-hidden="true"><span>02 / MOTION</span><i /><i /><b /></div>
        <div className={styles.storyCopy}>
          <span data-cinematic-copy className="eyebrow">RECORRIDO CINEMATOGRÁFICO</span>
          <h2 data-cinematic-copy>El proyecto avanza a tu ritmo.</h2>
          <p data-cinematic-copy>Cada frame responde al desplazamiento: sin reproducción automática, sin perder el control y con una transición continua entre historia, imagen y acción.</p>
          <a data-cinematic-copy className="button button-ghost" href="#proyectos">Explorar el proceso <ArrowRight size={17} /></a>
        </div>
      </section>

      <div id="proyectos" className={`${styles.projects} ${styles.reveal}`}><div className={styles.sectionHead} data-cinematic-section data-side="left"><span data-cinematic-copy className="eyebrow">SELECCIÓN</span><h2 data-cinematic-copy>Interfaces con una personalidad propia.</h2></div><div className={styles.projectList}>{projects.map((project: Doc, index: number) => { const src = getMediaURL(project.image) || project.imageURL || fallbackProjects[index % fallbackProjects.length].imageURL; return <article data-cinematic-section data-side={index % 2 ? 'right' : 'left'} key={project.id || project.title || index}><div className={`${styles.projectImage} ${styles[`tone${index % 3}`]}`}><Image src={src} alt={project.title || 'Proyecto'} fill sizes="(max-width: 760px) 100vw, 55vw" /><span>{String(index + 1).padStart(2, '0')}</span></div><div className={styles.projectCopy}><small data-cinematic-copy>{project.type || project.category || 'Portfolio'}</small><h3 data-cinematic-copy>{project.title || `Proyecto ${index + 1}`}</h3><p data-cinematic-copy>{project.description || 'Una experiencia diseñada para navegar, descubrir y recordar.'}</p><a data-cinematic-copy href={project.url || '#contacto'}>Explorar caso <ArrowRight size={16} /></a></div></article> })}</div></div>

      <div className={`${styles.closing} ${styles.reveal}`} data-cinematic-section data-side="right"><Star size={18} /><p data-cinematic-copy>Un portfolio que también es una experiencia: editable desde Payload, visible en móvil y diseñado para crecer.</p></div>
    </section>
  )
}

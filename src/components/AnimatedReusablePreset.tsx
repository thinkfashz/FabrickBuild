'use client'

import { animate, stagger } from 'animejs'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useEffect, useRef } from 'react'

export function AnimatedReusablePreset({ slug }: { slug: string }) {
  const element = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!element.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const targets = element.current.querySelectorAll('[data-anime]')
    const animation = animate(targets, { opacity: [0, 1], translateY: [18, 0], delay: stagger(90), duration: 680, ease: 'outExpo' })
    return () => animation.revert?.()
  }, [])

  if (slug === 'preset-animated-solid-cta') return <section ref={element} className="anime-preset anime-preset--solid"><span data-anime><Sparkles size={15} /> CTA ANIMADO</span><h2 data-anime>Una decisión clara merece una acción rápida.</h2><p data-anime>Botón sólido reutilizable: cambia colores, borde, radio y tipografía desde Apariencia visual.</p><Link data-anime href="#contacto">Solicitar propuesta <ArrowRight size={16} /></Link></section>
  return <section ref={element} className="anime-preset anime-preset--glass"><span data-anime>CARDS TRANSLÚCIDAS</span><h2 data-anime>Contenido con profundidad, sin perder limpieza.</h2><div><article data-anime><b>Diagnóstico</b><p>Ordena la información esencial.</p></article><article data-anime><b>Diseño</b><p>Adapta color, fondo y tamaño.</p></article><article data-anime><b>Acción</b><p>Conecta a tu ruta o WhatsApp.</p></article></div></section>
}

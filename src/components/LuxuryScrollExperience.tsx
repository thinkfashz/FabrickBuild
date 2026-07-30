'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './LuxuryScrollExperience.module.css'

const DESKTOP_FRAMES = 21
const MOBILE_FRAMES = 20
const INITIAL_FRAME_BATCH = 5
const BACKGROUND_BATCH = 6
const HEADER_DESKTOP = 76
const HEADER_MOBILE = 64

const story = [
  {
    eyebrow: 'Arquitectura con propósito',
    title: 'El lujo no debe ser costoso.',
    text: 'Debe sentirse bien pensado: proporciones limpias, luz natural, circulación cómoda y decisiones que aportan valor todos los días.',
  },
  {
    eyebrow: 'Planificación inteligente',
    title: 'Primero diseñamos. Después construimos.',
    text: 'Definir cada etapa antes de iniciar reduce improvisaciones, evita compras duplicadas y protege el presupuesto de la obra.',
  },
  {
    eyebrow: 'Valor por metro cuadrado',
    title: 'Cada espacio tiene que trabajar a tu favor.',
    text: 'Una distribución eficiente convierte menos metros en más amplitud, más almacenamiento y una experiencia verdaderamente premium.',
  },
  {
    eyebrow: 'Terminaciones finas',
    title: 'La diferencia vive en los encuentros.',
    text: 'Juntas uniformes, líneas niveladas, sellos limpios, iluminación integrada y superficies correctamente preparadas elevan el resultado completo.',
  },
  {
    eyebrow: 'Materiales seleccionados',
    title: 'No elegimos por precio. Elegimos por desempeño.',
    text: 'Comparamos resistencia, mantenimiento, disponibilidad y apariencia para equilibrar durabilidad, estética y costo real de uso.',
  },
  {
    eyebrow: 'Ejecución controlada',
    title: 'Menos desperdicio. Más valor construido.',
    text: 'La cubicación, la coordinación de especialidades y el control de avances disminuyen mermas y evitan que el lujo se convierta en sobreprecio.',
  },
  {
    eyebrow: 'Estándar FabrickBuild',
    title: 'Profesional, documentado y verificable.',
    text: 'Trabajamos con seguimiento de obra, registro de decisiones y certificaciones aplicables según cada especialidad y proyecto.',
  },
  {
    eyebrow: 'Propuesta referencial',
    title: '$799.000 CLP por m².',
    text: 'Una propuesta competitiva para una vivienda contemporánea, con terminaciones de nivel superior y una planificación transparente.',
  },
]

const finishProducts = [
  {
    id: 'spc-premium',
    eyebrow: 'Pisos',
    title: 'Piso SPC premium',
    description: 'Apariencia cálida, alta estabilidad y mantenimiento simple para áreas de uso diario.',
  },
  {
    id: 'led-architectural',
    eyebrow: 'Iluminación',
    title: 'Iluminación arquitectónica LED',
    description: 'Luz indirecta y puntual para destacar volúmenes, recorridos y terminaciones.',
  },
  {
    id: 'griferia-premium',
    eyebrow: 'Cocina y baños',
    title: 'Grifería monomando premium',
    description: 'Líneas limpias, uso eficiente y una terminación coherente con el lenguaje de la vivienda.',
  },
]

type FrameSet = {
  count: number
  kind: 'desktop' | 'mobile'
  paths: string[]
}

type CartItem = {
  id: string
  title: string
  quantity: number
}

type ConnectionNavigator = Navigator & {
  connection?: EventTarget & {
    saveData?: boolean
    effectiveType?: string
  }
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
  cancelIdleCallback?: (id: number) => void
}

type ScheduledTask = { id: number; idle: boolean }

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function buildFrames(kind: FrameSet['kind'], count: number) {
  return Array.from({ length: count }, (_, index) =>
    `/frames/luxury/${kind}/frame_${String(index + 1).padStart(3, '0')}.webp`,
  )
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

function isPortraitExperience() {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 900 || window.innerHeight > window.innerWidth
}

function connectionPreferences() {
  if (typeof window === 'undefined') return { saveData: false, reduceMotion: false }
  const connection = (navigator as ConnectionNavigator).connection
  return {
    saveData: Boolean(connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType || '')),
    reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }
}

function nearestLoaded(loaded: Set<number>, requested: number) {
  let nearest = -1
  let distance = Number.POSITIVE_INFINITY
  for (const index of loaded) {
    const nextDistance = Math.abs(index - requested)
    if (nextDistance < distance) {
      nearest = index
      distance = nextDistance
    }
  }
  return nearest
}

export function LuxuryScrollExperience() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<Array<HTMLImageElement | undefined>>([])
  const loadedFramesRef = useRef<Set<number>>(new Set())
  const requestedFrameRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const loadFrameRef = useRef<(index: number, priority?: boolean) => void>(() => undefined)
  const reduceMotionRef = useRef(false)
  const [frameSet, setFrameSet] = useState<FrameSet>(() => ({
    kind: 'desktop',
    count: DESKTOP_FRAMES,
    paths: buildFrames('desktop', DESKTOP_FRAMES),
  }))
  const [progress, setProgress] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [lightweight, setLightweight] = useState(false)
  const [m2, setM2] = useState(100)
  const [cartCount, setCartCount] = useState(0)
  const [cartMessage, setCartMessage] = useState('')

  const activeStory = Math.min(story.length - 1, Math.floor(progress * story.length))
  const marketLow = m2 * 580_000
  const marketHigh = m2 * 1_300_000
  const fabrickValue = m2 * 799_000
  const difference = marketHigh - fabrickValue

  const bars = useMemo(
    () => [
      { label: 'Mercado desde', value: marketLow, width: (marketLow / marketHigh) * 100 },
      { label: 'FabrickBuild', value: fabrickValue, width: (fabrickValue / marketHigh) * 100, featured: true },
      { label: 'Mercado superior', value: marketHigh, width: 100 },
    ],
    [fabrickValue, marketHigh, marketLow],
  )

  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current
    const image = imagesRef.current[index]
    if (!canvas || !image?.complete || !image.naturalWidth) return

    const context = canvas.getContext('2d', { alpha: false })
    if (!context) return

    const rect = canvas.getBoundingClientRect()
    const { saveData } = connectionPreferences()
    const dprCap = window.innerWidth < 900 || saveData ? 1.35 : 2
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
    const width = Math.max(1, Math.round(rect.width * dpr))
    const height = Math.max(1, Math.round(rect.height * dpr))

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
    const drawWidth = image.naturalWidth * scale
    const drawHeight = image.naturalHeight * scale
    const x = (width - drawWidth) / 2
    const y = (height - drawHeight) / 2

    context.fillStyle = '#0d0d0d'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, x, y, drawWidth, drawHeight)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as ConnectionNavigator).connection

    const updateMode = () => {
      const mobile = isPortraitExperience()
      const preferences = connectionPreferences()
      reduceMotionRef.current = preferences.reduceMotion
      setLightweight(preferences.saveData || preferences.reduceMotion)
      setFrameSet((current) => {
        const kind = mobile ? 'mobile' : 'desktop'
        const count = mobile ? MOBILE_FRAMES : DESKTOP_FRAMES
        if (current.kind === kind && current.count === count) return current
        return { kind, count, paths: buildFrames(kind, count) }
      })
    }

    updateMode()
    window.addEventListener('resize', updateMode, { passive: true })
    media.addEventListener?.('change', updateMode)
    connection?.addEventListener?.('change', updateMode)
    return () => {
      window.removeEventListener('resize', updateMode)
      media.removeEventListener?.('change', updateMode)
      connection?.removeEventListener?.('change', updateMode)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let firstPainted = false
    const pending = new Set<number>()
    const tasks: ScheduledTask[] = []
    const idleWindow = window as IdleWindow

    setLoaded(false)
    imagesRef.current = new Array(frameSet.count)
    loadedFramesRef.current = new Set()

    const loadFrame = (index: number, priority = false) => {
      if (cancelled || index < 0 || index >= frameSet.count) return
      if (imagesRef.current[index] || pending.has(index)) return

      pending.add(index)
      const image = new window.Image()
      image.decoding = 'async'
      image.loading = priority ? 'eager' : 'lazy'
      ;(image as HTMLImageElement & { fetchPriority?: 'high' | 'low' | 'auto' }).fetchPriority = priority ? 'high' : 'low'
      imagesRef.current[index] = image

      image.onload = () => {
        pending.delete(index)
        if (cancelled) return
        loadedFramesRef.current.add(index)

        if (!firstPainted) {
          firstPainted = true
          setLoaded(true)
          drawFrame(index)
        }

        if (index === requestedFrameRef.current) drawFrame(index)
      }
      image.onerror = () => {
        pending.delete(index)
        if (!cancelled && index === 0 && !firstPainted) setLoaded(true)
      }
      image.src = frameSet.paths[index]
    }

    loadFrameRef.current = loadFrame

    const initialCount = lightweight ? Math.min(2, frameSet.count) : Math.min(INITIAL_FRAME_BATCH, frameSet.count)
    for (let index = 0; index < initialCount; index += 1) loadFrame(index, index === 0)

    const scheduleBatch = (start: number) => {
      if (cancelled || lightweight || start >= frameSet.count) return
      const run = () => {
        if (cancelled) return
        const end = Math.min(frameSet.count, start + BACKGROUND_BATCH)
        for (let index = start; index < end; index += 1) loadFrame(index)
        scheduleBatch(end)
      }

      if (idleWindow.requestIdleCallback) {
        const id = idleWindow.requestIdleCallback(run, { timeout: 1200 })
        tasks.push({ id, idle: true })
      } else {
        const id = window.setTimeout(run, 180)
        tasks.push({ id, idle: false })
      }
    }

    scheduleBatch(initialCount)

    return () => {
      cancelled = true
      loadFrameRef.current = () => undefined
      for (const task of tasks) {
        if (task.idle) idleWindow.cancelIdleCallback?.(task.id)
        else window.clearTimeout(task.id)
      }
      for (const image of imagesRef.current) {
        if (!image) continue
        image.onload = null
        image.onerror = null
      }
    }
  }, [drawFrame, frameSet, lightweight])

  useEffect(() => {
    const update = () => {
      animationFrameRef.current = null
      const section = sectionRef.current
      if (!section) return

      const rect = section.getBoundingClientRect()
      const headerHeight = window.innerWidth < 760 ? HEADER_MOBILE : HEADER_DESKTOP
      const viewport = Math.max(1, window.innerHeight - headerHeight)
      const scrollable = Math.max(1, section.offsetHeight - viewport)
      const nextProgress = clamp((headerHeight - rect.top) / scrollable)
      const requested = reduceMotionRef.current
        ? 0
        : Math.min(frameSet.count - 1, Math.round(nextProgress * (frameSet.count - 1)))

      requestedFrameRef.current = requested
      setProgress((current) => (Math.abs(current - nextProgress) > 0.001 ? nextProgress : current))

      if (loadedFramesRef.current.has(requested)) {
        drawFrame(requested)
      } else {
        if (!reduceMotionRef.current) loadFrameRef.current(requested, true)
        const fallback = nearestLoaded(loadedFramesRef.current, requested)
        if (fallback >= 0) drawFrame(fallback)
      }
    }

    const requestUpdate = () => {
      if (animationFrameRef.current !== null) return
      animationFrameRef.current = window.requestAnimationFrame(update)
    }

    requestUpdate()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate, { passive: true })

    return () => {
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current)
    }
  }, [drawFrame, frameSet.count])

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem('fabrickbuild-quote-cart') || '[]') as CartItem[]
      setCartCount(stored.reduce((total, item) => total + Number(item.quantity || 0), 0))
    } catch {
      setCartCount(0)
    }
  }, [])

  function addToCart(product: (typeof finishProducts)[number]) {
    let items: CartItem[] = []
    try {
      items = JSON.parse(window.localStorage.getItem('fabrickbuild-quote-cart') || '[]') as CartItem[]
    } catch {
      items = []
    }

    const existing = items.find((item) => item.id === product.id)
    if (existing) existing.quantity += 1
    else items.push({ id: product.id, title: product.title, quantity: 1 })

    window.localStorage.setItem('fabrickbuild-quote-cart', JSON.stringify(items))
    setCartCount(items.reduce((total, item) => total + item.quantity, 0))
    setCartMessage(`${product.title} añadido al carrito de terminaciones.`)
    window.setTimeout(() => setCartMessage(''), 2800)
  }

  return (
    <>
      <section
        ref={sectionRef}
        className={styles.sequence}
        aria-label="Recorrido de una vivienda FabrickBuild"
        data-lightweight={lightweight ? 'true' : 'false'}
      >
        <div className={styles.stickyStage}>
          <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
          <div className={styles.imageShade} />

          {!loaded && (
            <div className={styles.loader} role="status">
              <span />
              Preparando recorrido
            </div>
          )}

          <div className={styles.topline}>
            <span>FabrickBuild Signature Home</span>
            <span>{lightweight ? 'Experiencia optimizada' : frameSet.kind === 'mobile' ? 'Experiencia móvil' : 'Experiencia panorámica'}</span>
          </div>

          <div className={styles.storyViewport}>
            {story.map((item, index) => {
              const active = index === activeStory
              const side = index % 2 === 0 ? styles.left : styles.right
              return (
                <article
                  key={item.title}
                  className={`${styles.storyCard} ${side} ${active ? styles.active : ''}`}
                  aria-hidden={!active}
                >
                  <span className={styles.storyNumber}>{String(index + 1).padStart(2, '0')}</span>
                  <p>{item.eyebrow}</p>
                  <h1>{item.title}</h1>
                  <div className={styles.cardText}>{item.text}</div>
                  {index === story.length - 1 && (
                    <a className={styles.storyAction} href="#calculadora-casa">
                      Calcular mi casa
                    </a>
                  )}
                </article>
              )
            })}
          </div>

          <div className={styles.progressRail} aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>
          <div className={styles.scrollHint} aria-hidden="true">
            <span /> Desliza para recorrer
          </div>
        </div>
      </section>

      <section id="calculadora-casa" className={styles.calculatorSection}>
        <div className={styles.calculatorShell}>
          <div className={styles.calculatorIntro}>
            <p>Comparador referencial de construcción</p>
            <h2>¿Cuánto puede costar tu casa?</h2>
            <div>
              Compara un rango de mercado de <strong>$580.000 a $1.300.000 por m²</strong> con la propuesta
              referencial FabrickBuild de <strong>$799.000 por m²</strong>.
            </div>
            <div className={styles.badges}>
              <span>Ultra profesional</span>
              <span>Terminaciones de lujo</span>
              <span>Certificaciones según proyecto</span>
            </div>
          </div>

          <div className={styles.calculatorCard}>
            <div className={styles.inputRow}>
              <label htmlFor="luxury-m2">Superficie de la vivienda</label>
              <div>
                <input
                  id="luxury-m2"
                  type="number"
                  min="40"
                  max="350"
                  value={m2}
                  onChange={(event) => setM2(clamp(Number(event.target.value) || 40, 40, 350))}
                />
                <span>m²</span>
              </div>
            </div>
            <input
              className={styles.range}
              aria-label="Metros cuadrados"
              type="range"
              min="40"
              max="350"
              step="5"
              value={m2}
              onChange={(event) => setM2(Number(event.target.value))}
            />

            <div className={styles.resultHero}>
              <span>Propuesta FabrickBuild</span>
              <strong>{formatCLP(fabrickValue)}</strong>
              <small>{formatCLP(799_000)} por m² · {m2} m²</small>
            </div>

            <div className={styles.marketBars}>
              {bars.map((bar) => (
                <div key={bar.label} className={bar.featured ? styles.featuredBar : ''}>
                  <div className={styles.barLabel}>
                    <span>{bar.label}</span>
                    <strong>{formatCLP(bar.value)}</strong>
                  </div>
                  <div className={styles.barTrack}>
                    <span style={{ width: `${Math.max(8, bar.width)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.savingBox}>
              <span>Diferencia frente al extremo superior del mercado</span>
              <strong>{formatCLP(difference)}</strong>
            </div>

            <a className={styles.quoteButton} href="#contacto">
              Solicitar evaluación profesional
            </a>
            <p className={styles.disclaimer}>
              Valores referenciales. El precio final depende de ubicación, terreno, permisos, arquitectura,
              especialidades, materiales y alcance contractual. No incluye el valor del terreno.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.finishesSection} aria-labelledby="terminaciones-title">
        <div className={styles.finishesHead}>
          <div>
            <p>Terminaciones seleccionables</p>
            <h2 id="terminaciones-title">Completa la experiencia de tu vivienda.</h2>
          </div>
          <span className={styles.cartBadge}>Carrito · {cartCount}</span>
        </div>
        <div className={styles.productGrid}>
          {finishProducts.map((product) => (
            <article key={product.id} className={styles.productCard}>
              <p>{product.eyebrow}</p>
              <h3>{product.title}</h3>
              <div>{product.description}</div>
              <span>Cotizable según superficie y especificación</span>
              <button type="button" onClick={() => addToCart(product)}>
                Añadir al carrito
              </button>
            </article>
          ))}
        </div>
        <div className={`${styles.cartToast} ${cartMessage ? styles.cartToastVisible : ''}`} aria-live="polite">
          {cartMessage}
        </div>
      </section>
    </>
  )
}

import config from '@payload-config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'

type Device = 'desktop' | 'mobile'

type BackgroundLike = {
  id: string | number
  desktopFrames?: unknown[] | null
  mobileFrames?: unknown[] | null
}

const specs: Array<{ device: Device; count: number }> = [
  { device: 'desktop', count: 21 },
  { device: 'mobile', count: 20 },
]

const frameName = (index: number) => `frame_${String(index).padStart(3, '0')}.webp`

const hasUsableSequence = (background: BackgroundLike | null) => {
  if (!background) return false
  const desktop = Array.isArray(background.desktopFrames) ? background.desktopFrames.length : 0
  const mobile = Array.isArray(background.mobileFrames) ? background.mobileFrames.length : 0
  return desktop >= 2 || mobile >= 2
}

async function ensureFrame(payload: Awaited<ReturnType<typeof getPayload>>, device: Device, index: number) {
  const existing = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [
        { collectionKey: { equals: 'home' } },
        { device: { equals: device } },
        { frameOrder: { equals: index } },
      ],
    },
  })

  if (existing.docs[0]) return existing.docs[0].id

  const sourceName = frameName(index)
  const sourcePath = path.join(process.cwd(), 'public', 'frames', 'luxury', device, sourceName)
  const data = await readFile(sourcePath)
  const uploadName = `casa-${device}-${sourceName}`

  const created = await payload.create({
    collection: 'media',
    depth: 0,
    overrideAccess: true,
    data: {
      alt: `Casa — frame ${device === 'mobile' ? 'móvil' : 'escritorio'} ${index}`,
      category: 'frame',
      device,
      frameOrder: index,
      collectionKey: 'home',
      caption: 'Recuperado automáticamente desde el atlas protegido de FabrickBuild.',
    },
    file: {
      data,
      mimetype: 'image/webp',
      name: uploadName,
      size: data.length,
    },
  } as any)

  payload.logger.info(`Frame recuperado en Multimedia: ${uploadName}`)
  return created.id
}

async function run() {
  const payload = await getPayload({ config })

  const backgrounds = await payload.find({
    collection: 'backgrounds',
    depth: 1,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: 'home' } },
  })
  const current = (backgrounds.docs[0] || null) as BackgroundLike | null

  if (hasUsableSequence(current)) {
    payload.logger.info('Background Casa/home ya contiene una secuencia; no se modifica.')
    if (typeof payload.db.destroy === 'function') await payload.db.destroy()
    process.exit(0)
  }

  const recovered: Record<Device, Array<string | number>> = { desktop: [], mobile: [] }
  for (const spec of specs) {
    for (let index = 1; index <= spec.count; index += 1) {
      recovered[spec.device].push(await ensureFrame(payload, spec.device, index))
    }
  }

  const data = {
    name: 'Casa',
    kind: 'frames',
    device: 'responsive',
    status: 'ready',
    desktopFrames: recovered.desktop,
    mobileFrames: recovered.mobile,
    poster: recovered.mobile[0] || recovered.desktop[0],
    engine: 'gsap-canvas',
    playback: {
      trigger: 'scroll',
      scrub: 0.35,
      pin: true,
      snap: false,
      scrollLength: 780,
      parallax: 12,
      fit: 'cover',
      overlayOpacity: 20,
    },
    category: 'hero',
    notes: 'Secuencia recuperada desde el atlas protegido del repositorio.',
  }

  if (current?.id) {
    await payload.update({
      collection: 'backgrounds',
      id: current.id,
      depth: 0,
      overrideAccess: true,
      data: data as any,
    })
  } else {
    await payload.create({
      collection: 'backgrounds',
      depth: 0,
      overrideAccess: true,
      data: { ...data, slug: 'home' } as any,
    })
  }

  payload.logger.info(
    `Background Casa/home reparado: ${recovered.desktop.length} frames web y ${recovered.mobile.length} móviles.`,
  )

  if (typeof payload.db.destroy === 'function') await payload.db.destroy()
  process.exit(0)
}

run().catch((error) => {
  console.error('No fue posible recuperar la secuencia cinematográfica en Multimedia.', error)
  process.exit(1)
})

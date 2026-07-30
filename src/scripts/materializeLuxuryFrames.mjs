import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const filename = fileURLToPath(import.meta.url)
const root = path.resolve(path.dirname(filename), '../..')
const sourceRoot = path.join(root, 'assets/luxury-atlas-source')
const publicRoot = path.join(root, 'public/frames/luxury')
const LIMIT_BYTES = 200_000

const atlases = [
  {
    name: 'desktop',
    chunks: [
      'desktop-00.b64',
      'desktop-01.b64',
      'desktop-02.b64',
      'desktop-03.b64',
      'desktop-04.b64',
    ],
    width: 3_360,
    height: 810,
    columns: 7,
    rows: 3,
    frames: 21,
    cellWidth: 480,
    cellHeight: 270,
  },
  {
    name: 'mobile',
    chunks: ['mobile-00.b64', 'mobile-01.b64', 'mobile-02.b64', 'mobile-03.b64'],
    width: 1_350,
    height: 1_920,
    columns: 5,
    rows: 4,
    frames: 20,
    cellWidth: 270,
    cellHeight: 480,
  },
]

const digest = (buffer) => createHash('sha256').update(buffer).digest('hex')
const frameName = (index) => `frame_${String(index + 1).padStart(3, '0')}.webp`

async function reconstructAtlas(spec) {
  const parts = await Promise.all(
    spec.chunks.map(async (chunk) => (await readFile(path.join(sourceRoot, chunk), 'utf8')).replace(/\s+/g, '')),
  )
  const atlas = Buffer.from(parts.join(''), 'base64')

  if (!atlas.length || atlas.length > LIMIT_BYTES) {
    throw new Error(`${spec.name}: el atlas tiene un tamaño inválido de ${atlas.length} bytes.`)
  }

  const metadata = await sharp(atlas).metadata()
  if (metadata.width !== spec.width || metadata.height !== spec.height || metadata.format !== 'webp') {
    throw new Error(
      `${spec.name}: dimensiones o formato inválidos (${metadata.width}×${metadata.height}, ${metadata.format}).`,
    )
  }

  console.log(`[Luxury frames] ${spec.name}: atlas validado, ${atlas.length} B, SHA-256 ${digest(atlas)}.`)
  return atlas
}

async function materialize(spec) {
  const atlas = await reconstructAtlas(spec)
  const frameDirectory = path.join(publicRoot, spec.name)
  const atlasDirectory = path.join(publicRoot, 'atlas')

  await rm(frameDirectory, { recursive: true, force: true })
  await mkdir(frameDirectory, { recursive: true })
  await mkdir(atlasDirectory, { recursive: true })
  await writeFile(path.join(atlasDirectory, `${spec.name}.webp`), atlas)

  let totalBytes = 0
  let largestBytes = 0

  for (let index = 0; index < spec.frames; index += 1) {
    const column = index % spec.columns
    const row = Math.floor(index / spec.columns)
    const frame = await sharp(atlas)
      .extract({
        left: column * spec.cellWidth,
        top: row * spec.cellHeight,
        width: spec.cellWidth,
        height: spec.cellHeight,
      })
      .webp({ quality: 82, effort: 5, smartSubsample: true })
      .toBuffer()

    if (frame.length > LIMIT_BYTES) {
      throw new Error(`${spec.name}/${frameName(index)} supera ${LIMIT_BYTES} bytes.`)
    }

    await writeFile(path.join(frameDirectory, frameName(index)), frame)
    totalBytes += frame.length
    largestBytes = Math.max(largestBytes, frame.length)
  }

  const atlasStats = await stat(path.join(atlasDirectory, `${spec.name}.webp`))
  console.log(
    `[Luxury frames] ${spec.name}: ${spec.frames} frames, atlas ${atlasStats.size} B, ` +
    `total ${totalBytes} B, mayor ${largestBytes} B.`,
  )
}

await mkdir(publicRoot, { recursive: true })
for (const atlas of atlases) await materialize(atlas)
console.log('[Luxury frames] Activos verificados y listos para la CDN estática de Vercel.')

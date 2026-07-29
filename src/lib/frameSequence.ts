export type FrameLike = {
  id?: string | number
  filename?: string | null
  frameOrder?: number | null
  targetDevice?: 'universal' | 'desktop' | 'mobile' | null
  width?: number | null
  height?: number | null
}

const numberPattern = /(\d+)/g

export function naturalFrameCompare(a: FrameLike, b: FrameLike): number {
  const explicitA = Number(a.frameOrder || 0)
  const explicitB = Number(b.frameOrder || 0)
  if (explicitA && explicitB && explicitA !== explicitB) return explicitA - explicitB

  const nameA = String(a.filename || a.id || '')
  const nameB = String(b.filename || b.id || '')
  const partsA = nameA.split(numberPattern)
  const partsB = nameB.split(numberPattern)
  const length = Math.max(partsA.length, partsB.length)

  for (let index = 0; index < length; index += 1) {
    const partA = partsA[index] || ''
    const partB = partsB[index] || ''
    const numericA = /^\d+$/.test(partA)
    const numericB = /^\d+$/.test(partB)

    if (numericA && numericB) {
      const difference = Number(partA) - Number(partB)
      if (difference !== 0) return difference
      continue
    }

    const difference = partA.localeCompare(partB, 'es', { sensitivity: 'base' })
    if (difference !== 0) return difference
  }

  return 0
}

export function detectFrameDevice(frame: FrameLike): 'desktop' | 'mobile' {
  if (frame.targetDevice === 'desktop' || frame.targetDevice === 'mobile') return frame.targetDevice
  if (Number(frame.height || 0) > Number(frame.width || 0)) return 'mobile'
  return 'desktop'
}

export function frameId(frame: FrameLike | string | number): string | number {
  if (typeof frame === 'string' || typeof frame === 'number') return frame
  if (frame.id === undefined) throw new Error('Frame sin identificador.')
  return frame.id
}

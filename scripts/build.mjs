import { cp, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'site')
const output = resolve(root, 'dist')

await rm(output, { force: true, recursive: true })
await mkdir(output, { recursive: true })
await cp(source, output, { recursive: true })
console.log('FabrickBuild static site generated in dist/')

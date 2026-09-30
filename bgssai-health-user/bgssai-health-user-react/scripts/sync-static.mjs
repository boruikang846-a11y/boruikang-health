import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, join, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const dist = resolve(here, '../dist')
const backend = resolve(here, '../../bgssai-health-user')
const destination = resolve(backend, 'src/main/resources/static')
function assertWithin(parent, child) {
  const path = relative(parent, child)
  if (!path || path.startsWith('..') || isAbsolute(path)) throw new Error('Unsafe build destination')
}
assertWithin(backend, destination)
for (const entry of ['index.html', 'assets']) {
  if (!existsSync(join(dist, entry))) throw new Error('Build output missing: ' + entry)
}
mkdirSync(destination, { recursive: true })
for (const entry of ['index.html', 'assets']) {
  const target = resolve(destination, entry)
  assertWithin(destination, target)
  rmSync(target, { recursive: true, force: true })
  cpSync(join(dist, entry), target, { recursive: true })
}
console.log('Synced user frontend to its Spring Boot static resources')

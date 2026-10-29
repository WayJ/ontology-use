import { readdir, readFile, stat } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import type { Task } from '@ontology-use/core'

export type LoadedPack = {
  packId: string
  tasks: Task[]
  ontologyPaths: string[]
}

type Manifest = {
  id: string
  enabled: boolean
  title?: string
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false
  const t = value as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    (t.type === 'exact' || t.type === 'set' || t.type === 'fields') &&
    typeof t.question === 'string' &&
    'gold' in t
  )
}

function resolveOntologyRefs(packDir: string, refs: string[] | undefined): string[] | undefined {
  if (!refs?.length) return refs
  return refs.map((ref) => (isAbsolute(ref) ? ref : resolve(packDir, ref)))
}

async function loadPackDir(packDir: string): Promise<LoadedPack | null> {
  const manifestPath = join(packDir, 'manifest.json')
  let raw: string
  try {
    raw = await readFile(manifestPath, 'utf8')
  } catch {
    return null
  }
  const manifest = JSON.parse(raw) as Manifest
  if (!manifest.enabled) return null

  const tasksDir = join(packDir, 'tasks')
  const tasks: Task[] = []
  try {
    const taskFiles = (await readdir(tasksDir)).filter((f) => f.endsWith('.json'))
    for (const file of taskFiles.sort()) {
      const task = JSON.parse(await readFile(join(tasksDir, file), 'utf8')) as unknown
      if (!isTask(task)) {
        throw new Error(`Invalid task in ${join(tasksDir, file)}`)
      }
      tasks.push({
        ...task,
        ontologyRefs: resolveOntologyRefs(packDir, task.ontologyRefs),
      })
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') throw err
  }

  const ontologyPaths: string[] = []
  const ontologyDir = join(packDir, 'ontology')
  try {
    const files = await readdir(ontologyDir)
    for (const file of files.sort()) {
      ontologyPaths.push(join(ontologyDir, file))
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') throw err
  }

  return { packId: manifest.id, tasks, ontologyPaths }
}

export async function loadEnabledPacks(rootDir: string): Promise<LoadedPack[]> {
  const entries = await readdir(rootDir)
  const packs: LoadedPack[] = []
  for (const name of entries.sort()) {
    const path = join(rootDir, name)
    const s = await stat(path)
    if (!s.isDirectory()) continue
    const loaded = await loadPackDir(path)
    if (loaded) packs.push(loaded)
  }
  return packs
}

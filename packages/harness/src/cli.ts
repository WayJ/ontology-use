import { writeFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { allMethods } from '@ontology-use/methods'
import type { LlmReasoner } from '@ontology-use/reasoners-llm'
import { LLM_MAX_CONCURRENCY } from '@ontology-use/reasoners-llm'
import { runEval } from './eval.js'
import { assertReasonerRunnable, createReasoner } from './createReasoner.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')

const DEFAULT_BASE_URL = 'https://api.minimax.cn/v1'
const DEFAULT_MODEL = 'MiniMax-M3.1-Flash'

/** YYYYMMDDTHHMMSS in local time for llm outDir stamps. */
export function formatLlmRunStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  )
}

export function parseArgs(argv: string[]) {
  let packsRoot = resolve(repoRoot, 'packages')
  let outDir: string | undefined
  let reasonerKind = 'mock'
  let strictMock = false
  let outExplicit = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a === '--packs' && argv[i + 1]) {
      packsRoot = resolve(argv[++i]!)
    } else if (a === '--out' && argv[i + 1]) {
      outDir = resolve(argv[++i]!)
      outExplicit = true
    } else if (a.startsWith('--reasoner=')) {
      reasonerKind = a.slice('--reasoner='.length)
    } else if (a === '--reasoner' && argv[i + 1]) {
      reasonerKind = argv[++i]!
    } else if (a === '--strict-mock') {
      strictMock = true
    }
  }
  if (!outExplicit) {
    if (reasonerKind === 'llm') {
      outDir = resolve(repoRoot, `results/llm-${formatLlmRunStamp()}`)
    } else if (strictMock) {
      outDir = resolve(repoRoot, 'results/strict')
    } else {
      outDir = resolve(repoRoot, 'results')
    }
  }
  return { packsRoot, outDir: outDir!, reasonerKind, strictMock }
}

async function main() {
  const { packsRoot, outDir, reasonerKind, strictMock } = parseArgs(
    process.argv.slice(2),
  )

  // Fail before runEval so default results/ are never polluted without a key.
  try {
    assertReasonerRunnable(reasonerKind)
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }

  const methods = allMethods({ strictMock })
  const reasoner = createReasoner(reasonerKind)
  const startedAt = new Date().toISOString()

  const results = await runEval({ packsRoot, methods, reasoner, outDir })

  if (reasonerKind === 'llm') {
    const baseUrl = (
      process.env.MINIMAX_BASE_URL ?? DEFAULT_BASE_URL
    ).replace(/\/+$/, '')
    const model = process.env.MINIMAX_MODEL ?? DEFAULT_MODEL
    const meta: Record<string, unknown> = {
      provider: 'minimax',
      baseUrl,
      model,
      startedAt,
      maxConcurrency: LLM_MAX_CONCURRENCY,
    }
    if (
      reasoner &&
      typeof (reasoner as LlmReasoner).getUsageTotals === 'function'
    ) {
      meta.usageTotals = (reasoner as LlmReasoner).getUsageTotals()
    }
    await writeFile(
      join(outDir, 'meta.json'),
      JSON.stringify(meta, null, 2) + '\n',
    )
  }

  console.log(
    `Wrote ${results.length} score rows to ${outDir}/latest.md and latest.json (${methods.length} methods, strictMock=${strictMock})`,
  )
}

const entry = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : ''
if (import.meta.url === entry) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

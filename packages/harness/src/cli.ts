import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMockReasoner } from '@ontology-use/reasoners-mock'
import type { Method } from '@ontology-use/core'
import { runEval } from './eval.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')

function parseArgs(argv: string[]) {
  let packsRoot = resolve(repoRoot, 'packages')
  let outDir = resolve(repoRoot, 'results')
  let reasonerKind = 'mock'
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a === '--packs' && argv[i + 1]) {
      packsRoot = resolve(argv[++i]!)
    } else if (a === '--out' && argv[i + 1]) {
      outDir = resolve(argv[++i]!)
    } else if (a.startsWith('--reasoner=')) {
      reasonerKind = a.slice('--reasoner='.length)
    } else if (a === '--reasoner' && argv[i + 1]) {
      reasonerKind = argv[++i]!
    }
  }
  return { packsRoot, outDir, reasonerKind }
}

async function main() {
  const { packsRoot, outDir, reasonerKind } = parseArgs(process.argv.slice(2))
  if (reasonerKind !== 'mock') {
    console.error(
      `Reasoner "${reasonerKind}" is not implemented in phase 1. Use --reasoner=mock.`,
    )
    process.exit(1)
  }

  // Methods registry filled in Task 6; empty array is allowed for CLI smoke.
  const methods: Method[] = []
  const reasoner = createMockReasoner()
  const results = await runEval({ packsRoot, methods, reasoner, outDir })
  console.log(
    `Wrote ${results.length} score rows to ${outDir}/latest.md and latest.json (${methods.length} methods)`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

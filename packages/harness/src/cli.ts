import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMockReasoner } from '@ontology-use/reasoners-mock'
import { allMethods } from '@ontology-use/methods'
import { runEval } from './eval.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')

function parseArgs(argv: string[]) {
  let packsRoot = resolve(repoRoot, 'packages')
  let outDir = resolve(repoRoot, 'results')
  let reasonerKind = 'mock'
  let strictMock = false
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
    } else if (a === '--strict-mock') {
      strictMock = true
    }
  }
  return { packsRoot, outDir, reasonerKind, strictMock }
}

async function main() {
  const { packsRoot, outDir, reasonerKind, strictMock } = parseArgs(
    process.argv.slice(2),
  )
  if (reasonerKind !== 'mock') {
    console.error(
      `Reasoner "${reasonerKind}" is not implemented in phase 1. Use --reasoner=mock.`,
    )
    process.exit(1)
  }

  const methods = allMethods({ strictMock })
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

import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { allMethods } from '@ontology-use/methods'
import { runEval } from './eval.js'
import { assertReasonerRunnable, createReasoner } from './createReasoner.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')

function parseArgs(argv: string[]) {
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
    outDir = strictMock
      ? resolve(repoRoot, 'results/strict')
      : resolve(repoRoot, 'results')
  }
  return { packsRoot, outDir: outDir!, reasonerKind, strictMock }
}

async function main() {
  const { packsRoot, outDir, reasonerKind, strictMock } = parseArgs(
    process.argv.slice(2),
  )

  // Fail before runEval so default results/ are never polluted by llm stubs.
  try {
    assertReasonerRunnable(reasonerKind)
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }

  const methods = allMethods({ strictMock })
  const reasoner = createReasoner(reasonerKind)
  const results = await runEval({ packsRoot, methods, reasoner, outDir })
  console.log(
    `Wrote ${results.length} score rows to ${outDir}/latest.md and latest.json (${methods.length} methods, strictMock=${strictMock})`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

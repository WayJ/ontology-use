import type { Answer, Method } from '@ontology-use/core'
import { runWithPrompt, type MethodOpts } from './shared.js'

export function createM9(opts: MethodOpts = {}): Method {
  return {
    id: 'M9',
    name: 'GovernedWrite',
    run: (task, reasoner) =>
      runWithPrompt(
        task,
        reasoner,
        opts,
        (ontology) =>
          `PROPOSE_WRITE_ONLY\nONTOLOGY:\n${ontology.slice(0, 400)}\n\nQUESTION:\n${task.question}\n`,
        (answer): Answer => ({
          ...answer,
          meta: {
            ...answer.meta,
            governedWrite: {
              proposal: true,
              value: answer.value,
              applied: false,
            },
          },
        }),
      ),
  }
}

import type { Answer, Method } from '@ontology-use/core'
import { runWithPrompt, type MethodOpts } from './shared.js'

export function createM5(opts: MethodOpts = {}): Method {
  return {
    id: 'M5',
    name: 'ToolMCP',
    run: (task, reasoner) =>
      runWithPrompt(
        task,
        reasoner,
        opts,
        (ontology) =>
          `TOOLS: lookup_entity, list_types\nONTOLOGY_SNIPPET:\n${ontology.slice(0, 500)}\n\nQUESTION:\n${task.question}\n`,
        (answer): Answer => ({
          ...answer,
          meta: {
            ...answer.meta,
            tools: ['lookup_entity', 'list_types'],
          },
        }),
      ),
  }
}

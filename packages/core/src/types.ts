export type MethodId =
  | 'M0'
  | 'M1'
  | 'M2'
  | 'M3'
  | 'M4'
  | 'M5'
  | 'M6'
  | 'M7'
  | 'M8'
  | 'M9'
  | 'M10'

export type Task = {
  id: string
  type: 'exact' | 'set' | 'fields'
  question: string
  gold: string | string[] | Record<string, string>
  ontologyRefs?: string[]
}

export type Answer = {
  value: string | string[] | Record<string, string>
  meta?: Record<string, unknown>
}

export type Reasoner = {
  id: string
  complete(prompt: string): Promise<string>
}

export type Method = {
  id: MethodId
  name: string
  run(task: Task, reasoner: Reasoner): Promise<Answer>
}

export type ScoreResult = {
  methodId: MethodId
  taskId: string
  ok: boolean
  score: number
  error?: string
  /** Truncated JSON/string preview of answer.value; optional */
  answerPreview?: string
  /** Length of raw reasoner completion when available */
  rawLength?: number
}

const METHOD_IDS: readonly MethodId[] = [
  'M0',
  'M1',
  'M2',
  'M3',
  'M4',
  'M5',
  'M6',
  'M7',
  'M8',
  'M9',
  'M10',
]

export function isMethodId(value: string): value is MethodId {
  return (METHOD_IDS as readonly string[]).includes(value)
}

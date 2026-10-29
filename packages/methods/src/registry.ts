import type { Method } from '@ontology-use/core'
import { createM0 } from './m0.js'
import { createM1 } from './m1.js'
import { createM2 } from './m2.js'
import { createM3 } from './m3.js'
import { createM4 } from './m4.js'
import { createM5 } from './m5.js'
import { createM6 } from './m6.js'
import { createM7 } from './m7.js'
import { createM8 } from './m8.js'
import { createM9 } from './m9.js'
import { createM10 } from './m10.js'
import type { MethodOpts } from './shared.js'

export type { MethodOpts }

export function allMethods(opts: MethodOpts = {}): Method[] {
  return [
    createM0(opts),
    createM1(opts),
    createM2(opts),
    createM3(opts),
    createM4(opts),
    createM5(opts),
    createM6(opts),
    createM7(opts),
    createM8(opts),
    createM9(opts),
    createM10(opts),
  ]
}

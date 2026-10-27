/**
 * dsh-usage-stats — pure session fold.
 *
 * Turns one session's raw event log into a `SessionAggregate`: token totals,
 * per-local-day buckets, per-model usage, turn/step timing and the latest
 * title. No I/O, no clock: every instant comes from the events themselves, so
 * the same input always folds to the same output.
 *
 * Day keys are `YYYY-MM-DD` in the **host local timezone** (spec §5).
 *
 * @module dsh-usage-stats/host/fold
 */

/** Milliseconds per UTC day, used only for calendar-day ordinals. */
const DAY_MS = 86_400_000

/** Separator for composite turn/step keys; never appears in numeric ids. */
const KEY_SEP = '\u0000'

/** Coerce anything to a finite number, defaulting to 0. */
const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

/**
 * Local-timezone `YYYY-MM-DD` key for one epoch-ms instant.
 * @param {number} ts epoch milliseconds.
 * @returns {string} day key, or `''` when `ts` is not finite.
 */
export function dayKey(ts) {
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return ''
  const date = new Date(ts)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Shift a `YYYY-MM-DD` key by whole local calendar days.
 *
 * Local `Date` arithmetic is used on purpose: month/year rollover and DST days
 * (23h/25h) both land on the correct calendar day, which UTC arithmetic would
 * get wrong for the local-day contract.
 *
 * @param {string} key day key to shift.
 * @param {number} deltaDays signed whole days.
 * @returns {string} shifted day key, or `''` when `key` is malformed.
 */
export function dayKeyAdd(key, deltaDays) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key))
  if (parts === null) return ''
  const shift = Number.isFinite(deltaDays) ? Math.trunc(deltaDays) : 0
  const date = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]) + shift)
  return dayKey(date.getTime())
}

/**
 * Absolute day ordinal for a `YYYY-MM-DD` key (UTC-anchored, TZ independent).
 * Used to test calendar adjacency between two local day keys.
 *
 * @param {string} key day key.
 * @returns {number} ordinal, or `NaN` when `key` is malformed.
 */
export function dayKeyOrdinal(key) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key))
  if (parts === null) return Number.NaN
  return Math.round(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) / DAY_MS)
}

/** Read a `usage` object into disjoint counters plus an authoritative total. */
function readUsage(usage) {
  if (usage === null || typeof usage !== 'object') return null
  const inputTokens = num(usage.inputTokens)
  const outputTokens = num(usage.outputTokens)
  const cacheReadTokens = num(usage.cacheReadTokens)
  const cacheWriteTokens = num(usage.cacheWriteTokens)
  // `totalTokens` is optional in the provider contract; when a provider omits
  // it, the four disjoint buckets are the authoritative aggregate.
  const totalTokens = typeof usage.totalTokens === 'number' && Number.isFinite(usage.totalTokens)
    ? usage.totalTokens
    : inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens
  return { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, totalTokens }
}

/** Lazily materialise the per-day bucket for `key`. */
function dayBucket(aggregate, key) {
  if (key === '') return undefined
  let bucket = aggregate.days[key]
  if (bucket === undefined) {
    bucket = { tokens: 0, messages: 0, turns: 0 }
    aggregate.days[key] = bucket
  }
  return bucket
}

/** Composite key for one `(turn, step)` pair. */
function stepKey(data) {
  if (data === null || typeof data !== 'object') return undefined
  if (data.turn === undefined || data.step === undefined) return undefined
  return `${String(data.turn)}${KEY_SEP}${String(data.step)}`
}

/**
 * Build a zeroed aggregate for one session header.
 * @param {object} [header] `SessionHeader` from `sessionQuery`.
 * @returns {object} `SessionAggregate` with no events folded in yet.
 */
export function createSessionAggregate(header) {
  const source = header !== null && typeof header === 'object' ? header : {}
  const createdAt = num(source.createdAt)
  return {
    id: typeof source.id === 'string' ? source.id : '',
    cwd: typeof source.cwd === 'string' && source.cwd !== '' ? source.cwd : undefined,
    createdAt,
    origin: typeof source.origin === 'string' ? source.origin : undefined,
    delegationDepth: num(source.delegationDepth),
    title: undefined,
    tokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    messages: 0,
    turns: 0,
    firstEventAt: createdAt,
    lastEventAt: createdAt,
    chatMs: 0,
    turnMs: 0,
    stepMs: 0,
    stepCount: 0,
    models: {},
    days: {},
    eventCount: 0,
    lastSeq: -1,
  }
}

/**
 * Fold one raw event into an aggregate (mutating it).
 *
 * Shared by the batch fold and the live `assistant/message` increment path, so
 * both compute token/model/day deltas with exactly the same rules.
 *
 * @param {object} aggregate aggregate to mutate.
 * @param {object} event raw `SessionEvent` (`{type, seq, time, data}`).
 * @param {{turnStarts?: Map<any, number>, stepStarts?: Map<string, number>}} [state]
 *   pairing state for turn/step durations; omit when folding isolated events.
 * @returns {object} the same aggregate.
 */
export function applyEvent(aggregate, event, state) {
  if (aggregate === null || typeof aggregate !== 'object') return aggregate
  if (event === null || typeof event !== 'object') return aggregate
  const type = event.type
  // The header line (`type: 'session'`) is storage metadata, never a log event.
  if (typeof type !== 'string' || type === 'session') return aggregate

  const data = event.data !== null && typeof event.data === 'object' ? event.data : {}
  const time = Number.isFinite(event.time) ? event.time : undefined
  const seq = Number.isFinite(event.seq) ? event.seq : undefined
  const turnStarts = state?.turnStarts
  const stepStarts = state?.stepStarts

  aggregate.eventCount += 1
  if (seq !== undefined && seq > aggregate.lastSeq) aggregate.lastSeq = seq
  if (time !== undefined) {
    if (aggregate.firstEventAt === undefined || time < aggregate.firstEventAt) aggregate.firstEventAt = time
    if (aggregate.lastEventAt === undefined || time > aggregate.lastEventAt) aggregate.lastEventAt = time
  }

  switch (type) {
    case 'assistant/message': {
      const usage = readUsage(data.usage)
      if (usage !== null) {
        aggregate.tokens += usage.totalTokens
        aggregate.inputTokens += usage.inputTokens
        aggregate.outputTokens += usage.outputTokens
        aggregate.cacheReadTokens += usage.cacheReadTokens
        aggregate.cacheWriteTokens += usage.cacheWriteTokens
        const bucket = time === undefined ? undefined : dayBucket(aggregate, dayKey(time))
        if (bucket !== undefined) bucket.tokens += usage.totalTokens
      }
      const source = data.message !== null && typeof data.message === 'object' ? data.message.source : undefined
      const provider = typeof source?.provider === 'string' && source.provider !== '' ? source.provider : 'unknown'
      const model = typeof source?.model === 'string' && source.model !== '' ? source.model : 'unknown'
      const key = `${provider}/${model}`
      let entry = aggregate.models[key]
      if (entry === undefined) {
        entry = { provider, model, tokens: 0, messages: 0 }
        aggregate.models[key] = entry
      }
      entry.messages += 1
      if (usage !== null) entry.tokens += usage.totalTokens
      break
    }
    case 'user/message': {
      // Only a real user turn counts; runtime/time/skill context injections are
      // user-role messages but not "轮消息" (spec §5).
      if (data.source !== null && typeof data.source === 'object' && data.source.kind === 'user') {
        aggregate.messages += 1
        const bucket = time === undefined ? undefined : dayBucket(aggregate, dayKey(time))
        if (bucket !== undefined) bucket.messages += 1
      }
      break
    }
    case 'turn/start': {
      aggregate.turns += 1
      const bucket = time === undefined ? undefined : dayBucket(aggregate, dayKey(time))
      if (bucket !== undefined) bucket.turns += 1
      if (turnStarts instanceof Map && data.turn !== undefined && time !== undefined) {
        turnStarts.set(data.turn, time)
      }
      break
    }
    case 'turn/end': {
      if (turnStarts instanceof Map && data.turn !== undefined && time !== undefined) {
        const startedAt = turnStarts.get(data.turn)
        if (startedAt !== undefined) {
          aggregate.turnMs += Math.max(0, time - startedAt)
          turnStarts.delete(data.turn)
        }
      }
      aggregate.chatMs = aggregate.stepCount > 0 ? aggregate.stepMs : aggregate.turnMs
      break
    }
    case 'step/start': {
      aggregate.stepCount += 1
      if (stepStarts instanceof Map && time !== undefined) {
        const key = stepKey(data)
        if (key !== undefined) stepStarts.set(key, time)
      }
      break
    }
    case 'step/end': {
      if (stepStarts instanceof Map && time !== undefined) {
        const key = stepKey(data)
        const startedAt = key === undefined ? undefined : stepStarts.get(key)
        if (startedAt !== undefined) {
          aggregate.stepMs += Math.max(0, time - startedAt)
          stepStarts.delete(key)
        }
      }
      aggregate.chatMs = aggregate.stepCount > 0 ? aggregate.stepMs : aggregate.turnMs
      break
    }
    case 'session/title': {
      if (typeof data.title === 'string') aggregate.title = data.title
      break
    }
    default:
      break
  }
  return aggregate
}

/**
 * Fold one session's complete raw event log into a `SessionAggregate`.
 *
 * Events are the **raw** log returned by `sessionQuery.readSession`, which may
 * begin with a fork-inherited prefix; `inheritedEventCount` events are skipped
 * so a fork never double-counts its parent's tokens (spec §5 / plan Task 2).
 *
 * @param {object} header `SessionHeader`.
 * @param {object[]} events raw `SessionEvent[]`.
 * @param {number} [inheritedEventCount] leading events to ignore.
 * @returns {object} `SessionAggregate`.
 */
export function foldSession(header, events, inheritedEventCount = 0) {
  const aggregate = createSessionAggregate(header)
  const list = Array.isArray(events) ? events : []
  const skip = Number.isFinite(inheritedEventCount) && inheritedEventCount > 0
    ? Math.trunc(inheritedEventCount)
    : 0
  const owned = list.filter((event) => event !== null && typeof event === 'object' && event.type !== 'session').slice(skip)
  const state = { turnStarts: new Map(), stepStarts: new Map() }
  for (const event of owned) applyEvent(aggregate, event, state)

  if (aggregate.firstEventAt === undefined) aggregate.firstEventAt = aggregate.createdAt
  if (aggregate.lastEventAt === undefined) aggregate.lastEventAt = aggregate.createdAt
  aggregate.chatMs = aggregate.stepCount > 0 ? aggregate.stepMs : aggregate.turnMs
  return aggregate
}

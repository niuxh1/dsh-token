/**
 * dsh-usage-stats — pure snapshot aggregation.
 *
 * Merges per-session `SessionAggregate`s into the `UsageSnapshot` the settings
 * page renders (spec §6): totals, peak day, streaks, heatmap cells, the daily
 * trend series, per-model shares, workspace rollups and the session list.
 *
 * Pure: no I/O and no clock. `options.now` is required so the caller owns the
 * "today" that streaks and the heatmap window are anchored to.
 *
 * Metric definitions (spec §5):
 * - tokens = Σ `usage.totalTokens`
 * - peak day = max tokens over one **local calendar day** (all history)
 * - chat duration = active time: Σ(step/end − step/start); sessions without any
 *   step event fall back to Σ(turn/end − turn/start), and sessions with neither
 *   report 0 (no explicable active time — never a first→last event span)
 *   (lead ruling 2026-10-27)
 * - current streak = consecutive token days counted back from today; when today
 *   has no usage the count starts at yesterday (GitHub rule)
 * - messages = `user/message` events with `source.kind === "user"`
 *
 * @module dsh-usage-stats/host/aggregate
 */

import { dayKey, dayKeyAdd, dayKeyOrdinal } from './fold.js'

/** Default range when the caller sends something unsupported. */
const DEFAULT_RANGE_DAYS = 30

/** Longest window the heatmap / trend series may cover ("all" range). */
const MAX_WINDOW_DAYS = 365

/** Heatmap modes the client can request; `mode` is echoed, cells stay daily. */
const HEATMAP_MODES = new Set(['day', 'week', 'cumulative'])

/** Coerce anything to a finite number, defaulting to 0. */
const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

/** Last path segment of a cwd, splitting on both separators (OS independent). */
function workspaceLabel(cwd) {
  const parts = String(cwd).split(/[\\/]+/).filter((part) => part !== '')
  return parts.length === 0 ? String(cwd) : parts[parts.length - 1]
}

/**
 * Active chat duration for one session (lead ruling: step-based).
 *
 * A session with neither step nor turn events has no explicable chat duration
 * (legacy or empty logs), so it reports 0 instead of a first→last event span:
 * a span would count hours of idling as conversation and skew the headline
 * "longest chat" card (lead ruling 2026-10-27).
 *
 * @param {object} aggregate session aggregate.
 * @returns {number} milliseconds.
 */
function sessionDuration(aggregate) {
  const chatMs = num(aggregate.chatMs)
  return chatMs > 0 ? chatMs : 0
}

/** Normalise the caller's options into the snapshot contract. */
function normalizeOptions(options) {
  const input = options !== null && typeof options === 'object' ? options : {}
  const now = input.now
  if (typeof now !== 'number' || !Number.isFinite(now)) {
    throw new TypeError('buildSnapshot requires options.now (epoch ms); the aggregate layer never reads the clock itself')
  }
  const scope = typeof input.scope === 'string' && input.scope !== '' ? input.scope : 'all'
  const rangeDays = input.rangeDays === 0 || input.rangeDays === 7 || input.rangeDays === 30
    ? input.rangeDays
    : DEFAULT_RANGE_DAYS
  const heatmap = HEATMAP_MODES.has(input.heatmap) ? input.heatmap : 'day'
  return { now, scope, rangeDays, heatmap, progress: input.progress }
}

/**
 * Merge every selected session's per-day buckets.
 * @param {object[]} selected aggregates in scope.
 * @returns {Map<string, {tokens: number, messages: number, turns: number}>}
 */
function mergeDays(selected) {
  const merged = new Map()
  for (const aggregate of selected) {
    const days = aggregate?.days
    if (days === null || typeof days !== 'object') continue
    for (const [key, bucket] of Object.entries(days)) {
      if (key === '' || bucket === null || typeof bucket !== 'object') continue
      let target = merged.get(key)
      if (target === undefined) {
        target = { tokens: 0, messages: 0, turns: 0 }
        merged.set(key, target)
      }
      target.tokens += num(bucket.tokens)
      target.messages += num(bucket.messages)
      target.turns += num(bucket.turns)
    }
  }
  return merged
}

/**
 * Quantile thresholds over the non-zero cell values, p20/p40/p60/p80.
 * @param {number[]} values cell token counts.
 * @returns {number[]} four ascending thresholds (empty when all cells are 0).
 */
function levelThresholds(values) {
  const nonZero = values.filter((value) => value > 0).sort((a, b) => a - b)
  if (nonZero.length === 0) return []
  const quantile = (p) => nonZero[Math.min(nonZero.length - 1, Math.floor(nonZero.length * p))]
  return [quantile(0.2), quantile(0.4), quantile(0.6), quantile(0.8)]
}

/**
 * Build the render-ready usage snapshot.
 *
 * @param {object[]} aggregates `SessionAggregate[]` (any order).
 * @param {object} options
 * @param {number} options.now epoch ms of "now" (required).
 * @param {"all"|string} [options.scope] `"all"` or an exact cwd.
 * @param {7|30|0} [options.rangeDays] trend/heatmap window; `0` means all (capped at 365d).
 * @param {"day"|"week"|"cumulative"} [options.heatmap] echoed heatmap mode.
 * @param {{warm: boolean, done: number, total: number}} [options.progress] warm-up progress.
 * @returns {object} `UsageSnapshot` (spec §6).
 */
export function buildSnapshot(aggregates, options) {
  const { now, scope, rangeDays, heatmap, progress } = normalizeOptions(options)
  const all = Array.isArray(aggregates) ? aggregates.filter((item) => item !== null && typeof item === 'object') : []
  const selected = scope === 'all' ? all : all.filter((aggregate) => aggregate.cwd === scope)

  const totals = {
    tokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    peakDayTokens: 0,
    peakDay: null,
    longestChatMs: 0,
    longestChatSessionId: null,
    currentStreakDays: 0,
    longestStreakDays: 0,
    messages: 0,
    turns: 0,
    sessions: selected.length,
  }

  const mergedDays = mergeDays(selected)
  const modelTotals = new Map()
  const workspaceTotals = new Map()
  const sessionRows = []

  for (const aggregate of selected) {
    totals.tokens += num(aggregate.tokens)
    totals.inputTokens += num(aggregate.inputTokens)
    totals.outputTokens += num(aggregate.outputTokens)
    totals.cacheReadTokens += num(aggregate.cacheReadTokens)
    totals.cacheWriteTokens += num(aggregate.cacheWriteTokens)
    totals.messages += num(aggregate.messages)
    totals.turns += num(aggregate.turns)

    const duration = sessionDuration(aggregate)
    if (duration > totals.longestChatMs) {
      totals.longestChatMs = duration
      totals.longestChatSessionId = typeof aggregate.id === 'string' ? aggregate.id : null
    }

    const models = aggregate.models
    if (models !== null && typeof models === 'object') {
      for (const entry of Object.values(models)) {
        if (entry === null || typeof entry !== 'object') continue
        const provider = typeof entry.provider === 'string' ? entry.provider : 'unknown'
        const model = typeof entry.model === 'string' ? entry.model : 'unknown'
        const key = `${provider}/${model}`
        let target = modelTotals.get(key)
        if (target === undefined) {
          target = { provider, model, tokens: 0, messages: 0 }
          modelTotals.set(key, target)
        }
        target.tokens += num(entry.tokens)
        target.messages += num(entry.messages)
      }
    }

    const cwd = typeof aggregate.cwd === 'string' ? aggregate.cwd : ''
    if (cwd !== '') {
      let workspace = workspaceTotals.get(cwd)
      if (workspace === undefined) {
        workspace = { cwd, label: workspaceLabel(cwd), sessions: 0, tokens: 0, lastActiveAt: 0 }
        workspaceTotals.set(cwd, workspace)
      }
      workspace.sessions += 1
      workspace.tokens += num(aggregate.tokens)
      workspace.lastActiveAt = Math.max(workspace.lastActiveAt, num(aggregate.lastEventAt))
    }

    const lastActivityAt = Math.max(num(aggregate.lastEventAt), num(aggregate.createdAt))
    sessionRows.push({
      id: typeof aggregate.id === 'string' ? aggregate.id : '',
      title: typeof aggregate.title === 'string' ? aggregate.title : '',
      cwd: typeof aggregate.cwd === 'string' && aggregate.cwd !== '' ? aggregate.cwd : undefined,
      createdAt: num(aggregate.createdAt),
      lastActivityAt,
      tokens: num(aggregate.tokens),
      messages: num(aggregate.messages),
      durationMs: duration,
    })
  }

  // Peak day: all history, not just the requested window. Ties resolve to the
  // earliest calendar day so the value is stable regardless of input order.
  const dayKeys = [...mergedDays.keys()].sort()
  for (const key of dayKeys) {
    const tokens = mergedDays.get(key).tokens
    if (tokens > totals.peakDayTokens) {
      totals.peakDayTokens = tokens
      totals.peakDay = key
    }
  }

  // Streaks operate on days that actually consumed tokens.
  const activeDays = dayKeys.filter((key) => mergedDays.get(key).tokens > 0)
  const today = dayKey(now)
  const hasTokens = (key) => (mergedDays.get(key)?.tokens ?? 0) > 0
  let cursor = hasTokens(today) ? today : dayKeyAdd(today, -1)
  let currentStreakDays = 0
  const guard = activeDays.length + 2
  while (currentStreakDays < guard && hasTokens(cursor)) {
    currentStreakDays += 1
    cursor = dayKeyAdd(cursor, -1)
  }
  totals.currentStreakDays = currentStreakDays

  let longestStreakDays = 0
  let runLength = 0
  let previousOrdinal = Number.NaN
  for (const key of activeDays) {
    const ordinal = dayKeyOrdinal(key)
    runLength = ordinal === previousOrdinal + 1 ? runLength + 1 : 1
    if (runLength > longestStreakDays) longestStreakDays = runLength
    previousOrdinal = ordinal
  }
  totals.longestStreakDays = longestStreakDays

  // Window: rangeDays, or the full heatmap horizon for "all".
  const windowDays = rangeDays > 0 ? rangeDays : MAX_WINDOW_DAYS
  const end = today
  const start = dayKeyAdd(end, -(windowDays - 1))
  const daily = []
  for (let offset = 0; offset < windowDays; offset += 1) {
    const date = dayKeyAdd(start, offset)
    const bucket = mergedDays.get(date)
    daily.push({
      date,
      tokens: bucket === undefined ? 0 : bucket.tokens,
      messages: bucket === undefined ? 0 : bucket.messages,
      turns: bucket === undefined ? 0 : bucket.turns,
    })
  }

  const thresholds = levelThresholds(daily.map((entry) => entry.tokens))
  const levelOf = (tokens) => {
    if (!(tokens > 0)) return 0
    let level = 1
    for (const threshold of thresholds) {
      if (tokens > threshold) level += 1
    }
    return Math.min(4, level)
  }
  const max = daily.reduce((highest, entry) => Math.max(highest, entry.tokens), 0)
  const cells = daily.map((entry) => ({
    date: entry.date,
    tokens: entry.tokens,
    messages: entry.messages,
    level: levelOf(entry.tokens),
  }))

  const models = [...modelTotals.values()]
    .sort((a, b) => b.tokens - a.tokens || a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model))
    .map((entry) => ({
      provider: entry.provider,
      model: entry.model,
      tokens: entry.tokens,
      messages: entry.messages,
      share: totals.tokens > 0 ? entry.tokens / totals.tokens : 0,
    }))

  const workspaces = [...workspaceTotals.values()]
    .sort((a, b) => b.tokens - a.tokens || a.cwd.localeCompare(b.cwd))

  sessionRows.sort((a, b) => b.lastActivityAt - a.lastActivityAt || a.id.localeCompare(b.id))

  const warm = progress !== null && typeof progress === 'object' && typeof progress.warm === 'boolean'
    ? progress.warm
    : true
  const done = progress !== null && typeof progress === 'object' ? Math.max(0, Math.trunc(num(progress.done))) : all.length
  const total = progress !== null && typeof progress === 'object' ? Math.max(0, Math.trunc(num(progress.total))) : all.length

  return {
    generatedAt: now,
    scope: scope === 'all' ? { kind: 'all' } : { kind: 'workspace', cwd: scope },
    totals,
    heatmap: { mode: heatmap, start, end, max, cells },
    daily,
    models,
    workspaces,
    sessions: sessionRows,
    progress: { warm, done, total },
  }
}

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildSnapshot } from '../src/host/aggregate.js'
import { dayKeyAdd } from '../src/host/fold.js'

/** Local-time epoch for a calendar date (TZ independent by construction). */
const at = (year, month, day, hour = 12, minute = 0) => new Date(year, month - 1, day, hour, minute, 0).getTime()

/** Fixed "now": local noon on 2026-10-27. */
const NOW = at(2026, 10, 27)

/**
 * Build a SessionAggregate-shaped fixture without going through the fold, so
 * the aggregate contract is tested independently from the event vocabulary.
 */
function makeAggregate({
  id,
  cwd,
  dayTokens = {},
  dayMessages = {},
  models = [],
  chatMs = 0,
  turnMs = 0,
  stepCount = 0,
  turns = 0,
  messages = 0,
  firstEventAt = 0,
  lastEventAt = 0,
  createdAt = 0,
  title = `标题 ${id}`,
}) {
  const days = {}
  let tokens = 0
  for (const [key, value] of Object.entries(dayTokens)) {
    days[key] = { tokens: value, messages: dayMessages[key] ?? 0, turns: 0 }
    tokens += value
  }
  const modelMap = {}
  for (const entry of models) {
    modelMap[`${entry.provider}/${entry.model}`] = {
      provider: entry.provider,
      model: entry.model,
      tokens: entry.tokens,
      messages: entry.messages ?? 1,
    }
  }
  return {
    id,
    cwd,
    createdAt,
    origin: undefined,
    delegationDepth: 0,
    title,
    tokens,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    messages,
    turns,
    firstEventAt,
    lastEventAt,
    chatMs,
    turnMs,
    stepMs: chatMs,
    stepCount,
    models: modelMap,
    days,
    eventCount: 5,
    lastSeq: 4,
  }
}

/** Three sessions across five days, two workspaces. */
function makeCorpus() {
  const s1 = makeAggregate({
    id: 's1',
    cwd: 'C:\\workspaces\\demo-app',
    dayTokens: { '2026-10-21': 100, '2026-10-22': 200, '2026-10-23': 300 },
    dayMessages: { '2026-10-21': 1, '2026-10-22': 1 },
    models: [{ provider: 'p', model: 'm1', tokens: 600, messages: 3 }],
    chatMs: 5000,
    turnMs: 5000,
    stepCount: 3,
    turns: 3,
    messages: 2,
    firstEventAt: at(2026, 10, 21, 9),
    lastEventAt: at(2026, 10, 23, 18),
    createdAt: at(2026, 10, 21, 9),
  })
  const s2 = makeAggregate({
    id: 's2',
    cwd: 'C:\\workspaces\\demo-api',
    dayTokens: { '2026-10-26': 400, '2026-10-27': 50 },
    models: [{ provider: 'p', model: 'm2', tokens: 450, messages: 2 }],
    chatMs: 9000,
    turnMs: 40_000,
    stepCount: 2,
    turns: 2,
    messages: 1,
    firstEventAt: at(2026, 10, 26, 9),
    lastEventAt: at(2026, 10, 27, 11),
    createdAt: at(2026, 10, 26, 9),
  })
  const s3 = makeAggregate({
    id: 's3',
    cwd: 'C:\\workspaces\\demo-app',
    dayTokens: { '2026-10-27': 25 },
    models: [{ provider: 'p', model: 'm1', tokens: 25, messages: 1 }],
    chatMs: 1000,
    turnMs: 1000,
    stepCount: 1,
    turns: 1,
    messages: 1,
    firstEventAt: at(2026, 10, 27, 10),
    lastEventAt: at(2026, 10, 27, 10, 30),
    createdAt: at(2026, 10, 27, 10),
  })
  return [s2, s1, s3] // newest-first, like listSessions()
}

test('buildSnapshot sums totals, peak day, streaks and model shares', () => {
  const snapshot = buildSnapshot(makeCorpus(), { now: NOW, scope: 'all', rangeDays: 7, heatmap: 'day' })

  assert.equal(snapshot.generatedAt, NOW)
  assert.deepEqual(snapshot.scope, { kind: 'all' })

  assert.equal(snapshot.totals.tokens, 1075)
  assert.equal(snapshot.totals.messages, 4)
  assert.equal(snapshot.totals.turns, 6)
  assert.equal(snapshot.totals.sessions, 3)

  assert.equal(snapshot.totals.peakDayTokens, 400)
  assert.equal(snapshot.totals.peakDay, '2026-10-26')

  // today (10-27) has 75 tokens, 10-26 has 400, 10-25 is empty → 2
  assert.equal(snapshot.totals.currentStreakDays, 2)
  // 10-21 → 10-22 → 10-23
  assert.equal(snapshot.totals.longestStreakDays, 3)

  assert.equal(snapshot.totals.longestChatMs, 9000)
  assert.equal(snapshot.totals.longestChatSessionId, 's2')
})

test('buildSnapshot emits a contiguous 7-day trend series with zero fill', () => {
  const snapshot = buildSnapshot(makeCorpus(), { now: NOW, rangeDays: 7 })

  assert.equal(snapshot.daily.length, 7)
  assert.deepEqual(snapshot.daily.map((entry) => entry.date), [
    '2026-10-21',
    '2026-10-22',
    '2026-10-23',
    '2026-10-24',
    '2026-10-25',
    '2026-10-26',
    '2026-10-27',
  ])
  assert.deepEqual(snapshot.daily.map((entry) => entry.tokens), [100, 200, 300, 0, 0, 400, 75])
  assert.equal(snapshot.daily[0].messages, 1)
  assert.equal(snapshot.heatmap.start, '2026-10-21')
  assert.equal(snapshot.heatmap.end, '2026-10-27')
  assert.equal(snapshot.heatmap.max, 400)
  assert.equal(snapshot.heatmap.mode, 'day')
})

test('buildSnapshot grades heatmap cells with p20/p40/p60/p80 of non-zero values', () => {
  const snapshot = buildSnapshot(makeCorpus(), { now: NOW, rangeDays: 7 })
  const levels = Object.fromEntries(snapshot.heatmap.cells.map((cell) => [cell.date, cell.level]))

  assert.equal(snapshot.heatmap.cells.length, 7)
  assert.equal(levels['2026-10-24'], 0)
  assert.equal(levels['2026-10-25'], 0)
  // Non-zero window values sorted: [75, 100, 200, 300, 400] → thresholds 100/200/300/400.
  assert.equal(levels['2026-10-27'], 1, '75 tokens stays in level 1')
  assert.equal(levels['2026-10-21'], 1, '100 tokens equals p20, so it stays level 1')
  assert.equal(levels['2026-10-22'], 2)
  assert.equal(levels['2026-10-23'], 3)
  assert.equal(levels['2026-10-26'], 4, 'the peak day is the only level-4 cell')
  for (const cell of snapshot.heatmap.cells) {
    assert.ok(cell.level >= 0 && cell.level <= 4, `level out of range: ${cell.level}`)
  }
})

test('buildSnapshot keeps 30-day and all-time windows', () => {
  const thirty = buildSnapshot(makeCorpus(), { now: NOW, rangeDays: 30 })
  assert.equal(thirty.daily.length, 30)
  assert.equal(thirty.daily[0].date, dayKeyAdd('2026-10-27', -29))
  assert.equal(thirty.daily[29].date, '2026-10-27')

  const all = buildSnapshot(makeCorpus(), { now: NOW, rangeDays: 0 })
  assert.equal(all.daily.length, 365)
  assert.equal(all.daily[364].date, '2026-10-27')
  // "all" keeps the full-history peak even though the window is capped
  assert.equal(all.totals.peakDay, '2026-10-26')
})

test('buildSnapshot sorts models by tokens and shares sum to 1', () => {
  const snapshot = buildSnapshot(makeCorpus(), { now: NOW })
  assert.equal(snapshot.models.length, 2)
  assert.equal(snapshot.models[0].model, 'm1')
  assert.equal(snapshot.models[0].tokens, 625)
  assert.equal(snapshot.models[0].messages, 4)
  assert.equal(snapshot.models[1].model, 'm2')
  assert.equal(snapshot.models[1].tokens, 450)
  const shareSum = snapshot.models.reduce((sum, entry) => sum + entry.share, 0)
  assert.ok(Math.abs(shareSum - 1) < 1e-9, `shares must sum to 1, got ${shareSum}`)
})

test('buildSnapshot rolls workspaces up and filters by cwd', () => {
  const all = buildSnapshot(makeCorpus(), { now: NOW })
  assert.equal(all.workspaces.length, 2)
  assert.deepEqual(all.workspaces[0], {
    cwd: 'C:\\workspaces\\demo-app',
    label: 'demo-app',
    sessions: 2,
    tokens: 625,
    lastActiveAt: at(2026, 10, 27, 10, 30),
  })
  assert.equal(all.workspaces[1].label, 'demo-api')
  assert.equal(all.workspaces[1].sessions, 1)

  const scoped = buildSnapshot(makeCorpus(), { now: NOW, scope: 'C:\\workspaces\\demo-app' })
  assert.deepEqual(scoped.scope, { kind: 'workspace', cwd: 'C:\\workspaces\\demo-app' })
  assert.equal(scoped.totals.tokens, 625)
  assert.equal(scoped.totals.sessions, 2)
  assert.equal(scoped.workspaces.length, 1)
  assert.equal(scoped.sessions.length, 2)
  assert.equal(scoped.totals.peakDay, '2026-10-23')
})

test('buildSnapshot lists sessions newest-first with duration', () => {
  const snapshot = buildSnapshot(makeCorpus(), { now: NOW })
  assert.deepEqual(snapshot.sessions.map((entry) => entry.id), ['s2', 's3', 's1'])
  const s2 = snapshot.sessions[0]
  assert.equal(s2.title, '标题 s2')
  assert.equal(s2.tokens, 450)
  assert.equal(s2.messages, 1)
  assert.equal(s2.durationMs, 9000)
  assert.equal(s2.lastActivityAt, at(2026, 10, 27, 11))
})

test('buildSnapshot reports 0 duration for a session without step or turn events', () => {
  const bare = makeAggregate({
    id: 'bare',
    cwd: 'C:\\w\\x',
    dayTokens: { '2026-10-27': 10 },
    firstEventAt: 1000,
    lastEventAt: 6000,
  })
  const snapshot = buildSnapshot([bare], { now: NOW })

  // Lead ruling 2026-10-27: no step and no turn means no explicable active
  // time. The 5s first→last span must NOT be reported as a 5s chat.
  assert.equal(snapshot.sessions[0].durationMs, 0)
  assert.equal(snapshot.totals.longestChatMs, 0)
  assert.equal(snapshot.totals.longestChatSessionId, null)
})

test('buildSnapshot reports 0 duration for an unfinished turn-only session', () => {
  const pending = makeAggregate({
    id: 'pending',
    cwd: 'C:\\w\\x',
    dayTokens: { '2026-10-27': 10 },
    turns: 1,
    stepCount: 0,
    firstEventAt: 1000,
    lastEventAt: 600_000,
  })
  const snapshot = buildSnapshot([pending], { now: NOW })
  assert.equal(snapshot.sessions[0].durationMs, 0)
  assert.equal(snapshot.totals.longestChatMs, 0)
  assert.equal(snapshot.totals.longestChatSessionId, null)
})

test('buildSnapshot handles an empty corpus without NaN', () => {
  const snapshot = buildSnapshot([], { now: NOW, rangeDays: 7, progress: { warm: false, done: 1, total: 3 } })

  assert.equal(snapshot.totals.tokens, 0)
  assert.equal(snapshot.totals.sessions, 0)
  assert.equal(snapshot.totals.peakDay, null)
  assert.equal(snapshot.totals.peakDayTokens, 0)
  assert.equal(snapshot.totals.currentStreakDays, 0)
  assert.equal(snapshot.totals.longestStreakDays, 0)
  assert.equal(snapshot.totals.longestChatSessionId, null)
  assert.deepEqual(snapshot.models, [])
  assert.deepEqual(snapshot.workspaces, [])
  assert.deepEqual(snapshot.sessions, [])
  assert.equal(snapshot.daily.length, 7)
  assert.ok(snapshot.daily.every((entry) => entry.tokens === 0))
  assert.ok(snapshot.heatmap.cells.every((cell) => cell.level === 0))
  assert.equal(snapshot.heatmap.max, 0)
  assert.deepEqual(snapshot.progress, { warm: false, done: 1, total: 3 })
  assert.equal(JSON.stringify(snapshot).includes('NaN'), false)
})

test('buildSnapshot counts a current streak that starts yesterday when today is empty', () => {
  const corpus = [
    makeAggregate({ id: 'a', cwd: 'C:\\w\\a', dayTokens: { '2026-10-24': 5, '2026-10-25': 6, '2026-10-26': 7 } }),
  ]
  const snapshot = buildSnapshot(corpus, { now: NOW })
  assert.equal(snapshot.totals.currentStreakDays, 3, 'GitHub rule: today empty → count back from yesterday')
  assert.equal(snapshot.totals.longestStreakDays, 3)
})

test('buildSnapshot requires an injected now', () => {
  assert.throws(() => buildSnapshot([], {}), /requires options\.now/)
  assert.throws(() => buildSnapshot([], undefined), /requires options\.now/)
})

test('buildSnapshot echoes the requested heatmap mode but keeps daily cells', () => {
  const weekly = buildSnapshot(makeCorpus(), { now: NOW, rangeDays: 30, heatmap: 'week' })
  assert.equal(weekly.heatmap.mode, 'week')
  assert.equal(weekly.heatmap.cells.length, 30)
  const cumulative = buildSnapshot(makeCorpus(), { now: NOW, heatmap: 'cumulative' })
  assert.equal(cumulative.heatmap.mode, 'cumulative')
})

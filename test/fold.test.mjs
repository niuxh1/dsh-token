import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

import {
  applyEvent,
  createSessionAggregate,
  dayKey,
  dayKeyAdd,
  dayKeyOrdinal,
  foldSession,
} from '../src/host/fold.js'

const fixtureUrl = new URL('./fixtures/session-basic.json', import.meta.url)
const fixture = JSON.parse(readFileSync(fileURLToPath(fixtureUrl), 'utf8'))

/** Local-timezone YYYY-MM-DD key, written independently of the module under test. */
function localKey(ts) {
  const date = new Date(ts)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const assistant = (seq, time, usage, provider = 'p', model = 'm') => ({
  type: 'assistant/message',
  seq,
  time,
  data: {
    message: { role: 'assistant', source: { kind: 'model', provider, model } },
    usage,
  },
})

test('foldSession folds the 12-event fixture into one SessionAggregate', () => {
  const aggregate = foldSession(fixture.header, fixture.events, fixture.inheritedEventCount)

  assert.equal(aggregate.id, 'session-fixture-basic')
  assert.equal(aggregate.cwd, 'C:\\workspaces\\demo-app')
  assert.equal(aggregate.createdAt, fixture.header.createdAt)
  assert.equal(aggregate.delegationDepth, 0)
  assert.equal(aggregate.origin, undefined)

  // Σ usage.totalTokens = 1150 + 300
  assert.equal(aggregate.tokens, 1450)
  assert.equal(aggregate.inputTokens, 300)
  assert.equal(aggregate.outputTokens, 150)
  assert.equal(aggregate.cacheReadTokens, 1000)
  assert.equal(aggregate.cacheWriteTokens, 0)

  // one real user message; the time-context injection must not count
  assert.equal(aggregate.messages, 1)
  assert.equal(aggregate.turns, 1)
  // Active duration is step-based (lead ruling 2026-10-27): the fixture's only
  // completed step runs 1792980001100 → 1792980003200 = 2100 ms.
  assert.equal(aggregate.chatMs, 2100)
  // Turn-based sum is kept for reconciliation against turn-only ground truth.
  assert.equal(aggregate.turnMs, 5000)
  assert.equal(aggregate.stepCount, 1)
  assert.equal(aggregate.stepMs, 2100)

  assert.equal(aggregate.title, '示例会话')
  assert.equal(aggregate.eventCount, 12)
  assert.equal(aggregate.lastSeq, 11)

  // first/last span the whole log, including the header createdAt
  assert.equal(aggregate.firstEventAt, fixture.header.createdAt)
  assert.equal(aggregate.lastEventAt, 1793062802000)
})

test('foldSession buckets tokens/messages/turns per local calendar day', () => {
  const aggregate = foldSession(fixture.header, fixture.events)

  const expectedKeys = [...new Set(fixture.events.map((event) => localKey(event.time)))].sort()
  assert.deepEqual(Object.keys(aggregate.days).sort(), expectedKeys)
  assert.equal(expectedKeys.length, 2, 'fixture must span two local days')

  const [firstDay, secondDay] = expectedKeys
  assert.deepEqual(aggregate.days[firstDay], { tokens: 1150, messages: 1, turns: 1 })
  assert.deepEqual(aggregate.days[secondDay], { tokens: 300, messages: 0, turns: 0 })
})

test('foldSession groups model usage by provider/model', () => {
  const aggregate = foldSession(fixture.header, fixture.events)

  assert.deepEqual(Object.keys(aggregate.models).sort(), [
    'wb-proxy/deepseek-v4.1-flash',
    'wb-proxy/deepseek-v4.1-pro',
  ])
  assert.deepEqual(aggregate.models['wb-proxy/deepseek-v4.1-flash'], {
    provider: 'wb-proxy',
    model: 'deepseek-v4.1-flash',
    tokens: 1150,
    messages: 1,
  })
  assert.deepEqual(aggregate.models['wb-proxy/deepseek-v4.1-pro'], {
    provider: 'wb-proxy',
    model: 'deepseek-v4.1-pro',
    tokens: 300,
    messages: 1,
  })
})

test('foldSession skips the fork-inherited event prefix', () => {
  const aggregate = foldSession(fixture.header, fixture.events, 10)

  assert.equal(aggregate.eventCount, 2)
  assert.equal(aggregate.lastSeq, 11)
  assert.equal(aggregate.tokens, 0)
  assert.equal(aggregate.messages, 0, 'the inherited real user message must not be re-counted')
  assert.equal(aggregate.turns, 0)
  assert.equal(aggregate.title, undefined, 'the inherited title must not be re-counted')
})

test('foldSession tolerates an empty log', () => {
  const aggregate = foldSession(fixture.header, [])

  assert.equal(aggregate.tokens, 0)
  assert.equal(aggregate.eventCount, 0)
  assert.equal(aggregate.lastSeq, -1)
  assert.deepEqual(aggregate.days, {})
  assert.deepEqual(aggregate.models, {})
  assert.equal(aggregate.firstEventAt, fixture.header.createdAt)
  assert.equal(aggregate.lastEventAt, fixture.header.createdAt)
})

test('foldSession tolerates missing header fields and non-array events', () => {
  const aggregate = foldSession(undefined, undefined)

  assert.equal(aggregate.id, '')
  assert.equal(aggregate.createdAt, 0)
  assert.equal(aggregate.delegationDepth, 0)
  assert.equal(aggregate.eventCount, 0)
})

test('foldSession counts an assistant message without usage as 0 tokens', () => {
  const events = [
    assistant(0, 1792980000000, undefined, 'p', 'm'),
    assistant(1, 1792980001000, { inputTokens: 1, outputTokens: 2 }, 'p', 'm'),
  ]
  const aggregate = foldSession(fixture.header, events)

  assert.equal(aggregate.tokens, 3, 'missing totalTokens falls back to the disjoint component sum')
  assert.equal(aggregate.models['p/m'].tokens, 3)
  assert.equal(aggregate.models['p/m'].messages, 2)
})

test('foldSession ignores a header-like session event inside the event list', () => {
  const events = [
    { type: 'session', version: 4, id: 'x', createdAt: 1 },
    assistant(0, 1792980000000, { totalTokens: 7 }),
  ]
  const aggregate = foldSession(fixture.header, events)

  assert.equal(aggregate.eventCount, 1)
  assert.equal(aggregate.tokens, 7)
})

test('foldSession reports chatMs 0 for a session without step or turn events', () => {
  // Legacy/empty logs (e.g. session-demo-empty: only permission/sandbox/title
  // events) have no explicable active time. The first→last span must never be
  // reported as a chat duration (lead ruling 2026-10-27).
  const aggregate = foldSession({ ...fixture.header, createdAt: 0 }, [
    { type: 'permission/preset', seq: 0, time: 1000, data: { preset: 'workspace-write' } },
    { type: 'session/title', seq: 1, time: 2_000_000, data: { title: '只有配置事件的会话' } },
    { type: 'assistant/message', seq: 2, time: 3_000_000, data: { usage: { totalTokens: 5 } } },
  ])

  assert.equal(aggregate.chatMs, 0)
  assert.equal(aggregate.turnMs, 0)
  assert.equal(aggregate.stepMs, 0)
  assert.equal(aggregate.stepCount, 0)
  assert.equal(aggregate.turns, 0)
  // The span itself is still tracked for last-activity, it is just not a duration.
  assert.equal(aggregate.firstEventAt, 0)
  assert.equal(aggregate.lastEventAt, 3_000_000)
})

test('foldSession ignores turn/end without a matching turn/start', () => {
  const aggregate = foldSession(fixture.header, [
    { type: 'turn/start', seq: 0, time: 1000, data: { turn: 1 } },
    { type: 'turn/end', seq: 1, time: 3000, data: { turn: 1 } },
    { type: 'turn/end', seq: 2, time: 9000, data: { turn: 2 } },
  ])

  assert.equal(aggregate.turns, 1)
  assert.equal(aggregate.turnMs, 2000)
  assert.equal(aggregate.chatMs, 2000, 'no step events: fall back to the turn sum')
})

test('foldSession prefers the step sum over the turn sum for chatMs', () => {
  const aggregate = foldSession(fixture.header, [
    { type: 'turn/start', seq: 0, time: 0, data: { turn: 1 } },
    { type: 'step/start', seq: 1, time: 1000, data: { turn: 1, step: 1 } },
    { type: 'step/end', seq: 2, time: 4000, data: { turn: 1, step: 1 } },
    { type: 'step/start', seq: 3, time: 5000, data: { turn: 1, step: 2 } },
    { type: 'step/end', seq: 4, time: 7000, data: { turn: 1, step: 2 } },
    { type: 'turn/end', seq: 5, time: 100_000, data: { turn: 1 } },
  ])

  assert.equal(aggregate.turnMs, 100_000, 'a turn left open while the user idles is not active time')
  assert.equal(aggregate.stepMs, 5000)
  assert.equal(aggregate.chatMs, 5000)
})

test('foldSession keeps chatMs at 0 when steps exist but none completed', () => {
  const aggregate = foldSession(fixture.header, [
    { type: 'turn/start', seq: 0, time: 0, data: { turn: 1 } },
    { type: 'turn/end', seq: 1, time: 1000, data: { turn: 1 } },
    { type: 'step/start', seq: 2, time: 2000, data: { turn: 2, step: 1 } },
  ])

  assert.equal(aggregate.stepCount, 1)
  assert.equal(aggregate.turnMs, 1000)
  assert.equal(aggregate.chatMs, 0, 'step events exist, so the turn fallback must not kick in')
})

test('foldSession only counts source.kind === "user" as a user message', () => {
  const aggregate = foldSession(fixture.header, [
    { type: 'user/message', seq: 0, time: 1792980000000, data: { source: { kind: 'user' } } },
    { type: 'user/message', seq: 1, time: 1792980000000, data: { source: { kind: 'user-approval' } } },
    { type: 'user/message', seq: 2, time: 1792980000000, data: { source: { kind: 'runtime-context' } } },
    { type: 'user/message', seq: 3, time: 1792980000000, data: { source: { kind: 'skill-catalog' } } },
    { type: 'user/message', seq: 4, time: 1792980000000, data: {} },
  ])

  assert.equal(aggregate.messages, 1)
  assert.equal(aggregate.days[localKey(1792980000000)].messages, 1)
})

test('createSessionAggregate + applyEvent support the real-time increment path', () => {
  const aggregate = createSessionAggregate(fixture.header)
  assert.equal(aggregate.tokens, 0)

  applyEvent(aggregate, assistant(3, 1792980002000, { totalTokens: 42 }, 'p', 'm'))
  assert.equal(aggregate.tokens, 42)
  assert.equal(aggregate.lastSeq, 3)
  assert.equal(aggregate.eventCount, 1)
  assert.equal(aggregate.days[localKey(1792980002000)].tokens, 42)
  assert.equal(aggregate.models['p/m'].messages, 1)

  applyEvent(aggregate, { type: 'session/title', seq: 4, time: 1792980003000, data: { title: '新标题' } })
  assert.equal(aggregate.title, '新标题')
  assert.equal(aggregate.tokens, 42)
})

test('dayKey/dayKeyAdd/dayKeyOrdinal use the local calendar', () => {
  const noon = new Date(2026, 9, 27, 12, 0, 0).getTime()
  assert.equal(dayKey(noon), '2026-10-27')
  assert.equal(dayKeyAdd('2026-10-27', -1), '2026-10-26')
  assert.equal(dayKeyAdd('2026-12-31', 1), '2027-01-01')
  assert.equal(dayKeyAdd('2026-03-01', -1), '2026-02-28')
  assert.equal(dayKeyAdd('2026-10-26', 7), '2026-11-02')
  assert.equal(dayKeyOrdinal('2026-10-27') - dayKeyOrdinal('2026-10-26'), 1)
  assert.equal(dayKeyOrdinal('2027-01-01') - dayKeyOrdinal('2026-12-31'), 1)
  assert.equal(dayKey(0), dayKey(new Date(0).getTime()))
})

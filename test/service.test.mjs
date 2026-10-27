import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { zstdCompressSync } from 'node:zlib'

import { createUsageService } from '../src/host/service.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Fixed clock: local noon on 2026-10-27. */
const START_CLOCK = new Date(2026, 9, 27, 12, 0, 0).getTime()

/** A fresh, isolated cache path per test (never touch the real ~/.dsh). */
function tempCachePath() {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-usage-stats-'))
  return join(dir, 'storages', 'usage-stats', 'aggregates.v1.json')
}

/** A fresh, isolated $DSH_HOME per test (never touch the real ~/.dsh). */
function tempDshHome() {
  return mkdtempSync(join(tmpdir(), 'dsh-usage-home-'))
}

/**
 * Write a real session artifact the way DSH does: a concatenation of
 * independently decodable Zstandard frames (one per append batch). Splitting
 * lines across frames is exactly what exercises the multi-frame decoder.
 */
function writeRawLog(dshHome, { id, workspace = '--ws--', header, events, frames = 2 }) {
  const directory = join(dshHome, 'sessions', workspace, id)
  mkdirSync(directory, { recursive: true })
  // The first artifact line is the header record, tagged `type: 'session'`
  // exactly like the real `session.v4.jsonl.zstd` artifacts.
  const lines = [JSON.stringify({ type: 'session', version: 4, ...header }), ...events.map((event) => JSON.stringify(event))]
  const perFrame = Math.max(1, Math.ceil(lines.length / frames))
  const parts = []
  for (let index = 0; index < lines.length; index += perFrame) {
    const text = `${lines.slice(index, index + perFrame).join('\n')}\n`
    parts.push(zstdCompressSync(Buffer.from(text, 'utf8')))
  }
  const filePath = join(directory, 'session.v4.jsonl.zstd')
  writeFileSync(filePath, Buffer.concat(parts))
  return filePath
}

/** The exact refusal the persistence layer emits for plugin-written events. */
function refusalMessage(id, logPath) {
  const suffix = logPath === undefined ? '' : ` (raw log: ${logPath})`
  return `session "${id}" contains event type "job/registered" (seq 20) unknown to this harness and not marked ignorable; refusing to interpret the log — it was likely written by a newer harness${suffix}`
}

/** One assistant message with an explicit total. */
function assistantEvent(seq, time, totalTokens, provider = 'p', model = 'm') {
  return {
    type: 'assistant/message',
    seq,
    time,
    data: {
      message: { role: 'assistant', source: { kind: 'model', provider, model } },
      usage: { inputTokens: 0, outputTokens: 0, totalTokens },
    },
  }
}

/** One real user message. */
function userEvent(seq, time) {
  return { type: 'user/message', seq, time, data: { role: 'user', source: { kind: 'user' }, content: [] } }
}

/** Three sessions: two sealed logs and one live log. */
function makeSessions() {
  return [
    {
      header: { version: 4, id: 'a', createdAt: START_CLOCK - 3_000_000, cwd: 'C:\\w\\one', isSeeded: false, delegationDepth: 0 },
      live: false,
      events: [userEvent(0, START_CLOCK - 3_000_000), assistantEvent(1, START_CLOCK - 2_999_000, 100)],
    },
    {
      header: { version: 4, id: 'b', createdAt: START_CLOCK - 2_000_000, cwd: 'C:\\w\\two', isSeeded: false, delegationDepth: 0 },
      live: false,
      events: [assistantEvent(0, START_CLOCK - 1_999_000, 200, 'p', 'm2')],
    },
    {
      header: { version: 4, id: 'c', createdAt: START_CLOCK - 1_000_000, cwd: 'C:\\w\\one', isSeeded: false, delegationDepth: 0 },
      live: true,
      events: [assistantEvent(0, START_CLOCK - 999_000, 300)],
    },
  ]
}

/** Minimal `sessionQuery` stand-in with per-session read counters. */
function createFakeQuery({ sessions, readDelayMs = 10, failRead = new Set(), refuse = new Map(), listEventsEnabled = true }) {
  const readCounts = {}
  const listEventsCounts = {}
  const query = {
    sessions,
    readCounts,
    listEventsCounts,
    async listSessions() {
      await sleep(1)
      return sessions.map((entry) => ({
        header: entry.header,
        live: entry.live === true,
        persisted: true,
      }))
    },
    async readSession(id) {
      readCounts[id] = (readCounts[id] ?? 0) + 1
      await sleep(readDelayMs)
      if (failRead.has(id)) throw new Error(`corrupt log for ${id}`)
      // The persistence layer's fail-closed refusal for plugin-written events.
      const refusal = refuse.get(id)
      if (refusal !== undefined) throw new Error(refusal)
      const entry = sessions.find((candidate) => candidate.header.id === id)
      if (entry === undefined) throw new Error(`session not found: ${id}`)
      return { session: entry.header, inheritedEventCount: 0, events: entry.events }
    },
  }
  if (listEventsEnabled) {
    // Body-free per-event records: exactly what the cheap revalidation probe uses.
    query.listEvents = async (id) => {
      listEventsCounts[id] = (listEventsCounts[id] ?? 0) + 1
      const entry = sessions.find((candidate) => candidate.header.id === id)
      if (entry === undefined) throw new Error(`session not found: ${id}`)
      return entry.events.map((event) => ({
        sessionId: id,
        seq: event.seq,
        type: event.type,
        time: event.time,
        surface: 'current',
      }))
    }
  }
  return query
}

/** Poll until `predicate()` holds (real time, not the injected clock). */
async function waitFor(predicate, { timeout = 3000, interval = 5 } = {}) {
  const deadline = Date.now() + timeout
  for (;;) {
    if (predicate()) return
    if (Date.now() > deadline) throw new Error('waitFor timed out')
    await sleep(interval)
  }
}

test('snapshot degrades to empty data when sessionQuery is missing', async () => {
  const cachePath = tempCachePath()
  const service = createUsageService({ now: () => START_CLOCK, cachePath })

  const snapshot = await service.snapshot()
  assert.equal(snapshot.totals.tokens, 0)
  assert.equal(snapshot.totals.sessions, 0)
  assert.equal(snapshot.progress.warm, false)
  assert.equal(snapshot.daily.length, 30)
  assert.ok(snapshot.daily.every((entry) => entry.tokens === 0))
  assert.equal(service.status().degraded, true)

  // A second call must neither throw nor hang.
  const again = await service.snapshot()
  assert.equal(again.totals.tokens, 0)
  service.dispose()
})

test('first snapshot returns partial data with progress, then the full total', async () => {
  const cachePath = tempCachePath()
  const query = createFakeQuery({ sessions: makeSessions() })
  const service = createUsageService({ sessionQuery: query, now: () => START_CLOCK, cachePath })

  const first = await service.snapshot()
  assert.equal(first.progress.warm, false, 'the first call must not block on the full warm-up')
  assert.equal(first.progress.total, 3, 'the cheap listing still gives the page a total')
  assert.ok(first.progress.done < 3)

  await waitFor(() => service.status().warm)
  const second = await service.snapshot()
  assert.equal(second.progress.warm, true)
  assert.equal(second.totals.tokens, 600)
  assert.equal(second.totals.sessions, 3)
  assert.equal(second.totals.messages, 1)
  assert.equal(service.status().cached, 2, 'both sealed sessions are served from the cache')
  assert.equal(service.status().version, '1')

  service.dispose()
})

test('live sessions are re-read after the TTL, sealed ones are not', async () => {
  const cachePath = tempCachePath()
  const sessions = makeSessions()
  const query = createFakeQuery({ sessions })
  let clock = START_CLOCK
  const service = createUsageService({ sessionQuery: query, now: () => clock, cachePath })

  service.start()
  await waitFor(() => service.status().warm)
  assert.equal((await service.snapshot()).totals.tokens, 600)

  // The live session keeps growing.
  sessions[2].events.push(assistantEvent(1, START_CLOCK - 500_000, 50))
  clock += 11_000

  const grown = await service.snapshot()
  assert.equal(grown.totals.tokens, 650)
  assert.equal(query.readCounts.a, 1, 'a sealed log must never be re-read')
  assert.equal(query.readCounts.b, 1)
  assert.ok(query.readCounts.c >= 2)

  // Inside the TTL the memoised snapshot is returned without any read.
  const readsBefore = query.readCounts.c
  const cached = await service.snapshot()
  assert.equal(cached.totals.tokens, 650)
  assert.equal(query.readCounts.c, readsBefore)

  service.dispose()
})

test('cache is written atomically, skips live sessions, and is reused on restart', async () => {
  const cachePath = tempCachePath()
  const sessions = makeSessions()

  const firstQuery = createFakeQuery({ sessions })
  const firstService = createUsageService({ sessionQuery: firstQuery, now: () => START_CLOCK, cachePath })
  firstService.start()
  await waitFor(() => firstService.status().warm)
  assert.equal((await firstService.snapshot()).totals.tokens, 600)
  firstService.dispose()

  const raw = JSON.parse(readFileSync(cachePath, 'utf8'))
  assert.equal(raw.version, 1)
  assert.deepEqual(Object.keys(raw.sessions).sort(), ['a', 'b'], 'the live session must not be cached')
  assert.equal(raw.sessions.a.aggregate.tokens, 100)
  assert.equal(raw.sessions.a.eventCount, 2)
  assert.equal(raw.sessions.a.lastSeq, 1)

  const secondQuery = createFakeQuery({ sessions })
  const secondService = createUsageService({ sessionQuery: secondQuery, now: () => START_CLOCK, cachePath })
  secondService.start()
  await waitFor(() => secondService.status().warm)

  assert.equal(secondQuery.readCounts.a, undefined, 'sealed session a came from the cache')
  assert.equal(secondQuery.readCounts.b, undefined, 'sealed session b came from the cache')
  assert.equal(secondQuery.readCounts.c, 1, 'the live session is always read')
  assert.equal(secondService.status().cached, 2)
  assert.equal((await secondService.snapshot()).totals.tokens, 600)
  secondService.dispose()
})

test('a corrupt cache file degrades to a rebuild instead of throwing', async () => {
  const cachePath = tempCachePath()
  const query = createFakeQuery({ sessions: makeSessions() })
  const warnings = []
  // Prime an empty cache, then corrupt it.
  const service = createUsageService({ sessionQuery: query, now: () => START_CLOCK, cachePath })
  service.start()
  await waitFor(() => service.status().warm)
  service.dispose()
  const { writeFileSync } = await import('node:fs')
  writeFileSync(cachePath, '{not json', 'utf8')

  const secondQuery = createFakeQuery({ sessions: makeSessions() })
  const secondService = createUsageService({
    sessionQuery: secondQuery,
    now: () => START_CLOCK,
    cachePath,
    logger: { warn: (message) => warnings.push(message) },
  })
  secondService.start()
  await waitFor(() => secondService.status().warm)
  assert.equal((await secondService.snapshot()).totals.tokens, 600)
  assert.ok(warnings.some((message) => message.includes('not valid JSON')))
  secondService.dispose()
})

test('one unreadable session is skipped with a warning, the rest still renders', async () => {
  const cachePath = tempCachePath()
  const query = createFakeQuery({ sessions: makeSessions(), failRead: new Set(['b']) })
  const warnings = []
  const service = createUsageService({
    sessionQuery: query,
    now: () => START_CLOCK,
    cachePath,
    logger: { warn: (message) => warnings.push(message) },
  })

  service.start()
  await waitFor(() => service.status().warm)

  const snapshot = await service.snapshot()
  assert.equal(snapshot.totals.tokens, 400, 'a (100) + c (300); b is skipped')
  assert.equal(snapshot.totals.sessions, 2)
  assert.equal(snapshot.progress.warm, true)
  assert.ok(warnings.some((message) => message.includes('session b skipped')), warnings.join('\n'))
  service.dispose()
})

test('noteAssistantMessage applies a live increment without a re-read', async () => {
  const cachePath = tempCachePath()
  const sessions = makeSessions()
  const query = createFakeQuery({ sessions })
  const service = createUsageService({ sessionQuery: query, now: () => START_CLOCK, cachePath })

  service.start()
  await waitFor(() => service.status().warm)
  assert.equal((await service.snapshot()).totals.tokens, 600)
  const readsBefore = query.readCounts.c

  assert.equal(service.noteAssistantMessage(assistantEvent(9, START_CLOCK, 42), sessions[2].header), true)
  const afterIncrement = await service.snapshot()
  assert.equal(afterIncrement.totals.tokens, 642)
  assert.equal(query.readCounts.c, readsBefore, 'the increment is applied in memory, no readSession')

  // A replayed/duplicate seq must not double-count.
  assert.equal(service.noteAssistantMessage(assistantEvent(9, START_CLOCK, 42), sessions[2].header), false)
  assert.equal((await service.snapshot()).totals.tokens, 642)

  // Non-assistant events are ignored.
  assert.equal(service.noteAssistantMessage(userEvent(10, START_CLOCK), sessions[2].header), false)

  service.dispose()
})

test('refresh starts a new pass and re-reads live sessions', async () => {
  const cachePath = tempCachePath()
  const query = createFakeQuery({ sessions: makeSessions() })
  const service = createUsageService({ sessionQuery: query, now: () => START_CLOCK, cachePath })

  service.start()
  await waitFor(() => service.status().warm)
  await service.snapshot()
  const readsBefore = query.readCounts.c

  const started = await service.refresh()
  assert.deepEqual(started, { started: true })
  assert.deepEqual(await service.refresh(), { started: false }, 'a second refresh joins the running pass')

  await waitFor(() => query.readCounts.c > readsBefore)
  await waitFor(() => service.status().done === service.status().total)
  assert.equal((await service.snapshot()).totals.tokens, 600)
  assert.equal(query.readCounts.a, 1)
  service.dispose()
})

test('status reports warm/done/total/cached/version and starts cold', async () => {
  const cachePath = tempCachePath()
  const service = createUsageService({ sessionQuery: createFakeQuery({ sessions: makeSessions() }), now: () => START_CLOCK, cachePath })

  const cold = service.status()
  assert.equal(cold.warm, false)
  assert.equal(cold.done, 0)
  assert.equal(cold.total, 0)
  assert.equal(cold.cached, 0)
  assert.equal(cold.version, '1')
  assert.equal(cold.degraded, false)

  service.start()
  await waitFor(() => service.status().warm)
  const warm = service.status()
  assert.equal(warm.total, 3)
  assert.equal(warm.done, 3)
  service.dispose()
})

test('unknown-event-type refusal falls back to the raw log and still counts', async () => {
  const cachePath = tempCachePath()
  const dshHome = tempDshHome()
  const header = {
    version: 4,
    id: 'legacy',
    createdAt: START_CLOCK - 500_000,
    cwd: 'C:\\w\\one',
    isSeeded: false,
    delegationDepth: 0,
  }
  // Two frames: header + first message in frame 1, the rest in frame 2, exactly
  // like a log that was appended to twice.
  const logPath = writeRawLog(dshHome, {
    id: 'legacy',
    header,
    events: [
      assistantEvent(0, START_CLOCK - 499_000, 500),
      { type: 'job/registered', seq: 1, time: START_CLOCK - 498_000, data: { jobId: 'j1' } },
      assistantEvent(2, START_CLOCK - 497_000, 250),
    ],
    frames: 2,
  })
  const sessions = [{ header: { ...header }, live: false, events: [] }]
  const warnings = []
  const query = createFakeQuery({ sessions, refuse: new Map([['legacy', refusalMessage('legacy', logPath)]]) })
  const service = createUsageService({
    sessionQuery: query,
    now: () => START_CLOCK,
    cachePath,
    dshHome,
    logger: { warn: (message) => warnings.push(message) },
  })

  service.start()
  await waitFor(() => service.status().warm)

  const snapshot = await service.snapshot()
  assert.equal(snapshot.totals.tokens, 750, 'both assistant messages must survive the fallback')
  assert.equal(snapshot.totals.sessions, 1)
  assert.ok(
    warnings.some((message) => message.includes('read via raw-log fallback')),
    warnings.join('\n'),
  )

  const diagnostics = service.diagnostics()
  assert.equal(diagnostics.listed, 1)
  assert.equal(diagnostics.folded, 1)
  assert.equal(diagnostics.failures, 0)
  assert.equal(diagnostics.fallback, 1)

  const raw = JSON.parse(readFileSync(cachePath, 'utf8'))
  assert.equal(raw.sessions.legacy.fallback, true, 'the cache must remember the fallback provenance')
  assert.equal(raw.sessions.legacy.aggregate.tokens, 750)
  service.dispose()

  // A restart is served from that cached, fallback-derived aggregate: still
  // counted, still reported as a fallback, and no readSession call at all.
  const secondQuery = createFakeQuery({ sessions, refuse: new Map([['legacy', refusalMessage('legacy', logPath)]]) })
  const secondService = createUsageService({
    sessionQuery: secondQuery,
    now: () => START_CLOCK,
    cachePath,
    dshHome,
    logger: { warn: () => {} },
  })
  secondService.start()
  await waitFor(() => secondService.status().warm)
  assert.equal(secondService.diagnostics().fallback, 1)
  assert.equal(secondService.diagnostics().failures, 0)
  assert.equal(secondQuery.readCounts.legacy, undefined, 'a sealed fallback aggregate comes from the cache')
  assert.equal((await secondService.snapshot()).totals.tokens, 750)
  secondService.dispose()
})

test('raw-log fallback also resolves the artifact by scanning $DSH_HOME/sessions', async () => {
  const cachePath = tempCachePath()
  const dshHome = tempDshHome()
  const header = {
    version: 4,
    id: 'session-abc',
    createdAt: START_CLOCK - 400_000,
    cwd: 'C:\\w\\two',
    isSeeded: false,
    delegationDepth: 0,
  }
  // The directory keeps only the bare id, as some historical layouts do; the
  // resolver has to suffix-match it. No `(raw log: …)` hint in the message.
  writeRawLog(dshHome, {
    id: 'abc',
    header,
    events: [assistantEvent(0, START_CLOCK - 399_000, 123)],
    frames: 3,
  })
  const sessions = [{ header, live: false, events: [] }]
  const query = createFakeQuery({ sessions, refuse: new Map([['session-abc', refusalMessage('session-abc')]]) })
  const service = createUsageService({
    sessionQuery: query,
    now: () => START_CLOCK,
    cachePath,
    dshHome,
    logger: { warn: () => {} },
  })

  service.start()
  await waitFor(() => service.status().warm)

  assert.equal((await service.snapshot()).totals.tokens, 123)
  assert.equal(service.diagnostics().fallback, 1)
  assert.equal(service.diagnostics().failures, 0)
  service.dispose()
})

test('a refused session with no readable raw log stays a failure, not a silent zero', async () => {
  const cachePath = tempCachePath()
  const dshHome = tempDshHome() // empty: no artifact to fall back to
  const header = { version: 4, id: 'lost', createdAt: START_CLOCK - 100_000, cwd: 'C:\\w\\x', isSeeded: false, delegationDepth: 0 }
  const sessions = [{ header, live: false, events: [] }]
  const query = createFakeQuery({ sessions, refuse: new Map([['lost', refusalMessage('lost')]]) })
  const warnings = []
  const service = createUsageService({
    sessionQuery: query,
    now: () => START_CLOCK,
    cachePath,
    dshHome,
    logger: { warn: (message) => warnings.push(message) },
  })

  service.start()
  await waitFor(() => service.status().warm)

  const snapshot = await service.snapshot()
  assert.equal(snapshot.totals.tokens, 0)
  assert.equal(snapshot.totals.sessions, 0)
  const diagnostics = service.diagnostics()
  assert.equal(diagnostics.failures, 1)
  assert.equal(diagnostics.fallback, 0)
  assert.equal(diagnostics.folded, 0)
  assert.ok(warnings.some((message) => message.includes('fallback failed')), warnings.join('\n'))
  service.dispose()
})

test('a sealed session whose artifact grew is re-folded instead of served stale', async () => {
  const cachePath = tempCachePath()
  const dshHome = tempDshHome()
  const header = {
    version: 4,
    id: 'grow',
    createdAt: START_CLOCK - 200_000,
    cwd: 'C:\w\grow',
    isSeeded: false,
    delegationDepth: 0,
  }
  const firstEvents = [assistantEvent(0, START_CLOCK - 199_000, 100)]
  writeRawLog(dshHome, { id: 'grow', header, events: firstEvents, frames: 1 })
  const sessions = [{ header, live: false, events: firstEvents }]

  const firstService = createUsageService({
    sessionQuery: createFakeQuery({ sessions }),
    now: () => START_CLOCK,
    cachePath,
    dshHome,
  })
  firstService.start()
  await waitFor(() => firstService.status().warm)
  assert.equal((await firstService.snapshot()).totals.tokens, 100)
  firstService.dispose()

  // The log keeps growing while listSessions() keeps reporting live: false —
  // exactly the verifier's stale-cache regression.
  const grownEvents = [
    assistantEvent(0, START_CLOCK - 199_000, 100),
    assistantEvent(1, START_CLOCK - 100_000, 250),
  ]
  writeRawLog(dshHome, { id: 'grow', header, events: grownEvents, frames: 2 })
  sessions[0].events = grownEvents

  const secondQuery = createFakeQuery({ sessions })
  const secondService = createUsageService({
    sessionQuery: secondQuery,
    now: () => START_CLOCK,
    cachePath,
    dshHome,
  })
  secondService.start()
  await waitFor(() => secondService.status().warm)

  const diagnostics = secondService.diagnostics()
  assert.equal(diagnostics.stale, 1, 'the grown artifact must be detected as stale')
  assert.equal(secondQuery.readCounts.grow, 1, 'the stale entry must be re-read')

  const snapshot = await secondService.snapshot()
  assert.equal(snapshot.totals.tokens, 350, 'the stale 100-token aggregate must not survive')
  secondService.dispose()
})

test('cache entries without an artifact fingerprint are revalidated through listEvents', async () => {
  const cachePath = tempCachePath()
  const dshHome = tempDshHome()
  const header = {
    version: 4,
    id: 'probe',
    createdAt: START_CLOCK - 300_000,
    cwd: 'C:\w\probe',
    isSeeded: false,
    delegationDepth: 0,
  }
  const events = [assistantEvent(0, START_CLOCK - 299_000, 100)]
  writeRawLog(dshHome, { id: 'probe', header, events, frames: 1 })
  const sessions = [{ header, live: false, events }]

  const firstService = createUsageService({
    sessionQuery: createFakeQuery({ sessions }),
    now: () => START_CLOCK,
    cachePath,
    dshHome,
  })
  firstService.start()
  await waitFor(() => firstService.status().warm)
  assert.equal((await firstService.snapshot()).totals.tokens, 100)
  firstService.dispose()

  // Simulate a cache written before fingerprints existed, whose aggregate is wrong.
  const cached = JSON.parse(readFileSync(cachePath, 'utf8'))
  delete cached.sessions.probe.artifact
  cached.sessions.probe.aggregate.tokens = 999
  writeFileSync(cachePath, JSON.stringify(cached), 'utf8')

  // The probe reports the same event count/seq, so the cached value is trusted.
  const freshQuery = createFakeQuery({ sessions })
  const freshService = createUsageService({ sessionQuery: freshQuery, now: () => START_CLOCK, cachePath, dshHome })
  freshService.start()
  await waitFor(() => freshService.status().warm)
  assert.equal(freshService.diagnostics().stale, 0)
  assert.equal(freshQuery.readCounts.probe, undefined, 'a probe-confirmed entry is not re-read')
  assert.equal((await freshService.snapshot()).totals.tokens, 999)
  freshService.dispose()

  // Now the log has one more event: the probe must see the mismatch and re-fold.
  // Strip the fingerprint again so the `listEvents` comparison is what decides
  // (this is the "cache written by an older plugin version" shape).
  const cachedAgain = JSON.parse(readFileSync(cachePath, 'utf8'))
  delete cachedAgain.sessions.probe.artifact
  writeFileSync(cachePath, JSON.stringify(cachedAgain), 'utf8')

  const grownEvents = [assistantEvent(0, START_CLOCK - 299_000, 100), assistantEvent(1, START_CLOCK - 200_000, 250)]
  sessions[0].events = grownEvents
  const staleQuery = createFakeQuery({ sessions })
  const staleService = createUsageService({ sessionQuery: staleQuery, now: () => START_CLOCK, cachePath, dshHome })
  staleService.start()
  await waitFor(() => staleService.status().warm)
  assert.equal(staleService.diagnostics().stale, 1)
  assert.equal((await staleService.snapshot()).totals.tokens, 350)
  staleService.dispose()
})

test('without listEvents the service re-folds sealed sessions instead of trusting them', async () => {
  const cachePath = tempCachePath()
  const sessions = makeSessions()

  const firstService = createUsageService({
    sessionQuery: createFakeQuery({ sessions, listEventsEnabled: false }),
    now: () => START_CLOCK,
    cachePath,
  })
  firstService.start()
  await waitFor(() => firstService.status().warm)
  assert.equal((await firstService.snapshot()).totals.tokens, 600)
  firstService.dispose()

  const secondQuery = createFakeQuery({ sessions, listEventsEnabled: false })
  const secondService = createUsageService({ sessionQuery: secondQuery, now: () => START_CLOCK, cachePath })
  secondService.start()
  await waitFor(() => secondService.status().warm)

  // Correctness over first paint: every sealed session is re-read.
  assert.equal(secondQuery.readCounts.a, 1)
  assert.equal(secondQuery.readCounts.b, 1)
  assert.equal(secondService.status().cached, 0)
  assert.equal((await secondService.snapshot()).totals.tokens, 600)
  secondService.dispose()
})

/**
 * dsh-usage-stats — usage service (sessionQuery orchestration).
 *
 * Owns the lifecycle that turns `ctx.sessionQuery` into `UsageSnapshot`s:
 *
 * - `listSessions()` once per pass, newest-first, to learn what exists;
 * - sealed logs (`live === false`) are folded once and served from the
 *   persistent cache afterwards; live logs are always re-read (spec §4);
 * - warm-up runs in the background with bounded concurrency and reports
 *   `{warm, done, total}` so the page can render progress instead of blocking;
 * - snapshots are memoised for 10s, `refresh()` forces a new pass;
 * - a missing `sessionQuery`, a failing `listSessions` or a single unreadable
 *   session degrades to partial data plus `progress` — never a page-level error;
 * - one narrow exception to the "sessionQuery only" rule: when the harness
 *   refuses a whole log because a plugin wrote an event type it does not know,
 *   that session is re-read from its raw artifact (`raw-log.js`). Every other
 *   failure is still skipped and reported in `diagnostics()`.
 *
 * @module dsh-usage-stats/host/service
 */

import { statSync } from 'node:fs'

import { buildSnapshot } from './aggregate.js'
import { CACHE_VERSION, defaultCachePath, loadCache, saveCache } from './cache.js'
import { applyEvent, createSessionAggregate, foldSession } from './fold.js'
import { defaultDshHome, isUnknownEventRefusal, readRawSessionLog, resolveSessionLogPath } from './raw-log.js'

/** Snapshot memoisation window (spec §4). */
const DEFAULT_TTL_MS = 10_000

/** Concurrent `readSession` calls during a pass (plan Task 4: concurrency 3). */
const DEFAULT_CONCURRENCY = 3

/** Default `rangeDays` when the caller sends something unsupported. */
const DEFAULT_RANGE_DAYS = 30

/** Message of an unknown thrown value. */
const messageOf = (error) => (error instanceof Error ? error.message : String(error))

/**
 * Create the usage service.
 *
 * @param {object} [options]
 * @param {{listSessions?: Function, readSession?: Function}} [options.sessionQuery]
 *   `ctx.sessionQuery`; absent/failing input degrades to an empty snapshot.
 * @param {string} [options.cachePath] defaults to `$DSH_HOME/storages/usage-stats/aggregates.v1.json`.
 * @param {string} [options.dshHome] `$DSH_HOME`; used for the raw-log fallback path scan.
 * @param {{warn?: (message: string) => void}} [options.logger] cordis logger.
 * @param {() => number} [options.now] injectable clock (tests, TTL, "today").
 * @param {number} [options.concurrency] concurrent reads per pass.
 * @param {number} [options.ttlMs] snapshot TTL.
 * @returns {object} service surface used by `lib/index.js`.
 */
export function createUsageService(options = {}) {
  const sessionQuery = options?.sessionQuery
  const logger = options?.logger
  const clock = typeof options?.now === 'function' ? options.now : () => Date.now()
  const dshHome = typeof options?.dshHome === 'string' && options.dshHome !== ''
    ? options.dshHome
    : defaultDshHome()
  const cachePath = typeof options?.cachePath === 'string' && options.cachePath !== ''
    ? options.cachePath
    : defaultCachePath({ DSH_HOME: dshHome })
  const concurrency = Number.isInteger(options?.concurrency) && options.concurrency > 0
    ? options.concurrency
    : DEFAULT_CONCURRENCY
  const ttlMs = typeof options?.ttlMs === 'number' && Number.isFinite(options.ttlMs) && options.ttlMs >= 0
    ? options.ttlMs
    : DEFAULT_TTL_MS

  const warn = (message) => logger?.warn?.(message)

  let cache = loadCache(cachePath, logger)
  /** @type {Map<string, object>} session id → SessionAggregate */
  const aggregates = new Map()
  /**
   * Ids observed as live in this process. A cache entry for such a session is
   * never trusted again: a resumed session can flip back to `live === false`
   * with a longer log, and a pre-resume entry would silently freeze the numbers.
   */
  const everLive = new Set()
  /** @type {Array<{header: object, live?: boolean, persisted?: boolean}>} */
  let records = []
  let warm = false
  let done = 0
  let total = 0
  let cachedCount = 0
  /** Sealed sessions whose cached aggregate was re-folded during the last pass. */
  let staleCount = 0
  let disposed = false
  /** @type {{kind: string, promise: Promise<void>, listed: Promise<void>} | null} */
  let currentPass = null
  let abortController = null
  let lastSnapshot = null
  let lastSnapshotKey = ''
  let lastSnapshotAt = 0
  /** Set by `noteAssistantMessage`: rebuild from memory instead of re-reading. */
  let skipRevalidate = false
  let lastError = null
  /** @type {Map<string, string>} session id → last read failure message (support diagnostics) */
  const failures = new Map()
  /** @type {Set<string>} sessions the current pass could only read from the raw artifact */
  const fallbackIds = new Set()
  /** @type {Map<string, {size: number, mtimeMs: number, logPath: string} | null>} per-pass artifact stats */
  const artifactFingerprints = new Map()
  /** @type {Map<string, string | null>} session id → resolved raw artifact path (stable across passes) */
  const sessionLogPaths = new Map()

  const invalidateSnapshot = () => {
    lastSnapshot = null
    lastSnapshotKey = ''
    lastSnapshotAt = 0
  }

  /** Normalise the RPC payload into the snapshot contract. */
  const normalizeOptions = (opts) => {
    const input = opts !== null && typeof opts === 'object' ? opts : {}
    const scope = typeof input.scope === 'string' && input.scope !== '' ? input.scope : 'all'
    const rangeDays = input.rangeDays === 0 || input.rangeDays === 7 || input.rangeDays === 30
      ? input.rangeDays
      : DEFAULT_RANGE_DAYS
    const heatmap = input.heatmap === 'week' || input.heatmap === 'cumulative' ? input.heatmap : 'day'
    return { scope, rangeDays, heatmap }
  }

  /** `listSessions`, degrading to `[]` with a recorded reason. */
  async function listSessionsSafe(signal) {
    if (sessionQuery === null || sessionQuery === undefined || typeof sessionQuery.listSessions !== 'function') {
      lastError = 'sessionQuery.listSessions is unavailable'
      warn(`[dsh-usage-stats] ${lastError}; serving an empty snapshot`)
      return []
    }
    try {
      const listed = await sessionQuery.listSessions(signal)
      lastError = null
      return Array.isArray(listed) ? listed : []
    } catch (error) {
      if (signal?.aborted === true) return []
      lastError = `listSessions failed: ${messageOf(error)}`
      warn(`[dsh-usage-stats] ${lastError}`)
      return []
    }
  }

  /**
   * Structural usability of a cache entry (cheap, synchronous).
   *
   * `eventCount`/`lastSeq` are mandatory: without them the entry cannot be
   * revalidated at all, and a `live: false` session whose log grew behind our
   * back would be served stale forever (verifier regression 2026-10-27).
   */
  function isEntryUsable(entry, header) {
    const aggregate = entry?.aggregate
    if (aggregate === null || typeof aggregate !== 'object') return false
    if (typeof aggregate.id !== 'string' || aggregate.id === '') return false
    if (aggregate.id !== header.id) return false
    if (typeof aggregate.tokens !== 'number' || !Number.isFinite(aggregate.tokens)) return false
    if (Number.isInteger(entry.eventCount) !== true || entry.eventCount < 0) return false
    if (Number.isInteger(entry.lastSeq) !== true || entry.lastSeq < -1) return false
    return true
  }

  /**
   * O(1) artifact fingerprint for one session, or null when the artifact cannot
   * be located.
   *
   * The session log is append-only, so `(size, mtimeMs)` of the artifact is a
   * sound freshness witness: equal fingerprint ⇒ nothing was appended since the
   * fold. This keeps revalidating ~80 sealed sessions cheap instead of paying a
   * full `listEvents` decompress per session on every pass.
   */
  function readArtifactFingerprint(id) {
    if (artifactFingerprints.has(id)) return artifactFingerprints.get(id)
    let fingerprint = null
    let logPath = sessionLogPaths.get(id)
    if (logPath === undefined) {
      try {
        logPath = resolveSessionLogPath(id, { dshHome }) ?? null
      } catch {
        logPath = null
      }
      sessionLogPaths.set(id, logPath)
    }
    if (logPath !== null) {
      try {
        const stat = statSync(logPath)
        fingerprint = { size: stat.size, mtimeMs: stat.mtimeMs, logPath }
      } catch {
        fingerprint = null
        sessionLogPaths.set(id, null)
      }
    }
    artifactFingerprints.set(id, fingerprint)
    return fingerprint
  }

  /**
   * Decide whether a sealed session's cached aggregate is still current.
   *
   * Order (lead ruling 2026-10-27):
   * 1. artifact fingerprint recorded with the entry and still equal → fresh;
   * 2. fingerprint recorded but different → stale (the log was appended to);
   * 3. no fingerprint → ask `listEvents` for `records.length` + `max(seq)` and
   *    compare with the cached `eventCount`/`lastSeq`;
   * 4. `listEvents` unavailable or failing → unknown ⇒ recompute.
   *
   * @returns {Promise<{verdict: 'fresh' | 'stale' | 'unknown', fingerprint: object | null}>}
   */
  async function probeSealedEntry(id, entry) {
    const fingerprint = readArtifactFingerprint(id)
    const recorded = entry?.artifact
    if (fingerprint !== null && recorded !== undefined && recorded !== null) {
      const same = recorded.size === fingerprint.size && recorded.mtimeMs === fingerprint.mtimeMs
      return { verdict: same ? 'fresh' : 'stale', fingerprint }
    }
    if (sessionQuery === null || sessionQuery === undefined || typeof sessionQuery.listEvents !== 'function') {
      return { verdict: 'unknown', fingerprint }
    }
    try {
      const records = await sessionQuery.listEvents(id)
      if (Array.isArray(records) !== true) return { verdict: 'unknown', fingerprint }
      let maxSeq = -1
      for (const record of records) {
        const seq = record?.seq
        if (Number.isInteger(seq) && seq > maxSeq) maxSeq = seq
      }
      const fresh = records.length === entry.eventCount && maxSeq === entry.lastSeq
      return { verdict: fresh ? 'fresh' : 'stale', fingerprint }
    } catch {
      // A refused/corrupt log cannot be probed; correctness wins over first paint.
      return { verdict: 'unknown', fingerprint }
    }
  }

  /**
   * Raw-log fallback for a log the harness explicitly refused.
   *
   * Reached only when `readSession` failed with the persistence layer's
   * unknown-event-type refusal, which names the artifact path. The raw bytes are
   * intact and unknown event types carry no `usage`, so folding them cannot
   * change the token/message/turn/day totals.
   *
   * @returns {object | null} the folded aggregate, or null when the raw read failed too.
   */
  function recoverFromRawLog(id, header, errorMessage) {
    try {
      const read = readRawSessionLog(id, { dshHome, errorMessage })
      const aggregate = foldSession(read.session ?? header, read.events, read.inheritedEventCount)
      warn(`[dsh-usage-stats] session ${id} read via raw-log fallback (${read.events.length} events): ${read.logPath}`)
      return aggregate
    } catch (error) {
      // The raw artifact is unreadable too: report it as a normal failure.
      warn(`[dsh-usage-stats] raw-log fallback failed for session ${id}: ${messageOf(error)}`)
      return null
    }
  }

  /** Fold one session, caching it only when its log is sealed. */
  async function foldRecord(record) {
    const header = record?.header ?? {}
    const id = typeof header.id === 'string' ? header.id : ''
    if (id === '') return false
    // Take the fingerprint BEFORE reading: if the log grows mid-read, the next
    // pass sees a different fingerprint and recomputes rather than staying stale.
    const fingerprint = readArtifactFingerprint(id)
    let aggregate
    let usedFallback = false
    try {
      if (sessionQuery === null || sessionQuery === undefined || typeof sessionQuery.readSession !== 'function') {
        throw new Error('sessionQuery.readSession is unavailable')
      }
      const read = await sessionQuery.readSession(id)
      if (disposed) return false
      aggregate = foldSession(read?.session ?? header, read?.events ?? [], read?.inheritedEventCount ?? 0)
    } catch (error) {
      const message = messageOf(error)
      // Only the harness's unknown-event-type refusal earns the compat read.
      const recovered = isUnknownEventRefusal(message) ? recoverFromRawLog(id, header, message) : null
      if (recovered === null) {
        // One unreadable session must not fail the whole page (plan Review Focus).
        failures.set(id, message)
        fallbackIds.delete(id)
        warn(`[dsh-usage-stats] session ${id} skipped: ${message}`)
        return false
      }
      aggregate = recovered
      usedFallback = true
    }
    aggregates.set(id, aggregate)
    failures.delete(id)
    // A session that reads cleanly through sessionQuery stops counting as a
    // fallback, so the number drops back to 0 once the harness catches up.
    if (usedFallback) fallbackIds.add(id)
    else fallbackIds.delete(id)
    if (record.live !== true && record.persisted !== false) {
      cache.sessions[id] = {
        createdAt: aggregate.createdAt,
        eventCount: aggregate.eventCount,
        lastSeq: aggregate.lastSeq,
        aggregate,
        ...(fingerprint !== null ? { artifact: { size: fingerprint.size, mtimeMs: fingerprint.mtimeMs } } : {}),
        ...(usedFallback ? { fallback: true } : {}),
      }
    }
    return true
  }

  /** Persist sealed aggregates, pruning sessions that are no longer listed. */
  function persist() {
    // A failed/empty listing must never wipe a good cache.
    if (records.length === 0) return
    const listedIds = new Set()
    for (const record of records) {
      const id = record?.header?.id
      if (typeof id === 'string' && id !== '') listedIds.add(id)
    }
    const sessions = {}
    for (const [id, entry] of Object.entries(cache.sessions)) {
      if (listedIds.has(id)) sessions[id] = entry
    }
    cache = { version: CACHE_VERSION, sessions }
    saveCache(cachePath, cache, logger)
  }

  /** One full pass: list, reuse-or-fold every session, persist. */
  async function executePass(signal, kind, resolveListed) {
    let listed = []
    try {
      listed = await listSessionsSafe(signal)
    } finally {
      resolveListed()
    }
    records = listed
    total = listed.length
    if (disposed || signal.aborted) return

    artifactFingerprints.clear()
    const reuse = []
    const candidates = []
    const work = []
    for (const record of listed) {
      const header = record?.header
      const id = typeof header?.id === 'string' ? header.id : ''
      if (id === '') continue
      if (record.live === true) {
        everLive.add(id)
        delete cache.sessions[id]
        work.push(record)
        continue
      }
      const entry = everLive.has(id) ? undefined : cache.sessions[id]
      if (entry !== undefined && isEntryUsable(entry, header)) candidates.push({ entry, record })
      else work.push(record)
    }

    // Revalidate sealed candidates with the same bounded concurrency: an
    // article-level fingerprint hit is O(1), everything else must prove itself.
    let probeCursor = 0
    let staleReused = 0
    const probeWorker = async () => {
      for (;;) {
        if (disposed || signal.aborted) return
        const index = probeCursor
        probeCursor += 1
        if (index >= candidates.length) return
        const candidate = candidates[index]
        const id = candidate.record.header.id
        const probe = await probeSealedEntry(id, candidate.entry)
        if (probe.verdict === 'fresh') {
          // Remember the (possibly newly observed) fingerprint so the next pass
          // stays O(1) even for entries written by an older cache version.
          if (probe.fingerprint !== null && candidate.entry.artifact === undefined) {
            candidate.entry.artifact = { size: probe.fingerprint.size, mtimeMs: probe.fingerprint.mtimeMs }
          }
          reuse.push([id, candidate.entry.aggregate])
        } else {
          staleReused += 1
          delete cache.sessions[id]
          work.push(candidate.record)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, () => probeWorker()))
    staleCount = staleReused

    aggregates.clear()
    fallbackIds.clear()
    for (const [id, aggregate] of reuse) {
      aggregates.set(id, aggregate)
      // Cached aggregates remember whether they came from the raw-log fallback,
      // so the diagnostics number survives a restart.
      if (cache.sessions[id]?.fallback === true) fallbackIds.add(id)
    }
    cachedCount = reuse.length
    done = reuse.length

    let cursor = 0
    const worker = async () => {
      for (;;) {
        if (disposed || signal.aborted) return
        const index = cursor
        cursor += 1
        if (index >= work.length) return
        await foldRecord(work[index])
        done += 1
      }
    }
    const workerCount = Math.min(concurrency, work.length)
    await Promise.all(Array.from({ length: workerCount }, () => worker()))
    if (disposed || signal.aborted) return

    warm = true
    done = total
    persist()
    invalidateSnapshot()
  }

  /** Start (or join) the single in-flight pass. */
  function beginPass(kind) {
    if (disposed) return { kind, promise: Promise.resolve(), listed: Promise.resolve() }
    if (currentPass !== null) return currentPass
    let resolveListed
    const listed = new Promise((resolve) => {
      resolveListed = resolve
    })
    abortController = new AbortController()
    const signal = abortController.signal
    const pass = { kind, listed, promise: null }
    pass.promise = (async () => {
      try {
        await executePass(signal, kind, resolveListed)
      } catch (error) {
        lastError = `warm-up failed: ${messageOf(error)}`
        warn(`[dsh-usage-stats] ${lastError}`)
        resolveListed()
      } finally {
        if (currentPass === pass) {
          currentPass = null
          abortController = null
        }
      }
    })()
    currentPass = pass
    return pass
  }

  /**
   * Render-ready snapshot for one scope/range/mode.
   *
   * The first call after construction returns immediately with partial data and
   * `progress.warm === false` while warm-up continues in the background; later
   * calls (after the 10s TTL) re-validate live sessions before answering.
   *
   * @param {object} [opts] RPC payload: `{scope, rangeDays, heatmap}`.
   * @param {AbortSignal} [signal] accepted for RPC symmetry; the warm-up pass is
   *   shared between callers, so a client abort never cancels work for others.
   */
  async function snapshot(opts, signal) {
    const normalized = normalizeOptions(opts)
    const key = `${normalized.scope}|${normalized.rangeDays}|${normalized.heatmap}`
    const at = clock()
    if (warm && skipRevalidate === false && lastSnapshot !== null && lastSnapshotKey === key && at - lastSnapshotAt < ttlMs) {
      return lastSnapshot
    }
    if (warm) {
      if (skipRevalidate) skipRevalidate = false
      else await beginPass('revalidate').promise
    } else {
      // Wait only for the (cheap) listing so `progress.total` is meaningful;
      // the folds keep running in the background.
      await beginPass('warm').listed
    }
    const value = buildSnapshot([...aggregates.values()], {
      ...normalized,
      now: clock(),
      progress: { warm, done, total },
    })
    if (warm) {
      lastSnapshot = value
      lastSnapshotKey = key
      lastSnapshotAt = clock()
    }
    return value
  }

  /** Warm-up / cache status for the `status` RPC endpoint (spec §6). */
  function status() {
    return {
      warm,
      done: total === 0 ? 0 : Math.min(done, total),
      total,
      cached: cachedCount,
      version: String(CACHE_VERSION),
      degraded: lastError !== null,
      lastError,
    }
  }

  /**
   * Support diagnostics for the `GET /api/usage-stats/diagnostics` route:
   * what the corpus looks like, what folded, and which sessions refused to read.
   *
   * `folded` / `failures` / `fallback` are counts; `failureDetails` carries the
   * per-session messages (capped, newest wins) for support tickets.
   */
  function diagnostics() {
    return {
      ...status(),
      listed: records.length,
      folded: aggregates.size,
      failures: failures.size,
      fallback: fallbackIds.size,
      stale: staleCount,
      failureDetails: [...failures.entries()].slice(0, 20).map(([id, message]) => ({ id, message })),
      cachePath,
    }
  }

  /** Drop the memoised snapshot and start a new pass (fire and forget). */  async function refresh() {
    invalidateSnapshot()
    skipRevalidate = false
    if (disposed || currentPass !== null) return { started: false }
    beginPass('revalidate')
    return { started: true }
  }

  /** Kick off warm-up without blocking plugin load. */
  function start() {
    if (disposed || warm || currentPass !== null) return
    beginPass('warm')
  }

  /** Stop background work and persist whatever sealed work completed. */
  function dispose() {
    if (disposed) return
    disposed = true
    try {
      abortController?.abort()
    } catch {
      // An already-settled controller has nothing to abort.
    }
    abortController = null
    persist()
  }

  /**
   * Apply one live `assistant/message` to the in-memory aggregate so the page
   * moves without waiting for the next full fold (spec §4 real-time increment).
   *
   * @param {object} event raw `assistant/message` event.
   * @param {object} header its `SessionHeader`.
   * @returns {boolean} whether the increment was applied.
   */
  function noteAssistantMessage(event, header) {
    if (event === null || typeof event !== 'object' || event.type !== 'assistant/message') return false
    const id = typeof header?.id === 'string' ? header.id : ''
    if (id === '') return false
    let aggregate = aggregates.get(id)
    if (aggregate === undefined) {
      aggregate = createSessionAggregate(header)
      aggregates.set(id, aggregate)
      if (!records.some((record) => record?.header?.id === id)) {
        records = [{ header, live: true, persisted: false }, ...records]
        total = records.length
      }
    }
    const seq = Number.isFinite(event.seq) ? event.seq : undefined
    // Replayed or out-of-order events must not double-count.
    if (seq !== undefined && seq <= aggregate.lastSeq) return false
    applyEvent(aggregate, event)
    everLive.add(id)
    delete cache.sessions[id]
    skipRevalidate = true
    invalidateSnapshot()
    return true
  }

  return { snapshot, status, diagnostics, refresh, start, dispose, noteAssistantMessage }
}

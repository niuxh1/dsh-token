/**
 * dsh-usage-stats — persistent aggregate cache.
 *
 * `readSession` replays and validates a whole session log, so folding every
 * session on every snapshot is not affordable (spec §4). Sealed logs
 * (`live === false`) never change, so their folded aggregate is cached on disk
 * and reused across restarts:
 *
 * ```json
 * { "version": 1, "sessions": { "<id>": { "createdAt": 0, "eventCount": 0, "lastSeq": 0, "aggregate": {} } } }
 * ```
 *
 * Writes are atomic (temp file + rename) so a crash mid-write can never leave a
 * half-parsed cache behind, and every read path degrades to an empty cache
 * instead of throwing: a corrupt cache must not take the settings page down.
 *
 * @module dsh-usage-stats/host/cache
 */

import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** Cache schema version; bump whenever the aggregate shape changes. */
export const CACHE_VERSION = 1

/** File name inside `$DSH_HOME/storages/usage-stats/`. */
export const CACHE_FILE_NAME = 'aggregates.v1.json'

/** Message of an unknown thrown value. */
const messageOf = (error) => (error instanceof Error ? error.message : String(error))

/** True for a non-null, non-array object. */
const isRecord = (value) => value !== null && typeof value === 'object' && Array.isArray(value) === false

/** A fresh, empty cache document. */
export function emptyCache() {
  return { version: CACHE_VERSION, sessions: {} }
}

/**
 * Default cache location: `$DSH_HOME/storages/usage-stats/aggregates.v1.json`.
 * @param {Record<string, string | undefined>} [env] environment to read.
 * @returns {string} absolute path.
 */
export function defaultCachePath(env = process.env) {
  const home = typeof env?.DSH_HOME === 'string' && env.DSH_HOME !== '' ? env.DSH_HOME : join(homedir(), '.dsh')
  return join(home, 'storages', 'usage-stats', CACHE_FILE_NAME)
}

/**
 * Load the cache document, degrading to an empty cache on any problem.
 * @param {string} filePath cache file path.
 * @param {{warn?: (message: string) => void}} [logger] optional warning sink.
 * @returns {{version: number, sessions: Record<string, object>}}
 */
export function loadCache(filePath, logger) {
  if (typeof filePath !== 'string' || filePath === '') return emptyCache()
  let raw
  try {
    raw = readFileSync(filePath, 'utf8')
  } catch (error) {
    // A missing cache is the normal first-run case, not a warning.
    if (error?.code !== 'ENOENT') logger?.warn?.(`[dsh-usage-stats] cache read failed (${filePath}): ${messageOf(error)}`)
    return emptyCache()
  }
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    logger?.warn?.(`[dsh-usage-stats] cache is not valid JSON, rebuilding: ${messageOf(error)}`)
    return emptyCache()
  }
  if (!isRecord(parsed) || parsed.version !== CACHE_VERSION || !isRecord(parsed.sessions)) {
    logger?.warn?.(`[dsh-usage-stats] cache version/shape mismatch, rebuilding (expected version ${CACHE_VERSION})`)
    return emptyCache()
  }
  const sessions = {}
  for (const [id, entry] of Object.entries(parsed.sessions)) {
    if (!isRecord(entry) || !isRecord(entry.aggregate)) continue
    const aggregate = entry.aggregate
    if (typeof aggregate.id !== 'string' || aggregate.id !== id) continue
    sessions[id] = {
      createdAt: typeof entry.createdAt === 'number' && Number.isFinite(entry.createdAt) ? entry.createdAt : 0,
      eventCount: typeof entry.eventCount === 'number' && Number.isFinite(entry.eventCount) ? entry.eventCount : 0,
      lastSeq: typeof entry.lastSeq === 'number' && Number.isFinite(entry.lastSeq) ? entry.lastSeq : -1,
      aggregate,
      // Provenance marker: this aggregate came from the raw-log fallback rather
      // than from `sessionQuery`, so diagnostics keeps reporting it after a
      // restart instead of silently claiming the fallback is unused.
      ...(entry.fallback === true ? { fallback: true } : {}),
      // Freshness witness: the artifact's size+mtime when the aggregate was
      // folded. Without it a sealed session that grew behind our back could be
      // served stale, so the service revalidates through `listEvents` instead.
      ...(isRecord(entry.artifact) &&
      typeof entry.artifact.size === 'number' &&
      Number.isFinite(entry.artifact.size) &&
      typeof entry.artifact.mtimeMs === 'number' &&
      Number.isFinite(entry.artifact.mtimeMs)
        ? { artifact: { size: entry.artifact.size, mtimeMs: entry.artifact.mtimeMs } }
        : {}),
    }
  }
  return { version: CACHE_VERSION, sessions }
}

/**
 * Write the cache document atomically (temp file + rename in the same folder).
 * @param {string} filePath cache file path.
 * @param {{sessions?: Record<string, object>}} data cache document.
 * @param {{warn?: (message: string) => void}} [logger] optional warning sink.
 * @returns {boolean} whether the write landed.
 */
export function saveCache(filePath, data, logger) {
  if (typeof filePath !== 'string' || filePath === '') return false
  const sessions = isRecord(data?.sessions) ? data.sessions : {}
  let payload
  try {
    payload = JSON.stringify({ version: CACHE_VERSION, sessions })
  } catch (error) {
    logger?.warn?.(`[dsh-usage-stats] cache serialisation failed: ${messageOf(error)}`)
    return false
  }
  const temporary = `${filePath}.${process.pid}.${Math.random().toString(36).slice(2, 10)}.tmp`
  try {
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(temporary, payload, 'utf8')
    renameSync(temporary, filePath)
    return true
  } catch (error) {
    try {
      unlinkSync(temporary)
    } catch {
      // The temp file may not exist; nothing else to clean up.
    }
    logger?.warn?.(`[dsh-usage-stats] cache write failed (${filePath}): ${messageOf(error)}`)
    return false
  }
}

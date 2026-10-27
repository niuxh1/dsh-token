/**
 * dsh-usage-stats — controlled raw-log fallback reader.
 *
 * WHY THIS EXISTS
 * ---------------
 * The primary data source is `ctx.sessionQuery` and it stays the primary
 * source. But the persistence read path is **fail-closed on unknown event
 * types**: `validateStoredEvents` refuses a whole log when it contains an event
 * type outside the build-time `KNOWN_SESSION_EVENT_TYPES` table unless the
 * event carries `ignorable: true`. DSH plugins write their own session events
 * (`job/registered`, `team/task`, `workspace/changes`, …), so on this machine a
 * large share of historical logs — including the biggest sessions — make
 * `sessionQuery.readSession()` throw:
 *
 *   session "<id>" contains event type "job/registered" (seq 20) unknown to
 *   this harness and not marked ignorable; refusing to interpret the log — it
 *   was likely written by a newer harness (raw log: C:\…\session.v4.jsonl.zstd)
 *
 * That is a harness-side compatibility gap, not a data problem: the bytes are
 * intact and the error itself names the file. So we add exactly one exception,
 * and only for logs the harness explicitly refused with that message:
 * decompress the artifact ourselves and fold the events we understand. Unknown
 * event types are inert for usage statistics (they carry no `usage`), so
 * skipping them cannot change token/message/turn/day totals.
 *
 * INVARIANTS
 * ----------
 * - Only reachable through `readRawSessionLog()` from the refusal branch of the
 *   service; the normal read path never touches files (spec §4 / B route).
 * - Session logs are a concatenation of independently decodable Zstandard
 *   frames (one per append batch), so the frame container must be walked and
 *   each frame decompressed separately: Node's `zstdDecompressSync` stops after
 *   the first frame (a 2.9MB log decodes to 223 bytes otherwise). The walker
 *   below mirrors the RFC 8878 header/block layout the persistence backend
 *   itself uses.
 * - A torn trailing frame (a half-written append) is ignored, exactly like the
 *   persistence reader's repair path.
 * - Seeded/forked logs are refused: their fork-inherited prefix length lives in
 *   session state, not in the file, so folding them from byte 0 would
 *   double-count the parent session.
 *
 * @module dsh-usage-stats/host/raw-log
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { zstdDecompressSync } from 'node:zlib'

/** Zstandard frame magic, little-endian `0xFD2FB528`. */
const ZSTD_MAGIC = 0xfd2fb528

/** `(raw log: <path>)` suffix the persistence reader appends to refusals. */
const RAW_LOG_HINT = /\(raw log:\s*([^)]+?)\s*\)/i

/** Artifact names the JSONL persistence backend can produce. */
const LOG_FILE_PATTERN = /^session.*\.jsonl(?:\.zstd)?$/

/**
 * The harness refusal this fallback is allowed to handle. Anything else keeps
 * the normal "skip with a warning" behaviour.
 */
export const UNKNOWN_EVENT_REFUSAL = /unknown to this harness|refusing to interpret the log/i

/** Message of an unknown thrown value. */
const messageOf = (error) => (error instanceof Error ? error.message : String(error))

/**
 * Whether a `readSession` failure is the harness's unknown-event-type refusal.
 * @param {string} message error message.
 * @returns {boolean} true when the raw-log fallback may be attempted.
 */
export function isUnknownEventRefusal(message) {
  return typeof message === 'string' && UNKNOWN_EVENT_REFUSAL.test(message)
}

/**
 * Extract the `(raw log: <path>)` hint appended by the persistence reader.
 * @param {string} message error message.
 * @returns {string | null} absolute log path, or null when absent.
 */
export function extractRawLogPath(message) {
  if (typeof message !== 'string') return null
  const match = RAW_LOG_HINT.exec(message)
  if (match === null) return null
  const candidate = match[1].trim()
  return candidate === '' ? null : candidate
}

/**
 * `$DSH_HOME` with the same defaulting rule as the DSH host.
 * @param {Record<string, string | undefined>} [env] environment to read.
 * @returns {string} absolute home directory.
 */
export function defaultDshHome(env = process.env) {
  return typeof env?.DSH_HOME === 'string' && env.DSH_HOME !== '' ? env.DSH_HOME : join(homedir(), '.dsh')
}

/** Compare session ids ignoring an optional `session-` prefix. */
const normalizeSessionName = (value) => String(value).replace(/^session-/, '')

/** Newest matching session artifact inside one session directory. */function pickLogFile(directory) {
  let entries
  try {
    entries = readdirSync(directory, { withFileTypes: true })
  } catch {
    return null
  }
  let best = null
  let bestScore = Number.NEGATIVE_INFINITY
  for (const entry of entries) {
    if (entry.isFile() !== true || LOG_FILE_PATTERN.test(entry.name) !== true) continue
    const full = join(directory, entry.name)
    let mtime = 0
    try {
      mtime = statSync(full).mtimeMs
    } catch {
      continue
    }
    // Prefer the compressed artifact, then the newest write.
    const score = (entry.name.endsWith('.zstd') ? 1e15 : 0) + mtime
    if (score > bestScore) {
      bestScore = score
      best = full
    }
  }
  return best
}

/**
 * Locate one session's raw log artifact.
 *
 * The refusal message already names the exact file, which is both fastest and
 * most reliable; the filesystem scan is the fallback for messages that lost the
 * hint. Never throws.
 *
 * @param {string} sessionId session id.
 * @param {{dshHome?: string, errorMessage?: string}} [options]
 * @returns {string | null} absolute path, or null when not found.
 */
export function resolveSessionLogPath(sessionId, options = {}) {
  const id = typeof sessionId === 'string' ? sessionId.trim() : ''
  if (id === '') return null
  const hinted = extractRawLogPath(options?.errorMessage)
  if (hinted !== null) {
    try {
      if (statSync(hinted).isFile()) return hinted
    } catch {
      // Hinted path is gone; fall through to the scan.
    }
  }
  const dshHome = typeof options?.dshHome === 'string' && options.dshHome !== ''
    ? options.dshHome
    : defaultDshHome()
  const root = join(dshHome, 'sessions')
  let workspaces
  try {
    workspaces = readdirSync(root, { withFileTypes: true })
  } catch {
    return null
  }
  for (const workspace of workspaces) {
    if (workspace.isDirectory() !== true) continue
    const workspaceDirectory = join(root, workspace.name)
    let entries
    try {
      entries = readdirSync(workspaceDirectory, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.isDirectory() !== true) continue
      // Directory names normally equal the session id; a few historical layouts
      // dropped the "session-" prefix. Normalise that prefix instead of using a
      // loose suffix match, which could bind an unrelated short id to a log.
      const matches = entry.name === id || normalizeSessionName(entry.name) === normalizeSessionName(id)
      if (matches !== true) continue
      const candidate = pickLogFile(join(workspaceDirectory, entry.name))
      if (candidate !== null) return candidate
    }
  }
  return null
}

/**
 * Walk a concatenated Zstandard container and return its complete frame ranges.
 *
 * Follows the frame layout of RFC 8878 §3.1.1: magic, frame header descriptor,
 * optional window descriptor / dictionary id / content size, then blocks
 * (3-byte header each) until the last-block flag, then an optional checksum.
 *
 * @param {Buffer} buffer container bytes.
 * @returns {{frames: {start: number, end: number}[], tornStart: number | null}}
 *   complete frame ranges plus the start of an incomplete trailing frame.
 * @throws {Error} when the container is structurally corrupt.
 */
function scanZstdFrames(buffer) {
  const frames = []
  let offset = 0
  while (offset < buffer.length) {
    const start = offset
    if (buffer.length - offset < 4) return { frames, tornStart: start }
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) {
      throw new Error(`invalid Zstandard frame magic at byte ${offset}`)
    }
    offset += 4
    if (offset === buffer.length) return { frames, tornStart: start }
    const descriptor = buffer.readUInt8(offset)
    offset += 1
    if ((descriptor & 24) !== 0) throw new Error(`reserved frame-header bit at byte ${offset - 1}`)
    const contentSizeFlag = descriptor >>> 6
    const singleSegment = (descriptor & 32) !== 0
    const checksum = (descriptor & 4) !== 0
    const dictionaryFlag = descriptor & 3
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag
    const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : 1 << contentSizeFlag
    const headerBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes
    if (buffer.length - offset < headerBytes) return { frames, tornStart: start }
    offset += headerBytes
    for (;;) {
      if (buffer.length - offset < 3) return { frames, tornStart: start }
      const blockHeader = buffer.readUIntLE(offset, 3)
      offset += 3
      const lastBlock = (blockHeader & 1) !== 0
      const blockType = (blockHeader >>> 1) & 3
      const blockSize = blockHeader >>> 3
      if (blockType === 3) throw new Error(`reserved block type at byte ${offset - 3}`)
      // RLE blocks carry a single byte no matter what the size field says.
      const payloadBytes = blockType === 1 ? 1 : blockSize
      if (buffer.length - offset < payloadBytes) return { frames, tornStart: start }
      offset += payloadBytes
      if (lastBlock) break
    }
    if (checksum) {
      if (buffer.length - offset < 4) return { frames, tornStart: start }
      offset += 4
    }
    frames.push({ start, end: offset })
  }
  return { frames, tornStart: null }
}

/** Decompress every complete frame and concatenate them. */
function decompressZstdContainer(buffer) {
  const { frames } = scanZstdFrames(buffer)
  const parts = []
  for (const frame of frames) {
    try {
      parts.push(zstdDecompressSync(buffer.subarray(frame.start, frame.end)))
    } catch (error) {
      throw new Error(`frame at byte ${frame.start} failed to decompress: ${messageOf(error)}`)
    }
  }
  return Buffer.concat(parts)
}

/** Decode an artifact buffer, accepting both the compressed and plain layout. */
function decodeLogBuffer(buffer) {
  if (buffer.length === 0) return ''
  const isZstd = buffer.length >= 4 && buffer.readUInt32LE(0) === ZSTD_MAGIC
  return (isZstd ? decompressZstdContainer(buffer) : buffer).toString('utf8')
}

/**
 * Read one session's raw log without going through `sessionQuery`.
 *
 * @param {string} sessionId session id.
 * @param {{logPath?: string, dshHome?: string, errorMessage?: string}} [options]
 * @returns {{session: object, events: object[], inheritedEventCount: number, logPath: string}}
 * @throws {Error} when the log is missing, unreadable, headerless, or seeded.
 */
export function readRawSessionLog(sessionId, options = {}) {
  const logPath = typeof options?.logPath === 'string' && options.logPath !== ''
    ? options.logPath
    : resolveSessionLogPath(sessionId, options)
  if (logPath === null || logPath === undefined) {
    throw new Error(`raw log for session "${sessionId}" was not found under $DSH_HOME/sessions`)
  }
  const text = decodeLogBuffer(readFileSync(logPath))
  let session
  const events = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    let record
    try {
      record = JSON.parse(trimmed)
    } catch (error) {
      throw new Error(`raw log "${logPath}" has a malformed JSONL line: ${messageOf(error)}`)
    }
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error(`raw log "${logPath}" has a non-object JSONL line`)
    }
    if (session === undefined && record.type === 'session') {
      session = record
      continue
    }
    events.push(record)
  }
  if (session === undefined) throw new Error(`raw log "${logPath}" has no session header line`)
  if (session.isSeeded === true) {
    // The inherited prefix length is session state, not file content; folding
    // from byte 0 would silently double-count the parent session.
    throw new Error(`raw log "${logPath}" is a seeded (forked) log; inherited prefix unknown, refusing to double count`)
  }
  return { session, events, inheritedEventCount: 0, logPath }
}

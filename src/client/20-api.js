/**
 * Host RPC bridge for the usage page.
 *
 * The host half registers `connection.rpc.handle('/dsh-usage-stats', …)`; the
 * browser half calls it through the injected `connection` service. Every
 * failure is folded into the same `{ ok: false, error }` envelope the host
 * uses, so callers never need two error paths.
 */

/** Logical RPC channel owned by this plugin (must match `lib/index.js`). */
const USAGE_CHANNEL = '/dsh-usage-stats'

/** Default per-request budget; the host answers partial snapshots while warming. */
const USAGE_RPC_TIMEOUT_MS = 15000

/** Build a failure envelope. */
function usageFailure(code, message) {
  return { ok: false, error: { code, message: String(message ?? ''), details: {} } }
}

/** Resolve the connection service without throwing when it is absent. */
function usageConnection(ctx) {
  if (ctx === undefined || ctx === null) return undefined
  try {
    const connection = typeof ctx.get === 'function' ? ctx.get('connection') : ctx.connection
    return connection === null ? undefined : connection
  } catch (error) {
    return undefined
  }
}

/** Create an AbortSignal with a timeout when the platform provides one. */
function usageTimeoutSignal(milliseconds) {
  try {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      return AbortSignal.timeout(milliseconds)
    }
  } catch (error) {
    /* fall through: an environment without AbortSignal.timeout simply has no timeout */
  }
  return undefined
}

/**
 * Call one `/dsh-usage-stats` endpoint.
 *
 * @param {object} ctx - browser plugin context (needs the `connection` service).
 * @param {string} endpoint - `snapshot` | `status` | `refresh`.
 * @param {object} [payload] - endpoint payload.
 * @returns {Promise<{ok: true, value: unknown}|{ok: false, error: {code: string, message: string, details: object}}>}
 */
async function callHost(ctx, endpoint, payload) {
  const connection = usageConnection(ctx)
  if (connection === undefined || connection === null) {
    return usageFailure('usage-stats/no-connection', 'connection service is unavailable')
  }
  const rpc = connection.rpc
  if (rpc === undefined || rpc === null || typeof rpc.call !== 'function') {
    return usageFailure('usage-stats/no-rpc', 'connection.rpc.call is unavailable')
  }
  try {
    const result = await rpc.call(USAGE_CHANNEL, endpoint, payload ?? {}, usageTimeoutSignal(USAGE_RPC_TIMEOUT_MS))
    if (result === undefined || result === null || typeof result !== 'object') {
      return usageFailure('usage-stats/bad-response', 'host returned no result')
    }
    if (result.ok === true) return { ok: true, value: result.value }
    if (result.ok === false) {
      const error = result.error !== null && typeof result.error === 'object' ? result.error : {}
      return usageFailure(
        typeof error.code === 'string' ? error.code : 'usage-stats/failed',
        typeof error.message === 'string' ? error.message : 'host rejected the request',
      )
    }
    return usageFailure('usage-stats/bad-response', 'host returned an unknown result shape')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return usageFailure('usage-stats/client-failed', message)
  }
}

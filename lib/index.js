/**
 * dsh-usage-stats — host half.
 *
 * Registers the `/dsh-usage-stats` RPC channel consumed by the settings page
 * (`settings.section` id `usage-stats`) and owns the usage service that folds
 * `ctx.sessionQuery` reads into the snapshot the page renders.
 *
 * Only `node:*` builtins are imported here: a profile's `node_modules` cannot
 * resolve `@deepseek-ai/*`, so every harness capability arrives through the
 * cordis context instead.
 *
 * @module dsh-usage-stats
 */

/** Cordis plugin name; must equal the package name (client-modules row rule). */
export const name = 'dsh-usage-stats'

/** Services required before the RPC channel can be registered. */
export const inject = ['connection', 'sessionQuery']

/** Absolute logical RPC channel owned by this plugin. */
export const CHANNEL = '/dsh-usage-stats'

/**
 * Register the usage service and its RPC channel.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host plugin context.
 */
export function apply(ctx) {
  /** @type {any} */
  let service
  /** @type {Promise<void> | undefined} */
  let loading

  const load = () => {
    loading ??= import('../src/host/service.js')
      .then((mod) => {
        service = mod.createUsageService({
          sessionQuery: ctx.get('sessionQuery'),
          logger: ctx.logger,
          now: () => Date.now(),
        })
        service.start()
        ctx.effect(() => () => service?.dispose(), 'dsh-usage-stats service lifecycle')
      })
      .catch((error) => {
        ctx.logger?.warn?.(`[dsh-usage-stats] service failed to load: ${error instanceof Error ? error.message : String(error)}`)
      })
    return loading
  }

  const fail = (code, message) => ({ ok: false, error: { code, message, details: {} } })

  // Warm the corpus in the background shortly after boot (spec §4): the first
  // page open then renders numbers instead of a long skeleton. Deferred so a
  // cold fold never competes with startup work.
  const warmTimer = setTimeout(() => { void load() }, 3_000)
  if (typeof warmTimer?.unref === 'function') warmTimer.unref()
  ctx.effect(() => () => clearTimeout(warmTimer), 'dsh-usage-stats warm-up schedule')

  // Live increment: every committed assistant message bumps the in-memory
  // rollups immediately, so an open page reflects the running turn without
  // waiting for the next full re-fold. Guarded — the service may still be
  // loading during startup, and a throw here would poison the append feed.
  ctx.on('session/event', (session, event) => {
    if (event?.type !== 'assistant/message' || service === undefined) return
    try {
      service.noteAssistantMessage(event, session.header)
    } catch (error) {
      ctx.logger?.warn?.(`[dsh-usage-stats] live increment failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  })

  ctx.inject(['connection'], (scope) => {
    const connection = scope.root.connection
    if (connection === undefined) return
    const dispose = connection.rpc.handle(CHANNEL, async (endpoint, payload, signal) => {
      await load()
      if (service === undefined) return fail('usage-stats/unavailable', 'usage service is unavailable')
      try {
        switch (endpoint) {
          case 'snapshot':
            return { ok: true, value: await service.snapshot(payload, signal) }
          case 'status':
            return { ok: true, value: service.status() }
          case 'refresh':
            await service.refresh()
            return { ok: true, value: service.status() }
          default:
            return fail('usage-stats/unknown-endpoint', `unknown endpoint: ${endpoint}`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        ctx.logger?.warn?.(`[dsh-usage-stats] ${endpoint} failed: ${message}`)
        return fail('usage-stats/failed', message)
      }
    })
    scope.effect(() => dispose, 'dsh-usage-stats RPC channel')

    // Plain GET route for support: `curl /api/usage-stats/diagnostics` answers
    // what the corpus looked like and which sessions refused to read.
    if (connection.fetch !== undefined) {
      const disposeFetch = connection.fetch.register({
        path: '/api/usage-stats/diagnostics',
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: async () => {
          await load()
          const body = service === undefined
            ? { available: false, reason: 'usage service is unavailable' }
            : { available: true, ...service.diagnostics() }
          return new Response(JSON.stringify(body, undefined, 2), {
            headers: { 'content-type': 'application/json; charset=utf-8' },
          })
        },
      })
      scope.effect(() => disposeFetch, 'dsh-usage-stats diagnostics route')
    }
  })
}

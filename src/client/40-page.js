/**
 * The settings page itself: state, snapshot normalization, and the view tree.
 *
 * Data strategy (documented in docs/reports/ui-page.md):
 * - the snapshot is requested once with `rangeDays: 0` (whole history) and
 *   `heatmap: "day"`, because the reference design shows a full-year heatmap
 *   while the `近 7 日` range is selected;
 * - the 7/30-day window is applied client-side to the trend series, and the
 *   heatmap's 每日/每周/累计 modes are derived client-side from the daily cells;
 * - while `snapshot.progress.warm` is false the page polls until the host's
 *   background warm-up finishes.
 *
 * No JSX and no `import`/`export`: this fragment shares the factory scope.
 */

/** Default trend window. */
const USAGE_DEFAULT_RANGE = 7

/** Supported trend windows (days). */
const USAGE_RANGES = [7, 30]

/** Heatmap aggregation modes, in segmented-control order. */
const USAGE_MODES = ['day', 'week', 'cumulative']

/** Coerce a snapshot field to a finite number. */
function usageNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

/** Coerce a snapshot field to a non-empty string. */
function usageString(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

/** Sum a numeric field over normalized rows. */
function usageSum(rows, field) {
  if (!Array.isArray(rows)) return 0
  let total = 0
  for (const row of rows) {
    if (row === null || row === undefined) continue
    total += usageNumber(row[field])
  }
  return total
}

/** One compact value + label pair in the trend summary. */
function usageSummaryItem(value, label) {
  return h(
    'span',
    { className: 'dsh-usage-trend-summary-item' },
    h('strong', { className: 'dsh-usage-trend-summary-value' }, value),
    h('span', { className: 'dsh-usage-trend-summary-label' }, label),
  )
}

/** Normalize the host snapshot into the exact shape the view consumes. */
function normalizeSnapshot(raw) {
  const source = raw !== null && typeof raw === 'object' ? raw : {}
  const totals = source.totals !== null && typeof source.totals === 'object' ? source.totals : {}
  const heatmap = source.heatmap !== null && typeof source.heatmap === 'object' ? source.heatmap : {}
  const progress = source.progress !== null && typeof source.progress === 'object' ? source.progress : {}
  const scope = source.scope !== null && typeof source.scope === 'object' ? source.scope : {}

  const cells = Array.isArray(heatmap.cells)
    ? heatmap.cells
      .filter((cell) => cell !== null && typeof cell === 'object' && parseDateKey(cell.date) !== null)
      .map((cell) => ({
        date: cell.date,
        tokens: usageNumber(cell.tokens),
        messages: usageNumber(cell.messages),
        level: usageNumber(cell.level),
      }))
    : []

  const daily = Array.isArray(source.daily)
    ? source.daily
      .filter((row) => row !== null && typeof row === 'object' && parseDateKey(row.date) !== null)
      .map((row) => ({
        date: row.date,
        tokens: usageNumber(row.tokens),
        messages: usageNumber(row.messages),
        turns: usageNumber(row.turns),
      }))
    : []

  const models = Array.isArray(source.models)
    ? source.models
      .filter((model) => model !== null && typeof model === 'object')
      .map((model) => ({
        provider: usageString(model.provider, ''),
        model: usageString(model.model, ''),
        tokens: usageNumber(model.tokens),
        messages: usageNumber(model.messages),
        share: usageNumber(model.share),
      }))
    : []

  const workspaces = Array.isArray(source.workspaces)
    ? source.workspaces
      .filter((workspace) => workspace !== null && typeof workspace === 'object' && typeof workspace.cwd === 'string')
      .map((workspace) => ({
        cwd: workspace.cwd,
        label: usageString(workspace.label, workspaceBasename(workspace.cwd) || workspace.cwd),
        sessions: usageNumber(workspace.sessions),
        tokens: usageNumber(workspace.tokens),
        lastActiveAt: usageNumber(workspace.lastActiveAt),
      }))
    : []

  const sessions = Array.isArray(source.sessions)
    ? source.sessions
      .filter((session) => session !== null && typeof session === 'object' && typeof session.id === 'string')
      .map((session) => ({
        id: session.id,
        title: usageString(session.title, ''),
        cwd: usageString(session.cwd, ''),
        createdAt: usageNumber(session.createdAt),
        lastActivityAt: usageNumber(session.lastActivityAt),
        tokens: usageNumber(session.tokens),
        messages: usageNumber(session.messages),
        durationMs: usageNumber(session.durationMs),
      }))
    : []

  return {
    generatedAt: usageNumber(source.generatedAt),
    scope: {
      kind: scope.kind === 'workspace' ? 'workspace' : 'all',
      cwd: usageString(scope.cwd, ''),
    },
    totals: {
      tokens: usageNumber(totals.tokens),
      inputTokens: usageNumber(totals.inputTokens),
      outputTokens: usageNumber(totals.outputTokens),
      cacheReadTokens: usageNumber(totals.cacheReadTokens),
      cacheWriteTokens: usageNumber(totals.cacheWriteTokens),
      peakDayTokens: usageNumber(totals.peakDayTokens),
      peakDay: usageString(totals.peakDay, ''),
      longestChatMs: usageNumber(totals.longestChatMs),
      longestChatSessionId: usageString(totals.longestChatSessionId, ''),
      currentStreakDays: usageNumber(totals.currentStreakDays),
      longestStreakDays: usageNumber(totals.longestStreakDays),
      messages: usageNumber(totals.messages),
      turns: usageNumber(totals.turns),
      sessions: usageNumber(totals.sessions),
    },
    heatmap: {
      mode: usageString(heatmap.mode, 'day'),
      start: usageString(heatmap.start, ''),
      end: usageString(heatmap.end, ''),
      max: usageNumber(heatmap.max),
      cells,
    },
    daily,
    models,
    workspaces,
    sessions,
    progress: {
      warm: progress.warm !== false,
      done: usageNumber(progress.done),
      total: usageNumber(progress.total),
    },
  }
}

/** Merge workspace lists so a filtered snapshot can never shrink the dropdown. */
function mergeWorkspaces(previous, next) {
  const merged = new Map()
  for (const workspace of Array.isArray(previous) ? previous : []) {
    if (workspace !== null && workspace !== undefined && typeof workspace.cwd === 'string') merged.set(workspace.cwd, workspace)
  }
  for (const workspace of Array.isArray(next) ? next : []) {
    if (workspace !== null && workspace !== undefined && typeof workspace.cwd === 'string') merged.set(workspace.cwd, workspace)
  }
  return Array.from(merged.values()).sort((left, right) => {
    const byActivity = (right.lastActiveAt || 0) - (left.lastActiveAt || 0)
    if (byActivity !== 0) return byActivity
    return String(left.label).localeCompare(String(right.label))
  })
}

/** Resolve a workspace display label from the snapshot list. */
function usageWorkspaceLabel(cwd, workspaces, t) {
  const list = Array.isArray(workspaces) ? workspaces : []
  const found = list.find((workspace) => workspace !== null && workspace !== undefined && workspace.cwd === cwd)
  if (found !== undefined && typeof found.label === 'string' && found.label.length > 0) return found.label
  return workspaceBasename(cwd) || t('noWorkspace')
}

/** Read the active locale id (`zh` / `en`) from the locale service. */
function usageLocaleId(localeService) {
  try {
    if (localeService === undefined || localeService === null) return 'zh'
    const snapshot = typeof localeService.getSnapshot === 'function'
      ? localeService.getSnapshot()
      : typeof localeService.getLocale === 'function' ? localeService.getLocale() : undefined
    const active = snapshot !== undefined && snapshot !== null && typeof snapshot.active === 'string'
      ? snapshot.active.toLowerCase()
      : 'zh'
    return active.startsWith('en') ? 'en' : 'zh'
  } catch (error) {
    return 'zh'
  }
}

/** One metric cell. */
function UsageMetric(props) {
  const extra = props.title
  let detail = props.value
  if (extra !== undefined && extra !== null && extra !== '' && extra !== props.value) {
    detail = String(extra).startsWith(String(props.value)) ? String(extra) : `${props.value} · ${extra}`
  }
  return h(
    'div',
    { className: 'dsh-usage-metric', role: 'listitem' },
    h('div', { className: 'dsh-usage-metric-value', title: detail }, props.value),
    h('div', { className: 'dsh-usage-metric-label' }, props.label),
  )
}

/** One segmented-control button. */
function usageSegButton(label, active, onClick, key) {
  return h(
    'button',
    {
      key,
      type: 'button',
      className: active ? 'dsh-usage-seg-btn is-active' : 'dsh-usage-seg-btn',
      'aria-pressed': active,
      onClick,
    },
    label,
  )
}

/** Loading / warm-up progress line. */
function UsageProgressLine(props) {
  const { t, progress } = props
  const total = progress !== null && progress !== undefined ? Math.max(0, progress.total) : 0
  const done = progress !== null && progress !== undefined ? Math.max(0, Math.min(progress.done, total || progress.done)) : 0
  const text = total > 0 ? t('loadingProgress', { done, total }) : t('loading')
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  return h(
    'div',
    { className: 'dsh-usage-loading-row', role: 'status', 'aria-live': 'polite' },
    h('span', { className: 'dsh-usage-loading-text' }, text),
    total > 0
      ? h('span', { className: 'dsh-usage-progress' }, h('span', {
        className: 'dsh-usage-progress-fill',
        style: { width: `${percent}%` },
      }))
      : null,
  )
}

/** Error banner with a retry affordance. */
function UsageErrorCard(props) {
  const { t, error, onRetry } = props
  return h(
    'div',
    { className: 'dsh-usage-error', role: 'alert' },
    h('div', { className: 'dsh-usage-error-title' }, t('errorTitle')),
    h('div', { className: 'dsh-usage-error-body' }, error === null || error === undefined || error === '' ? t('errorHint') : String(error)),
    h('button', { type: 'button', className: 'dsh-usage-retry', onClick: onRetry }, t('retry')),
  )
}

/** Skeleton blocks shown while the first snapshot is loading. */
function UsageSkeleton(props) {
  const { t, progress } = props
  return h(
    'div',
    { className: 'dsh-usage-loading' },
    h(UsageProgressLine, { t, progress: progress || { warm: false, done: 0, total: 0 } }),
    h(
      'div',
      { className: 'dsh-usage-card dsh-usage-metrics-card' },
      h(
        'div',
        { className: 'dsh-usage-metrics' },
        Array.from({ length: 5 }, (unused, index) => h(
          'div',
          { key: index, className: 'dsh-usage-metric' },
          h('div', { className: 'dsh-usage-skeleton', style: { width: '84px', height: '28px', margin: '0 auto' } }),
          h('div', { className: 'dsh-usage-skeleton', style: { width: '64px', height: '13px', margin: '10px auto 0' } }),
        )),
      ),
    ),
    h(
      'div',
      { className: 'dsh-usage-card' },
      h(
        'div',
        { className: 'dsh-usage-card-head' },
        h('div', { className: 'dsh-usage-skeleton', style: { width: '96px', height: '18px' } }),
        h('div', { className: 'dsh-usage-skeleton', style: { width: '168px', height: '28px', borderRadius: '999px' } }),
      ),
      h('div', { className: 'dsh-usage-skeleton', style: { width: '100%', height: '116px' } }),
    ),
    h(
      'div',
      { className: 'dsh-usage-card' },
      h(
        'div',
        { className: 'dsh-usage-card-head' },
        h('div', { className: 'dsh-usage-skeleton', style: { width: '148px', height: '18px' } }),
      ),
      h('div', { className: 'dsh-usage-skeleton', style: { width: '100%', height: '220px' } }),
    ),
  )
}

/**
 * Pure view for the usage page. Kept separate from `UsageSection` so tests can
 * render a fully populated page without waiting for RPC effects.
 */
function UsagePageContent(props) {
  const {
    t,
    locale,
    snapshot,
    workspaces,
    scope,
    range,
    mode,
    loading,
    error,
    progress,
    onScopeChange,
    onRangeChange,
    onModeChange,
    onRetry,
  } = props

  const trend = React.useMemo(() => {
    if (snapshot === null) return []
    const end = snapshot.heatmap.end !== ''
      ? snapshot.heatmap.end
      : snapshot.daily.length > 0 ? snapshot.daily[snapshot.daily.length - 1].date : undefined
    return buildTrendSeries(snapshot.daily, range, end)
  }, [snapshot, range])

  const heatmapTotal = React.useMemo(
    () => (snapshot === null ? 0 : usageSum(snapshot.heatmap.cells, 'tokens')),
    [snapshot],
  )

  const trendSummary = React.useMemo(() => {
    const total = usageSum(trend, 'tokens')
    const messages = usageSum(trend, 'messages')
    return { total, messages, average: trend.length > 0 ? total / trend.length : 0 }
  }, [trend])

  const totals = snapshot === null ? null : snapshot.totals
  const warmingEmpty = snapshot !== null
    && progress !== null && progress !== undefined
    && progress.warm === false
    && totals.tokens === 0
    && totals.sessions === 0

  const options = Array.isArray(workspaces) ? workspaces.slice() : []
  if (scope !== 'all' && !options.some((workspace) => workspace.cwd === scope)) {
    options.unshift({ cwd: scope, label: workspaceBasename(scope) || scope })
  }
  const pillLabel = scope === 'all' ? t('pillAll') : usageWorkspaceLabel(scope, options, t)

  const header = h(
    'header',
    { className: 'dsh-usage-hero' },
    h(
      'div',
      { className: 'dsh-usage-hero-main' },
      h(
        'div',
        { className: 'dsh-usage-hero-icon', 'aria-hidden': 'true' },
        h(
          'svg',
          { viewBox: '0 0 24 24', width: 22, height: 22, focusable: 'false' },
          h('rect', { className: 'dsh-usage-hero-bar', x: 3.5, y: 13, width: 3, height: 7, rx: 1 }),
          h('rect', { className: 'dsh-usage-hero-bar', x: 10.5, y: 9, width: 3, height: 11, rx: 1 }),
          h('rect', { className: 'dsh-usage-hero-bar', x: 17.5, y: 5, width: 3, height: 15, rx: 1 }),
          h('path', { className: 'dsh-usage-hero-spark', d: 'M4 9.5 L9.5 5.5 L14 7.5 L20 2.5' }),
        ),
      ),
      h(
        'div',
        { className: 'dsh-usage-hero-text' },
        h(
          'div',
          { className: 'dsh-usage-hero-title-row' },
          h('h2', { className: 'dsh-usage-title' }, t('title')),
          h('span', { className: 'dsh-usage-pill', title: scope === 'all' ? t('workspaceAll') : scope }, pillLabel),
        ),
        h('p', { className: 'dsh-usage-hero-subtitle' }, t('heroSubtitle')),
      ),
    ),
    h(
      'div',
      { className: 'dsh-usage-header-right dsh-usage-hero-actions' },
      h(
        'label',
        { className: 'dsh-usage-select-wrap' },
        h('span', { className: 'dsh-usage-sr-only' }, t('workspaceLabel')),
        h(
          'select',
          {
            className: 'dsh-usage-select',
            value: scope,
            'aria-label': t('workspaceLabel'),
            onChange: (event) => onScopeChange(event.target.value),
          },
          h('option', { value: 'all' }, t('workspaceAll')),
          options.map((workspace) => h(
            'option',
            { key: workspace.cwd, value: workspace.cwd, title: workspace.cwd },
            workspace.label || workspaceBasename(workspace.cwd) || workspace.cwd,
          )),
        ),
        h('span', { className: 'dsh-usage-select-caret', 'aria-hidden': 'true' }, '▾'),
      ),
    ),
  )

  const body = []
  if (snapshot === null || warmingEmpty) {
    body.push(loading || warmingEmpty ? h(UsageSkeleton, { t, progress }) : h(UsageErrorCard, { t, error, onRetry }))
  } else {
    if (error !== null && error !== undefined && error !== '') {
      body.push(h(UsageErrorCard, { t, error, onRetry }))
    }
    if (progress !== null && progress !== undefined && progress.warm === false) {
      body.push(h(UsageProgressLine, { t, progress }))
    }

    body.push(h(
      'section',
      { className: 'dsh-usage-card dsh-usage-metrics-card' },
      h(
        'div',
        { className: 'dsh-usage-metrics', role: 'list', 'aria-label': t('metricsLabel') },
        h(UsageMetric, {
          label: t('metricTotal'),
          value: formatTokens(totals.tokens, locale),
          title: formatCount(totals.tokens),
        }),
        h(UsageMetric, {
          label: t('metricPeak'),
          value: formatTokens(totals.peakDayTokens, locale),
          title: totals.peakDay === ''
            ? formatCount(totals.peakDayTokens)
            : `${formatCount(totals.peakDayTokens)} · ${t('peakDay', { date: formatDate(totals.peakDay, locale) })}`,
        }),
        h(UsageMetric, {
          label: t('metricLongestChat'),
          value: formatDuration(totals.longestChatMs, locale),
          title: formatDurationExact(totals.longestChatMs, locale),
        }),
        h(UsageMetric, {
          label: t('metricCurrentStreak'),
          value: formatDays(totals.currentStreakDays, locale),
        }),
        h(UsageMetric, {
          label: t('metricLongestStreak'),
          value: formatDays(totals.longestStreakDays, locale),
        }),
      ),
    ))

    body.push(h(
      'section',
      { className: 'dsh-usage-card dsh-usage-activity-card', 'aria-label': t('tokenActivity') },
      h(
        'div',
        { className: 'dsh-usage-card-head' },
        h(
          'div',
          { className: 'dsh-usage-card-heading' },
          h('h3', { className: 'dsh-usage-card-title' }, t('tokenActivity')),
          h('p', { className: 'dsh-usage-card-subtitle' }, t('heatmapSubtitle', {
            tokens: formatTokens(heatmapTotal, locale),
          })),
        ),
        h(
          'div',
          { className: 'dsh-usage-seg', role: 'group', 'aria-label': t('tokenActivity') },
          USAGE_MODES.map((value) => usageSegButton(
            t(`mode${value.charAt(0).toUpperCase()}${value.slice(1)}`),
            mode === value,
            () => onModeChange(value),
            value,
          )),
        ),
      ),
      h(Heatmap, { cells: snapshot.heatmap.cells, mode, t, locale }),
    ))

    body.push(h(
      'div',
      { className: 'dsh-usage-range-row' },
      h('span', { className: 'dsh-usage-range-label' }, t('timeRange')),
      h(
        'div',
        { className: 'dsh-usage-seg', role: 'group', 'aria-label': t('timeRange') },
        USAGE_RANGES.map((days) => usageSegButton(
          days === 7 ? t('range7') : t('range30'),
          range === days,
          () => onRangeChange(days),
          days,
        )),
      ),
    ))

    body.push(h(
      'section',
      { className: 'dsh-usage-card dsh-usage-trend-card', 'aria-label': t('trendTitle') },
      h(
        'div',
        { className: 'dsh-usage-card-head' },
        h(
          'div',
          { className: 'dsh-usage-card-heading' },
          h('h3', { className: 'dsh-usage-card-title' }, t('trendTitle')),
          h(
            'div',
            { className: 'dsh-usage-trend-summary' },
            usageSummaryItem(formatTokens(trendSummary.total, locale), t('trendSummaryTotal')),
            usageSummaryItem(formatTokens(trendSummary.average, locale), t('trendSummaryAvg')),
            usageSummaryItem(formatCount(trendSummary.messages), t('trendSummaryMessages')),
          ),
        ),
      ),
      h(TrendChart, { daily: trend, t, locale }),
    ))

    body.push(h(
      'section',
      { className: 'dsh-usage-card', 'aria-label': t('modelsTitle') },
      h(
        'div',
        { className: 'dsh-usage-card-head' },
        h('h3', { className: 'dsh-usage-card-title' }, t('modelsTitle')),
      ),
      h(ModelUsage, { models: snapshot.models, totalTokens: totals.tokens, t, locale }),
    ))
  }

  return h('div', { className: 'dsh-usage-root dsh-usage-page' }, header, ...body)
}

/**
 * Stateful settings section.
 *
 * Props come from the slot registration's `inject()` face: `{ t, request, locale }`.
 * `initialSnapshot` is an optional test/preload affordance.
 */
function UsageSection(props) {
  const t = props.t
  const localeService = props.locale
  const requestRef = React.useRef(props.request)
  requestRef.current = props.request

  const [, forceRender] = React.useReducer((value) => value + 1, 0)
  React.useEffect(() => {
    if (localeService === undefined || localeService === null || typeof localeService.subscribe !== 'function') return undefined
    return localeService.subscribe(() => forceRender())
  }, [localeService])

  const initial = React.useMemo(
    () => (props.initialSnapshot === undefined || props.initialSnapshot === null ? null : normalizeSnapshot(props.initialSnapshot)),
    [props.initialSnapshot],
  )
  const [snapshot, setSnapshot] = React.useState(initial)
  const [scope, setScope] = React.useState('all')
  const [range, setRange] = React.useState(USAGE_DEFAULT_RANGE)
  const [mode, setMode] = React.useState('day')
  const [error, setError] = React.useState(null)
  const [loading, setLoading] = React.useState(initial === null)
  const [tick, setTick] = React.useState(0)
  const hasDataRef = React.useRef(initial !== null)
  const workspacesRef = React.useRef(initial === null ? [] : initial.workspaces)
  const [workspaces, setWorkspaces] = React.useState(initial === null ? [] : initial.workspaces)

  React.useEffect(() => {
    let cancelled = false
    let timer = null
    let sawWarming = false
    let refreshed = false

    const load = () => {
      if (!hasDataRef.current) setLoading(true)
      const request = requestRef.current
      if (typeof request !== 'function') {
        setError('usage-stats/no-request')
        setLoading(false)
        return
      }
      let pending
      try {
        pending = request('snapshot', { scope, rangeDays: 0, heatmap: 'day' })
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : String(failure))
        setLoading(false)
        return
      }
      Promise.resolve(pending)
        .then((result) => {
          if (cancelled) return
          if (result === null || result === undefined || result.ok !== true) {
            const failure = result !== null && result !== undefined && result.error !== undefined && result.error !== null
              ? result.error
              : undefined
            const message = failure === undefined
              ? 'unknown error'
              : (failure.message || failure.code || 'unknown error')
            setError(String(message))
            setLoading(false)
            return
          }
          const next = normalizeSnapshot(result.value)
          hasDataRef.current = true
          setSnapshot(next)
          setError(null)
          setLoading(false)
          const merged = mergeWorkspaces(workspacesRef.current, next.workspaces)
          if (merged.length > 0) {
            workspacesRef.current = merged
            setWorkspaces(merged)
          }
          if (next.progress.warm === false) {
            sawWarming = true
            timer = setTimeout(load, 1500)
          } else if (sawWarming && !refreshed) {
            // Warm-up just finished, but the host memoises snapshots for ~10s
            // and the last pre-warm response may still be that partial one:
            // force one refresh + snapshot round trip so the page settles on the
            // complete numbers instead of freezing on the partial ones.
            refreshed = true
            timer = setTimeout(() => refreshThenLoad(request), 150)
          }
        })
        .catch((failure) => {
          if (cancelled) return
          setError(failure instanceof Error ? failure.message : String(failure))
          setLoading(false)
        })
    }

    const refreshThenLoad = (request) => {
      let pendingRefresh
      try {
        pendingRefresh = request('refresh', {})
      } catch (failure) {
        pendingRefresh = undefined
      }
      Promise.resolve(pendingRefresh)
        .catch(() => {})
        .then(() => {
          if (!cancelled) load()
        })
    }

    load()
    return () => {
      cancelled = true
      if (timer !== null) clearTimeout(timer)
    }
  }, [scope, tick])

  const handleRetry = () => {
    hasDataRef.current = false
    setSnapshot(null)
    setError(null)
    setLoading(true)
    setTick((value) => value + 1)
  }

  const activeLocale = usageLocaleId(localeService)
  const progress = snapshot === null ? null : snapshot.progress

  return h(UsagePageContent, {
    t,
    locale: activeLocale,
    snapshot,
    workspaces,
    scope,
    range,
    mode,
    loading,
    error,
    progress,
    onScopeChange: (value) => setScope(value === '' ? 'all' : value),
    onRangeChange: (value) => setRange(value),
    onModeChange: (value) => setMode(value),
    onRetry: handleRetry,
  })
}

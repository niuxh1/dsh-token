/**
 * Hand-drawn charts for the usage page.
 *
 * React components are built with `React.createElement` (no JSX, no build
 * step). The heatmap follows GitHub's contribution graph: columns are
 * Monday-anchored weeks, rows are Monday … Sunday, and intensity is bucketed
 * over the non-zero values at p20/p40/p60/p80.
 */

/** `React.createElement` shorthand, shared with `40-page.js`. */
const h = React.createElement

/** Heatmap cell edge, gap, and column pitch (must match 00-style.js). */
const HEAT_CELL = 11
const HEAT_GAP = 3
const HEAT_STEP = HEAT_CELL + HEAT_GAP

/** Number of chart plot columns reserved on the left for Y-axis labels. */
const TREND_WIDTH = 960
const TREND_HEIGHT = 240
const TREND_PAD = { left: 60, right: 20, top: 26, bottom: 34 }

/**
 * Apply the selected heatmap aggregation to the snapshot's daily cells.
 *
 * The snapshot is requested once in `day` mode (see `40-page.js`), so all three
 * modes are derived here:
 * - `day`        → each cell keeps its own tokens/messages;
 * - `week`       → every cell of an ISO week shows that week's total;
 * - `cumulative` → every cell shows the running total since the window start.
 *
 * @param {object[]} cells - daily heatmap cells.
 * @param {"day"|"week"|"cumulative"} mode - selected aggregation.
 * @returns {object[]} cells with the aggregated `tokens`/`messages`.
 */
function heatmapSeries(cells, mode) {
  const list = Array.isArray(cells)
    ? cells
      .filter((cell) => cell && typeof cell.date === 'string')
      .slice()
      .sort((left, right) => (left.date < right.date ? -1 : left.date > right.date ? 1 : 0))
    : []
  if (mode !== 'week' && mode !== 'cumulative') {
    return list.map((cell) => ({ ...cell, tokens: toFinite(cell.tokens), messages: toFinite(cell.messages) }))
  }
  if (mode === 'week') {
    const totals = new Map()
    for (const cell of list) {
      const key = weekStartKey(cell.date)
      const bucket = totals.get(key) ?? { tokens: 0, messages: 0 }
      bucket.tokens += toFinite(cell.tokens)
      bucket.messages += toFinite(cell.messages)
      totals.set(key, bucket)
    }
    return list.map((cell) => {
      const bucket = totals.get(weekStartKey(cell.date)) ?? { tokens: 0, messages: 0 }
      return { ...cell, tokens: bucket.tokens, messages: bucket.messages }
    })
  }
  let tokens = 0
  let messages = 0
  return list.map((cell) => {
    tokens += toFinite(cell.tokens)
    messages += toFinite(cell.messages)
    return { ...cell, tokens, messages }
  })
}

/**
 * Month labels for the heatmap's footer.
 *
 * A label is placed on the week column where a new month first appears, and
 * skipped when it would collide with the previous label (fewer than two
 * columns apart).
 *
 * @param {Array<Array<object|null>>} weeks - Monday-anchored week columns.
 * @param {string} locale - `"zh"` or `"en"`.
 * @returns {{column: number, label: string}[]} labels with their column index.
 */
function heatmapMonthLabels(weeks, locale) {
  const labels = []
  let lastMonth = -1
  let lastColumn = -10
  weeks.forEach((week, column) => {
    const first = week.find((cell) => cell !== null && cell !== undefined)
    if (first === undefined) return
    const parts = parseDateKey(first.date)
    if (parts === null) return
    if (parts.month === lastMonth) return
    lastMonth = parts.month
    if (column - lastColumn < 2) return
    labels.push({ column, label: formatMonth(parts.month, locale) })
    lastColumn = column
  })
  return labels
}

/**
 * Build everything the heatmap needs from snapshot cells.
 * @param {object[]} cells - snapshot cells.
 * @param {string} mode - heatmap mode.
 * @param {string} locale - active locale.
 * @returns {{weeks: Array<Array<object|null>>, thresholds: number[], labels: {column:number,label:string}[], max: number}} model.
 */
function buildHeatmapModel(cells, mode, locale) {
  const series = heatmapSeries(cells, mode)
  const weeks = buildWeeks(series)
  const thresholds = computeThresholds(series.map((cell) => toFinite(cell.tokens)))
  const max = series.reduce((current, cell) => Math.max(current, toFinite(cell.tokens)), 0)
  return { weeks, thresholds, labels: heatmapMonthLabels(weeks, locale), max, days: series.length }
}

/** Shared dashed empty state. */
function UsageEmpty(props) {
  return h(
    'div',
    { className: 'dsh-usage-empty' },
    h('div', { className: 'dsh-usage-empty-title' }, props.t('emptyTitle')),
    h('div', { className: 'dsh-usage-empty-body' }, props.t('emptyBody')),
  )
}

/**
 * Measure an element's inline size so SVG charts can draw 1:1 CSS pixels.
 *
 * The settings panel is ~520px wide even when the window is large, so a fixed
 * 960-unit viewBox would shrink 11px axis text to ~6px. Measuring keeps text
 * legible at every panel width; ResizeObserver re-measures on layout changes.
 *
 * @param {{current: Element|null}} ref - element to observe.
 * @param {number} fallback - width used before the first measurement / in SSR.
 * @returns {number} measured inline size in CSS pixels.
 */
function useElementWidth(ref, fallback) {
  const [width, setWidth] = React.useState(fallback)
  React.useEffect(() => {
    const node = ref.current
    if (node === null || node === undefined) return undefined
    const update = () => {
      const next = Math.round(node.getBoundingClientRect().width)
      if (next > 0) setWidth(next)
    }
    update()
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(update)
      observer.observe(node)
      return () => observer.disconnect()
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    return undefined
  }, [ref])
  return width
}

/**
 * GitHub-style activity heatmap with a hover tooltip.
 *
 * Drawn as one SVG with a natural 11px/3px grid (`HEAT_CELL`/`HEAT_GAP`) inside
 * a `viewBox`, then stretched to `width: 100%`; the cells therefore scale with
 * the settings panel instead of overflowing its ~520px content column. The
 * number of columns always follows the actual week count in the snapshot.
 *
 * @param {{cells: object[], mode: string, t: Function, locale: string}} props - component props.
 */
function Heatmap(props) {
  const { cells, mode, t, locale } = props
  const [hover, setHover] = React.useState(null)
  const wrapRef = React.useRef(null)
  const model = React.useMemo(() => buildHeatmapModel(cells, mode, locale), [cells, mode, locale])

  if (model.weeks.length === 0) return h(UsageEmpty, { t })

  const columns = model.weeks.length
  const gridWidth = columns * HEAT_STEP - HEAT_GAP
  const gridHeight = 7 * HEAT_STEP - HEAT_GAP

  const handleEnter = (event, cell) => {
    const wrap = wrapRef.current
    if (wrap === null) return
    const wrapRect = wrap.getBoundingClientRect()
    const cellRect = event.currentTarget.getBoundingClientRect()
    const centerX = cellRect.left - wrapRect.left + cellRect.width / 2
    const limit = Math.max(64, wrapRect.width - 64)
    const cellTop = cellRect.top - wrapRect.top
    const cellBottom = cellRect.bottom - wrapRect.top
    const viewportHeight = typeof window !== 'undefined' && typeof window.innerHeight === 'number'
      ? window.innerHeight
      : 0
    // Prefer below the cell (never over the card's segmented control); flip
    // above only when the viewport has no room underneath.
    const spaceBelow = viewportHeight - cellRect.bottom
    const spaceAbove = cellRect.top
    const placeBelow = spaceBelow >= 72 || spaceAbove < 72
    setHover({
      date: cell.date,
      tokens: toFinite(cell.tokens),
      messages: toFinite(cell.messages),
      x: Math.max(64, Math.min(centerX, limit)),
      top: placeBelow ? cellBottom + 6 : cellTop - 6,
      above: !placeBelow,
    })
  }

  const cellsView = []
  model.weeks.forEach((week, weekIndex) => {
    week.forEach((cell, dayIndex) => {
      if (cell === null || cell === undefined) return
      const classes = ['dsh-usage-heat-cell']
      if (hover !== null && hover.date === cell.date) classes.push('is-hover')
      cellsView.push(h('rect', {
        key: `${weekIndex}-${dayIndex}`,
        x: weekIndex * HEAT_STEP,
        y: dayIndex * HEAT_STEP,
        width: HEAT_CELL,
        height: HEAT_CELL,
        rx: 2,
        ry: 2,
        className: classes.join(' '),
        'data-level': levelOf(cell.tokens, model.thresholds),
        'aria-hidden': 'true',
        onMouseEnter: (event) => handleEnter(event, cell),
        onMouseLeave: () => setHover(null),
      }))
    })
  })

  return h(
    'div',
    { className: 'dsh-usage-heat', ref: wrapRef },
    h(
      'div',
      { className: 'dsh-usage-heat-main' },
      h(
        'div',
        { className: 'dsh-usage-heat-weekdays', 'aria-hidden': 'true' },
        h('span', { className: 'dsh-usage-heat-weekday', style: { gridRow: '1' } }, t('weekdayMon')),
        h('span', { className: 'dsh-usage-heat-weekday', style: { gridRow: '3' } }, t('weekdayWed')),
        h('span', { className: 'dsh-usage-heat-weekday', style: { gridRow: '5' } }, t('weekdayFri')),
      ),
      h(
        'div',
        { className: 'dsh-usage-heat-canvas' },
        h(
          'svg',
          {
            className: 'dsh-usage-heat-svg',
            viewBox: `0 0 ${gridWidth} ${gridHeight}`,
            preserveAspectRatio: 'xMinYMid meet',
            role: 'img',
            'aria-label': t('heatmapLabel', { days: model.days }),
            onMouseLeave: () => setHover(null),
          },
          cellsView,
        ),
        h(
          'div',
          { className: 'dsh-usage-heat-months' },
          model.labels.map((entry) => h(
            'span',
            {
              key: `${entry.column}-${entry.label}`,
              className: 'dsh-usage-heat-month',
              style: entry.column >= columns - 3
                ? { right: '0px' }
                : { left: `${((entry.column * HEAT_STEP) / gridWidth) * 100}%` },
            },
            entry.label,
          )),
        ),
      ),
    ),
    h(
      'div',
      { className: 'dsh-usage-heat-legend' },
      h('span', { className: 'dsh-usage-heat-legend-label' }, t('heatLegendLess')),
      [0, 1, 2, 3, 4].map((level) => h('span', {
        key: level,
        className: 'dsh-usage-heat-swatch',
        'data-level': level,
        'aria-hidden': 'true',
      })),
      h('span', { className: 'dsh-usage-heat-legend-label' }, t('heatLegendMore')),
    ),
    hover === null
      ? null
      : h(
        'div',
        {
          className: 'dsh-usage-tooltip',
          style: {
            left: `${hover.x}px`,
            top: `${hover.top}px`,
            transform: hover.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          },
        },
        h('div', null, formatDate(hover.date, locale)),
        h('div', { className: 'dsh-usage-tooltip-sub' }, t('heatTooltip', {
          tokens: formatTokens(hover.tokens, locale),
          messages: formatCount(hover.messages),
        })),
      ),
  )
}

/**
 * Daily token trend: bars for each day plus an area/line overlay and a hover
 * crosshair. Y axis carries three labels (max, half, zero).
 *
 * @param {{daily: object[], t: Function, locale: string}} props - component props.
 */
function TrendChart(props) {
  const { daily, t, locale } = props
  const [hoverIndex, setHoverIndex] = React.useState(null)
  const wrapRef = React.useRef(null)
  const measuredWidth = useElementWidth(wrapRef, TREND_WIDTH)
  const series = Array.isArray(daily) ? daily : []
  const max = series.reduce((current, row) => Math.max(current, toFinite(row.tokens)), 0)

  if (series.length === 0 || max <= 0) return h(UsageEmpty, { t })

  const chartWidth = Math.max(320, measuredWidth)
  const plotWidth = chartWidth - TREND_PAD.left - TREND_PAD.right
  const plotHeight = TREND_HEIGHT - TREND_PAD.top - TREND_PAD.bottom
  const step = plotWidth / series.length
  const barWidth = Math.max(2, Math.min(18, step * 0.55))
  const baseY = TREND_PAD.top + plotHeight
  const pointX = (index) => TREND_PAD.left + step * (index + 0.5)
  const pointY = (tokens) => baseY - (Math.max(0, toFinite(tokens)) / max) * plotHeight

  const points = series.map((row, index) => [pointX(index), pointY(row.tokens)])
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point[0].toFixed(2)},${point[1].toFixed(2)}`)
    .join(' ')
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(2)},${baseY} L${points[0][0].toFixed(2)},${baseY} Z`
  const yTicks = [max, max / 2, 0]
  const labelStep = series.length <= 10 ? 1 : Math.ceil(series.length / 6)
  const xTickIndexes = series
    .map((row, index) => index)
    .filter((index) => index % labelStep === 0 || index === series.length - 1)

  const handleMove = (event) => {
    const svg = event.currentTarget.ownerSVGElement
    if (svg === null || svg === undefined) return
    const rect = svg.getBoundingClientRect()
    if (rect.width <= 0) return
    const ratio = chartWidth / rect.width
    const localX = (event.clientX - rect.left) * ratio
    const index = Math.floor((localX - TREND_PAD.left) / step)
    setHoverIndex(Math.max(0, Math.min(series.length - 1, index)))
  }

  const hovered = hoverIndex === null ? null : series[hoverIndex]
  const hoverX = hoverIndex === null ? 0 : pointX(hoverIndex)
  const hoverY = hovered === null ? 0 : pointY(hovered.tokens)
  const tooltipLeft = Math.min(90, Math.max(10, (hoverX / chartWidth) * 100))
  const tooltipTop = Math.max(56, hoverY)

  return h(
    'div',
    { className: 'dsh-usage-trend', ref: wrapRef },
    h(
      'svg',
      {
        viewBox: `0 0 ${chartWidth} ${TREND_HEIGHT}`,
        style: { height: `${TREND_HEIGHT}px` },
        role: 'img',
        'aria-label': t('trendLabel'),
        preserveAspectRatio: 'xMidYMid meet',
      },
      h(
        'defs',
        null,
        h(
          'linearGradient',
          { id: 'dsh-usage-trend-gradient', x1: '0', y1: '0', x2: '0', y2: '1' },
          h('stop', { offset: '0%', className: 'dsh-usage-trend-gradient-top' }),
          h('stop', { offset: '100%', className: 'dsh-usage-trend-gradient-bottom' }),
        ),
      ),
      h(
        'g',
        null,
        yTicks.map((tick, index) => h(
          'g',
          { key: `tick-${index}` },
          h('line', {
            x1: TREND_PAD.left,
            x2: TREND_PAD.left + plotWidth,
            y1: pointY(tick),
            y2: pointY(tick),
            className: 'dsh-usage-trend-grid',
          }),
          h('text', {
            x: TREND_PAD.left - 10,
            y: pointY(tick) + 4,
            textAnchor: 'end',
            className: 'dsh-usage-trend-axis',
          }, formatTokens(tick, locale)),
        )),
      ),
      hovered === null
        ? null
        : h('rect', {
          x: pointX(hoverIndex) - step / 2,
          y: TREND_PAD.top,
          width: step,
          height: plotHeight,
          className: 'dsh-usage-trend-hover-band',
        }),
      h(
        'g',
        null,
        series.map((row, index) => {
          const top = pointY(row.tokens)
          return h('rect', {
            key: `bar-${index}`,
            x: pointX(index) - barWidth / 2,
            y: top,
            width: barWidth,
            height: Math.max(0, baseY - top),
            rx: 2,
            className: 'dsh-usage-trend-bar',
          })
        }),
      ),
      h('path', { d: areaPath, className: 'dsh-usage-trend-area' }),
      h('path', { d: linePath, className: 'dsh-usage-trend-line' }),
      h(
        'g',
        null,
        xTickIndexes.map((index) => h('text', {
          key: `x-${index}`,
          x: pointX(index),
          y: TREND_HEIGHT - 10,
          textAnchor: 'middle',
          className: 'dsh-usage-trend-axis',
        }, formatShortDate(series[index].date))),
      ),
      hovered === null
        ? null
        : h(
          'g',
          null,
          h('line', {
            x1: hoverX,
            x2: hoverX,
            y1: TREND_PAD.top,
            y2: baseY,
            className: 'dsh-usage-trend-crosshair',
          }),
          h('circle', { cx: hoverX, cy: hoverY, r: 3.5, className: 'dsh-usage-trend-dot' }),
        ),
      h('rect', {
        x: TREND_PAD.left,
        y: TREND_PAD.top,
        width: plotWidth,
        height: plotHeight,
        fill: 'transparent',
        style: { pointerEvents: 'all', cursor: 'crosshair' },
        onMouseMove: handleMove,
        onMouseLeave: () => setHoverIndex(null),
      }),
    ),
    hovered === null
      ? null
      : h(
        'div',
        {
          className: 'dsh-usage-tooltip',
          style: {
            left: `${tooltipLeft}%`,
            top: `${(tooltipTop / TREND_HEIGHT) * 100}%`,
            transform: 'translate(-50%, calc(-100% - 10px))',
          },
        },
        h('div', null, formatDate(hovered.date, locale)),
        h('div', { className: 'dsh-usage-tooltip-sub' }, t('heatTooltip', {
          tokens: formatTokens(hovered.tokens, locale),
          messages: formatCount(hovered.messages),
        })),
      ),
  )
}

/**
 * Per-model usage rows: identity, token count, share bar, percentage.
 * @param {{models: object[], totalTokens: number, t: Function, locale: string}} props - component props.
 */
function ModelUsage(props) {
  const { models, totalTokens, t, locale } = props
  const list = Array.isArray(models) ? models.filter((model) => model !== null && model !== undefined) : []
  const total = toFinite(totalTokens) || list.reduce((sum, model) => sum + toFinite(model.tokens), 0)
  if (list.length === 0) return h(UsageEmpty, { t })

  return h(
    'div',
    { className: 'dsh-usage-models' },
    h(
      'div',
      { className: 'dsh-usage-model-head' },
      h('span', { className: 'dsh-usage-model-head-cell' }, t('modelsColumnModel')),
      h('span', { className: 'dsh-usage-model-head-cell' }, ''),
      h('span', { className: 'dsh-usage-model-head-cell is-right' }, t('modelsColumnTokens')),
      h('span', { className: 'dsh-usage-model-head-cell is-right' }, t('modelsColumnShare')),
    ),
    list.map((model, index) => {
      const tokens = toFinite(model.tokens)
      const rawShare = toFinite(model.share)
      const share = rawShare > 0 ? Math.min(1, rawShare) : total > 0 ? Math.min(1, tokens / total) : 0
      const name = typeof model.model === 'string' && model.model.length > 0 ? model.model : t('unknownModel')
      const provider = typeof model.provider === 'string' && model.provider.length > 0 ? model.provider : t('unknownProvider')
      return h(
        'div',
        { className: 'dsh-usage-model-row', key: `${provider}/${name}/${index}` },
        h(
          'div',
          { className: 'dsh-usage-model-identity', title: `${provider} · ${name}` },
          h('div', { className: 'dsh-usage-model-name' }, name),
          h('div', { className: 'dsh-usage-model-provider' }, provider),
        ),
        h(
          'div',
          { className: 'dsh-usage-model-bar', role: 'img', 'aria-label': `${name} ${formatPercent(share)}` },
          h('div', { className: 'dsh-usage-model-fill', style: { width: `${Math.max(0, Math.min(100, share * 100))}%` } }),
        ),
        h('div', { className: 'dsh-usage-model-tokens' }, formatTokens(tokens, locale)),
        h('div', { className: 'dsh-usage-model-share' }, formatPercent(share)),
      )
    }),
  )
}

/**
 * Pure formatting and calendar helpers shared by the usage page fragments.
 *
 * The build (`scripts/build-client.mjs`) concatenates every `src/client/*.js`
 * into one factory scope, so this file uses no `import`/`export`. Every helper
 * is a top-level `function` declaration: `test/client-util.test.mjs` evaluates
 * this file through `node:vm`, where function declarations land on the context
 * object and can be asserted directly.
 *
 * All calendar math on `YYYY-MM-DD` keys goes through UTC so a local DST shift
 * can never move a cell into the neighbouring day; `dayKey` itself is local on
 * purpose (the host buckets days in the machine's local timezone).
 */

/** English month abbreviations, kept deterministic instead of using Intl. */
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** One calendar day in milliseconds. */
const DAY_MS = 86400000

/** Coerce any value to a finite number (falling back to 0). */
function toFinite(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

/** Zero-pad a positive integer to two digits. */
function pad2(value) {
  return value < 10 ? `0${value}` : String(value)
}

/** Group an integer with thousands separators (locale independent). */
function groupThousands(value) {
  const amount = Math.round(Math.abs(toFinite(value)))
  const text = String(amount)
  let output = ''
  for (let index = 0; index < text.length; index += 1) {
    if (index > 0 && (text.length - index) % 3 === 0) output += ','
    output += text[index]
  }
  return toFinite(value) < 0 ? `-${output}` : output
}

/** Format a compact decimal, dropping a trailing `.0`. */
function trimDecimal(value) {
  const text = toFinite(value).toFixed(1)
  return text.endsWith('.0') ? text.slice(0, -2) : text
}

/**
 * Format a token count.
 *
 * Chinese copy follows the product spec (>=1e8 → `x.x 亿`, >=1e4 → `x.x 万`,
 * otherwise thousands separators). English copy uses K/M/B so the same numbers
 * read naturally without Chinese magnitude words.
 *
 * @param {number} value - raw token count.
 * @param {string} [locale] - `"zh"` (default) or `"en"`.
 * @returns {string} display text.
 */
function formatTokens(value, locale) {
  const amount = toFinite(value)
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  if (locale === 'en') {
    if (abs >= 1e9) return `${sign}${trimDecimal(abs / 1e9)}B`
    if (abs >= 1e6) return `${sign}${trimDecimal(abs / 1e6)}M`
    if (abs >= 1e3) return `${sign}${trimDecimal(abs / 1e3)}K`
    return `${sign}${groupThousands(abs)}`
  }
  if (abs >= 1e8) return `${sign}${trimDecimal(abs / 1e8)} 亿`
  if (abs >= 1e4) return `${sign}${trimDecimal(abs / 1e4)} 万`
  return `${sign}${groupThousands(abs)}`
}

/**
 * Format a duration in milliseconds.
 *
 * Hours use the short `X 小时 Y 分` form (`3h 25m` in English) so the longest
 * chat card fits the narrow settings panel without ellipsis; sub-hour values
 * keep `N 分钟` / `N min`, and anything under a minute reads `<1 分钟`.
 *
 * @param {number} value - milliseconds.
 * @param {string} [locale] - `"zh"` (default) or `"en"`.
 * @returns {string} `<1 分钟` / `47 分钟` / `3 小时 25 分` (or English equivalents).
 */
function formatDuration(value, locale) {
  const amount = Math.max(0, toFinite(value))
  const english = locale === 'en'
  if (amount < 60000) return english ? '<1 min' : '<1 分钟'
  const totalMinutes = Math.floor(amount / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0 && minutes > 0) return english ? `${hours}h ${minutes}m` : `${hours} 小时 ${minutes} 分`
  if (hours > 0) return english ? `${hours}h` : `${hours} 小时`
  return english ? `${minutes} min` : `${minutes} 分钟`
}

/**
 * Format a duration with second precision for the metric's `title` tooltip.
 *
 * The visible metric uses the short form (`3 小时 25 分`); hovering reveals the
 * exact value (`3 小时 25 分 12 秒`, English `3h 25m 12s`).
 *
 * @param {number} value - milliseconds.
 * @param {string} [locale] - `"zh"` (default) or `"en"`.
 * @returns {string} exact duration text.
 */
function formatDurationExact(value, locale) {
  const amount = Math.max(0, toFinite(value))
  const totalSeconds = Math.floor(amount / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const english = locale === 'en'
  const parts = []
  if (hours > 0) parts.push(english ? `${hours}h` : `${hours} 小时`)
  if (minutes > 0) parts.push(english ? `${minutes}m` : `${minutes} 分`)
  if (seconds > 0 || parts.length === 0) parts.push(english ? `${seconds}s` : `${seconds} 秒`)
  return parts.join(' ')
}

/**
 * Format a streak length with its unit.
 * @param {number} days - number of days.
 * @param {string} [locale] - `"zh"` (default) or `"en"`.
 * @returns {string} `N 天` / `N day(s)`.
 */
function formatDays(days, locale) {
  const amount = Math.max(0, Math.round(toFinite(days)))
  if (locale === 'en') return `${amount} ${amount === 1 ? 'day' : 'days'}`
  return `${amount} 天`
}

/** Format an integer count (messages, turns, sessions). */
function formatCount(value) {
  return groupThousands(Math.round(toFinite(value)))
}

/** Format a 0..1 share as a percentage (42.3%). */
function formatPercent(share) {
  const amount = Math.max(0, Math.min(1, toFinite(share)))
  const rounded = Math.round(amount * 1000) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`
}

/**
 * Local calendar-day key for a timestamp.
 * @param {number|Date} timestamp - epoch milliseconds or a Date.
 * @returns {string} `YYYY-MM-DD` in local time (empty for invalid input).
 */
function dayKey(timestamp) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/**
 * Parse a `YYYY-MM-DD` key into its parts plus a UTC epoch stamp.
 * @param {string} value - date key.
 * @returns {{year: number, month: number, day: number, stamp: number}|null} parsed parts, or null.
 */
function parseDateKey(value) {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const stamp = Date.UTC(year, month - 1, day)
  const date = new Date(stamp)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return { year, month, day, stamp }
}

/** Serialize a UTC date as `YYYY-MM-DD`. */
function isoFromUtc(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

/**
 * Add days to a date key.
 * @param {string} value - `YYYY-MM-DD`.
 * @param {number} amount - signed day offset.
 * @returns {string} shifted key (empty for invalid input).
 */
function addDays(value, amount) {
  const parts = parseDateKey(value)
  if (parts === null) return ''
  return isoFromUtc(new Date(parts.stamp + toFinite(amount) * DAY_MS))
}

/**
 * Monday-anchored week start of a date key.
 * @param {string} value - `YYYY-MM-DD`.
 * @returns {string} the Monday key (empty for invalid input).
 */
function weekStartKey(value) {
  const parts = parseDateKey(value)
  if (parts === null) return ''
  const weekday = new Date(parts.stamp).getUTCDay() // 0 = Sunday
  const offset = (weekday + 6) % 7 // Monday = 0 … Sunday = 6
  return isoFromUtc(new Date(parts.stamp - offset * DAY_MS))
}

/**
 * Format a date key for display.
 * @param {string} value - `YYYY-MM-DD`.
 * @param {string} [locale] - `"zh"` (default) or `"en"`.
 * @returns {string} `2026年2月15日` / `Feb 15, 2026`.
 */
function formatDate(value, locale) {
  const parts = parseDateKey(value)
  if (parts === null) return typeof value === 'string' ? value : ''
  if (locale === 'en') return `${MONTHS_EN[parts.month - 1]} ${parts.day}, ${parts.year}`
  return `${parts.year}年${parts.month}月${parts.day}日`
}

/** Format a month number (1..12) as a short axis label. */
function formatMonth(month, locale) {
  const index = Math.max(1, Math.min(12, Math.round(toFinite(month)))) - 1
  return locale === 'en' ? MONTHS_EN[index] : `${index + 1}月`
}

/** Format a date key as a compact `M/D` axis label. */
function formatShortDate(value) {
  const parts = parseDateKey(value)
  if (parts === null) return typeof value === 'string' ? value : ''
  return `${parts.month}/${parts.day}`
}

/**
 * Map a positive value to a 0..4 heat level.
 * @param {number} value - cell value.
 * @param {number[]} thresholds - four ascending p20/p40/p60/p80 thresholds.
 * @returns {0|1|2|3|4} heat level (0 for zero/negative values).
 */
function levelOf(value, thresholds) {
  const amount = toFinite(value)
  if (amount <= 0) return 0
  const list = Array.isArray(thresholds) ? thresholds : []
  for (let index = 0; index < list.length && index < 4; index += 1) {
    if (amount <= toFinite(list[index])) return index + 1
  }
  return Math.min(list.length + 1, 4)
}

/**
 * Linear-interpolated quantile of an ascending numeric array.
 * @param {number[]} sorted - ascending values.
 * @param {number} p - quantile in 0..1.
 * @returns {number} the quantile.
 */
function quantile(sorted, p) {
  if (!Array.isArray(sorted) || sorted.length === 0) return 0
  const rank = Math.min(1, Math.max(0, toFinite(p))) * (sorted.length - 1)
  const low = Math.floor(rank)
  const high = Math.ceil(rank)
  if (low === high) return toFinite(sorted[low])
  return toFinite(sorted[low]) + (toFinite(sorted[high]) - toFinite(sorted[low])) * (rank - low)
}

/**
 * GitHub-style heat thresholds over the non-zero values (p20/p40/p60/p80).
 * @param {number[]} values - cell values.
 * @returns {number[]} four ascending thresholds; zeros when there is no data.
 */
function computeThresholds(values) {
  const list = Array.isArray(values)
    ? values.map((value) => toFinite(value)).filter((value) => value > 0).sort((a, b) => a - b)
    : []
  if (list.length === 0) return [0, 0, 0, 0]
  return [0.2, 0.4, 0.6, 0.8].map((p) => quantile(list, p))
}

/**
 * Bucket heatmap cells into Monday-anchored weeks.
 *
 * Each returned week is exactly seven entries (Monday … Sunday); days with no
 * cell are `null`, and leading days before the first cell are padded so the
 * first column always starts on a Monday.
 *
 * @param {{date: string}[]} cells - heatmap cells (any order).
 * @returns {Array<Array<object|null>>} weeks of seven day slots.
 */
function buildWeeks(cells) {
  const list = Array.isArray(cells)
    ? cells
      .filter((cell) => cell && parseDateKey(cell.date) !== null)
      .slice()
      .sort((left, right) => (left.date < right.date ? -1 : left.date > right.date ? 1 : 0))
    : []
  if (list.length === 0) return []
  const byDate = new Map()
  for (const cell of list) if (!byDate.has(cell.date)) byDate.set(cell.date, cell)
  const start = weekStartKey(list[0].date)
  const end = list[list.length - 1].date
  const weeks = []
  let cursor = start
  while (cursor !== '' && cursor <= end) {
    const week = []
    for (let offset = 0; offset < 7; offset += 1) {
      const key = addDays(cursor, offset)
      week.push(byDate.get(key) ?? null)
    }
    weeks.push(week)
    cursor = addDays(cursor, 7)
  }
  return weeks
}

/**
 * Build the continuous day series the trend chart draws.
 *
 * The snapshot is requested once for the whole history, so the selected
 * 7/30-day window is applied here: missing days become zero-value entries and
 * the series always ends on `now` (local today).
 *
 * @param {{date: string, tokens?: number, messages?: number, turns?: number}[]} daily - snapshot daily rows.
 * @param {number} rangeDays - window length in days.
 * @param {number|Date|string} [now] - reference instant or `YYYY-MM-DD` end date (defaults to `Date.now()`).
 * @returns {{date: string, tokens: number, messages: number, turns: number}[]} continuous series.
 */
function buildTrendSeries(daily, rangeDays, now) {
  const days = Math.max(1, Math.round(toFinite(rangeDays)) || 7)
  const end = typeof now === 'string' && parseDateKey(now) !== null
    ? now
    : dayKey(now === undefined ? Date.now() : now) || dayKey(Date.now())
  const byDate = new Map()
  if (Array.isArray(daily)) {
    for (const row of daily) {
      if (!row || parseDateKey(row.date) === null) continue
      byDate.set(row.date, {
        date: row.date,
        tokens: toFinite(row.tokens),
        messages: toFinite(row.messages),
        turns: toFinite(row.turns),
      })
    }
  }
  const series = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = addDays(end, -offset)
    series.push(byDate.get(date) ?? { date, tokens: 0, messages: 0, turns: 0 })
  }
  return series
}

/** Last path segment of a workspace cwd (used when the host sends no label). */
function workspaceBasename(cwd) {
  if (typeof cwd !== 'string' || cwd.length === 0) return ''
  const parts = cwd.split(/[\\/]+/).filter((part) => part.length > 0)
  return parts.length > 0 ? parts[parts.length - 1] : cwd
}

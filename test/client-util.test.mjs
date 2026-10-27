/**
 * Unit tests for the pure helpers in `src/client/10-util.js`.
 *
 * The fragment is not an ES module (it shares the browser factory scope with
 * every other fragment), so it is evaluated through `node:vm`; top-level
 * `function` declarations become properties of the context object.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import vm from 'node:vm'

const source = await readFile(new URL('../src/client/10-util.js', import.meta.url), 'utf8')
const context = vm.createContext({})
vm.runInContext(source, context, { filename: '10-util.js' })

const {
  formatTokens,
  formatDuration,
  formatDurationExact,
  formatDays,
  formatCount,
  formatPercent,
  dayKey,
  formatDate,
  formatMonth,
  formatShortDate,
  levelOf,
  computeThresholds,
  buildWeeks,
  buildTrendSeries,
  addDays,
  weekStartKey,
  workspaceBasename,
  parseDateKey,
} = context

test('formatTokens uses 万/亿 for Chinese and K/M/B for English', () => {
  assert.equal(formatTokens(999), '999')
  assert.equal(formatTokens(0), '0')
  assert.equal(formatTokens(1000), '1,000')
  assert.equal(formatTokens(12345), '1.2 万')
  assert.equal(formatTokens(1135000), '113.5 万')
  assert.equal(formatTokens(100000000), '1 亿')
  assert.equal(formatTokens(123456789), '1.2 亿')
  assert.equal(formatTokens(-12345), '-1.2 万')
  assert.equal(formatTokens(1135000, 'en'), '1.1M')
  assert.equal(formatTokens(1500, 'en'), '1.5K')
  assert.equal(formatTokens(999, 'en'), '999')
  assert.equal(formatTokens(undefined), '0')
})

test('formatDuration covers <1 minute, minutes and short hours+minutes', () => {
  assert.equal(formatDuration(31 * 60000), '31 分钟')
  assert.equal(formatDuration(47 * 60000), '47 分钟')
  assert.equal(formatDuration(30000), '<1 分钟')
  assert.equal(formatDuration(0), '<1 分钟')
  assert.equal(formatDuration((2 * 60 + 5) * 60000), '2 小时 5 分')
  assert.equal(formatDuration((3 * 60 + 25) * 60000), '3 小时 25 分')
  assert.equal(formatDuration(3600000), '1 小时')
  assert.equal(formatDuration(31 * 60000, 'en'), '31 min')
  assert.equal(formatDuration(47 * 60000, 'en'), '47 min')
  assert.equal(formatDuration(30000, 'en'), '<1 min')
  assert.equal(formatDuration((3 * 60 + 25) * 60000, 'en'), '3h 25m')
  assert.equal(formatDuration(3600000, 'en'), '1h')
})

test('formatDurationExact keeps second precision for the title tooltip', () => {
  assert.equal(formatDurationExact(3 * 3600000 + 25 * 60000 + 12000), '3 小时 25 分 12 秒')
  assert.equal(formatDurationExact(3 * 3600000 + 25 * 60000 + 12000, 'en'), '3h 25m 12s')
  assert.equal(formatDurationExact(31 * 60000), '31 分')
  assert.equal(formatDurationExact(3600000), '1 小时')
  assert.equal(formatDurationExact(0), '0 秒')
})

test('formatDays / formatCount / formatPercent', () => {
  assert.equal(formatDays(0), '0 天')
  assert.equal(formatDays(1), '1 天')
  assert.equal(formatDays(1, 'en'), '1 day')
  assert.equal(formatDays(3, 'en'), '3 days')
  assert.equal(formatCount(12345), '12,345')
  assert.equal(formatPercent(0.423), '42.3%')
  assert.equal(formatPercent(0.5), '50%')
  assert.equal(formatPercent(0), '0%')
})

test('dayKey uses the local calendar day and pads months/days', () => {
  assert.equal(dayKey(new Date(2026, 1, 15, 12, 0, 0)), '2026-02-15')
  assert.equal(dayKey(new Date(2026, 0, 1, 0, 0, 0)), '2026-01-01')
  assert.equal(dayKey(Number.NaN), '')
})

test('parseDateKey rejects impossible dates', () => {
  const parsed = parseDateKey('2026-02-15')
  assert.equal(parsed.year, 2026)
  assert.equal(parsed.month, 2)
  assert.equal(parsed.day, 15)
  assert.equal(parsed.stamp, Date.UTC(2026, 1, 15))
  assert.equal(parseDateKey('2026-02-30'), null)
  assert.equal(parseDateKey('2026-2-15'), null)
  assert.equal(parseDateKey(''), null)
  assert.equal(parseDateKey(undefined), null)
})

test('addDays and weekStartKey are Monday-anchored', () => {
  assert.equal(addDays('2026-02-15', 1), '2026-02-16')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
  assert.equal(weekStartKey('2026-02-15'), '2026-02-09')
  assert.equal(weekStartKey('2026-02-16'), '2026-02-16')
  assert.equal(weekStartKey('2026-02-11'), '2026-02-09')
  assert.equal(weekStartKey('not-a-date'), '')
})

test('levelOf maps values onto five GitHub-style levels', () => {
  const thresholds = [1, 2, 3, 4]
  assert.equal(levelOf(0, thresholds), 0)
  assert.equal(levelOf(-5, thresholds), 0)
  assert.equal(levelOf(1, thresholds), 1)
  assert.equal(levelOf(2, thresholds), 2)
  assert.equal(levelOf(2.5, thresholds), 3)
  assert.equal(levelOf(4, thresholds), 4)
  assert.equal(levelOf(100, thresholds), 4)
  assert.equal(levelOf(3, []), 1)
})

test('computeThresholds uses non-zero values and stays ascending', () => {
  const thresholds = computeThresholds([0, 1, 2, 3, 4, 5])
  assert.equal(thresholds.length, 4)
  for (let index = 1; index < thresholds.length; index += 1) {
    assert.ok(thresholds[index] >= thresholds[index - 1], 'thresholds must be ascending')
  }
  assert.ok(thresholds[0] >= 1)
  assert.deepEqual(Array.from(computeThresholds([])), [0, 0, 0, 0])
  assert.deepEqual(Array.from(computeThresholds([0, 0])), [0, 0, 0, 0])
})

test('buildWeeks pads to a Monday start and always returns seven-day columns', () => {
  const cells = [
    { date: '2026-02-15', tokens: 5, messages: 1 },
    { date: '2026-02-11', tokens: 1, messages: 1 },
    { date: '2026-02-17', tokens: 9, messages: 2 },
    { date: '2026-02-16', tokens: 4, messages: 1 },
  ]
  const weeks = buildWeeks(cells)
  assert.equal(weeks.length, 2)
  for (const week of weeks) assert.equal(week.length, 7)

  assert.equal(weeks[0][0], null)
  assert.equal(weeks[0][1], null)
  assert.equal(weeks[0][2].date, '2026-02-11')
  assert.equal(weeks[0][6].date, '2026-02-15')
  assert.equal(weeks[1][0].date, '2026-02-16')
  assert.equal(weeks[1][1].date, '2026-02-17')
  assert.equal(weeks[1][2], null)

  assert.equal(buildWeeks([]).length, 0)
  assert.equal(buildWeeks(undefined).length, 0)
})

test('buildTrendSeries fills missing days and ends today', () => {
  const now = new Date(2026, 1, 15, 12, 0, 0)
  const series = buildTrendSeries([
    { date: '2026-02-15', tokens: 100, messages: 3, turns: 1 },
    { date: '2026-01-01', tokens: 999, messages: 9, turns: 9 },
  ], 7, now)

  assert.equal(series.length, 7)
  assert.equal(series[0].date, '2026-02-09')
  assert.equal(series[6].date, '2026-02-15')
  assert.equal(series[6].tokens, 100)
  assert.equal(series[6].messages, 3)
  assert.equal(series[0].tokens, 0)
  assert.equal(series[5].date, '2026-02-14')

  assert.equal(buildTrendSeries([], 30, now).length, 30)
  assert.equal(buildTrendSeries(undefined, 7, now).length, 7)

  const anchored = buildTrendSeries([{ date: '2026-02-15', tokens: 5, messages: 1, turns: 1 }], 3, '2026-02-15')
  assert.equal(anchored.length, 3)
  assert.equal(anchored[0].date, '2026-02-13')
  assert.equal(anchored[2].date, '2026-02-15')
  assert.equal(anchored[2].tokens, 5)
})

test('date labels are localized without Intl drift', () => {
  assert.equal(formatDate('2026-02-15'), '2026年2月15日')
  assert.equal(formatDate('2026-02-15', 'en'), 'Feb 15, 2026')
  assert.equal(formatDate('nope'), 'nope')
  assert.equal(formatMonth(2), '2月')
  assert.equal(formatMonth(2, 'en'), 'Feb')
  assert.equal(formatShortDate('2026-02-15'), '2/15')
})

test('workspaceBasename handles Windows and POSIX cwd values', () => {
  assert.equal(workspaceBasename('C:\\workspaces\\demo-app'), 'demo-app')
  assert.equal(workspaceBasename('/home/me/project'), 'project')
  assert.equal(workspaceBasename('project'), 'project')
  assert.equal(workspaceBasename(''), '')
  assert.equal(workspaceBasename(undefined), '')
})

/**
 * Browser-half entry: locale dictionaries, stylesheet injection, and the
 * `settings.section` registration.
 *
 * The last fragment in the bundle owns `exports.apply` / `exports.inject`, as
 * required by the client-modules loader.
 */

/** Locale namespace owned by this plugin. */
const NS = 'dsh-usage-stats'

/** Services the page needs before `apply` runs. */
const inject = ['slots', 'locale', 'connection']

/** Chinese copy. */
const DICT_ZH = {
  nav: '使用统计',
  title: '使用统计',
  heroSubtitle: 'Token 用量、活跃趋势与模型分布',
  pillAll: '应用用量',
  workspaceAll: '全部工作区',
  workspaceLabel: '工作区',
  noWorkspace: '（未命名工作区）',
  metricsLabel: '关键指标',
  metricTotal: '累计 Token 数',
  metricPeak: '峰值 Token 数',
  metricLongestChat: '最长聊天时长',
  metricCurrentStreak: '当前连续天数',
  metricLongestStreak: '最长连续天数',
  peakDay: '峰值日：{date}',
  tokenActivity: 'Token 活动',
  modeDay: '每日',
  modeWeek: '每周',
  modeCumulative: '累计',
  timeRange: '时间范围',
  range7: '近 7 日',
  range30: '近 30 日',
  trendTitle: '每日 Token 趋势图',
  trendLabel: '每日 Token 趋势图',
  modelsTitle: '模型用量',
  emptyTitle: '还没有可展示的数据',
  emptyBody: '当前区间暂无可展示的用量数据。',
  loading: '正在读取历史会话…',
  loadingProgress: '正在读取历史会话…（{done}/{total}）',
  retry: '重试',
  errorTitle: '读取使用统计失败',
  errorHint: '宿主服务可能仍在启动，请稍后重试。',
  heatTooltip: '{tokens} tokens · {messages} 轮消息',
  heatmapLabel: 'Token 活动热力图，共 {days} 天',
  heatmapSubtitle: '最近一年 · 共 {tokens} tokens',
  heatLegendLess: '少',
  heatLegendMore: '多',
  weekdayMon: '周一',
  weekdayWed: '周三',
  weekdayFri: '周五',
  trendSummaryTotal: '合计',
  trendSummaryAvg: '日均',
  trendSummaryMessages: '轮消息',
  modelsColumnModel: '模型',
  modelsColumnTokens: 'Token 数',
  modelsColumnShare: '占比',
  unknownModel: '未知模型',
  unknownProvider: '未知提供方',
}

/** English copy. */
const DICT_EN = {
  nav: 'Usage',
  title: 'Usage',
  heroSubtitle: 'Token usage, activity and model mix',
  pillAll: 'App usage',
  workspaceAll: 'All workspaces',
  workspaceLabel: 'Workspace',
  noWorkspace: '(untitled workspace)',
  metricsLabel: 'Key metrics',
  metricTotal: 'Total tokens',
  metricPeak: 'Peak tokens',
  metricLongestChat: 'Longest chat',
  metricCurrentStreak: 'Current streak',
  metricLongestStreak: 'Longest streak',
  peakDay: 'Peak day: {date}',
  tokenActivity: 'Token activity',
  modeDay: 'Daily',
  modeWeek: 'Weekly',
  modeCumulative: 'Cumulative',
  timeRange: 'Time range',
  range7: 'Last 7 days',
  range30: 'Last 30 days',
  trendTitle: 'Daily token trend',
  trendLabel: 'Daily token trend chart',
  modelsTitle: 'Model usage',
  emptyTitle: 'Nothing to show yet',
  emptyBody: 'No usage data in the current range.',
  loading: 'Reading session history…',
  loadingProgress: 'Reading session history… ({done}/{total})',
  retry: 'Retry',
  errorTitle: 'Failed to load usage statistics',
  errorHint: 'The host service may still be starting. Try again in a moment.',
  heatTooltip: '{tokens} tokens · {messages} messages',
  heatmapLabel: 'Token activity heatmap, {days} days',
  heatmapSubtitle: 'Last 12 months · {tokens} tokens',
  heatLegendLess: 'Less',
  heatLegendMore: 'More',
  weekdayMon: 'Mon',
  weekdayWed: 'Wed',
  weekdayFri: 'Fri',
  trendSummaryTotal: 'Total',
  trendSummaryAvg: 'Daily avg',
  trendSummaryMessages: 'Messages',
  modelsColumnModel: 'Model',
  modelsColumnTokens: 'Tokens',
  modelsColumnShare: 'Share',
  unknownModel: 'Unknown model',
  unknownProvider: 'Unknown provider',
}

/**
 * Register the usage settings page.
 * @param {object} ctx - browser plugin context.
 */
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh: DICT_ZH, en: DICT_EN }), 'dsh-usage-stats: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.effect(() => {
    if (typeof document === 'undefined') return undefined
    const stale = document.querySelectorAll('style[data-plugin="dsh-usage-stats"]')
    for (const node of stale) node.remove()
    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-usage-stats'
    style.textContent = STYLE
    document.head.appendChild(style)
    return () => {
      style.remove()
    }
  }, 'dsh-usage-stats: stylesheet')

  const request = (endpoint, payload) => callHost(ctx, endpoint, payload)

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'usage-stats',
    order: 900,
    label: () => t('nav'),
    inject: () => ({ t, request, locale: ctx.locale }),
  }, UsageSection))
}

exports.apply = apply
exports.inject = inject
exports.NS = NS
exports.STYLE = STYLE
exports.UsageSection = UsageSection
exports.UsagePageContent = UsagePageContent

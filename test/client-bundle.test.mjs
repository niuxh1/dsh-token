/**
 * Bundle-level tests: the build output must be a valid classic script that
 * registers the `dsh-usage-stats` client module, exposes `apply` / `inject`,
 * and registers a `settings.section` page.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = fileURLToPath(new URL('..', import.meta.url))
let bundle = ''
let bundleExports = null

/** Read the freshly written bundle, retrying briefly around Windows file locks. */
async function readBundle() {
  let lastError
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
  throw lastError
}

before(async () => {
  execFileSync(process.execPath, ['scripts/build-client.mjs'], { cwd: root, encoding: 'utf8' })
  bundle = await readBundle()

  let definition = null
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load: (value) => {
          definition = value
        },
      },
    },
  }
  vm.runInNewContext(bundle, sandbox, { filename: 'lib/client.js' })
  assert.ok(definition, 'the bundle must call window.__ModuleLoader__.load')
  bundleExports = definition.factory((id) => {
    assert.equal(id, 'react', 'the factory may only require react')
    return {
      createElement: () => null,
      useState: () => [null, () => {}],
      useEffect: () => {},
      useMemo: (factory) => factory(),
      useRef: () => ({ current: null }),
      useReducer: (reducer, initial) => [initial, () => {}],
    }
  })
})

test('build output is a loader bundle with the required markers', () => {
  assert.match(bundle, /window\.__ModuleLoader__\.load\(/)
  assert.ok(bundle.includes('"dsh-usage-stats"'))
  assert.ok(bundle.includes('settings.section'))
  assert.ok(bundle.includes('exports.apply'))
  assert.ok(bundle.includes('exports.inject'))
  assert.match(bundle, /order:\s*900/)
  assert.ok(bundle.includes('dataset.plugin'))
})

test('bundle parses as a classic script and passes node --check', () => {
  assert.doesNotThrow(() => new vm.Script(bundle, { filename: 'lib/client.js' }))
  assert.doesNotThrow(() => {
    execFileSync(process.execPath, ['--check', 'lib/client.js'], { cwd: root, encoding: 'utf8' })
  })
})

test('fragments are concatenated in filename order with 90-register last', () => {
  const expected = [
    '00-style.js',
    '10-util.js',
    '20-api.js',
    '30-charts.js',
    '40-page.js',
    '90-register.js',
  ]
  let cursor = -1
  for (const file of expected) {
    const index = bundle.indexOf(`// ── ${file} ──`)
    assert.ok(index > cursor, `${file} must appear after the previous fragment`)
    cursor = index
  }
  assert.ok(bundle.indexOf('return module.exports;') > cursor)
  assert.doesNotMatch(bundle, /^\s*(import|export)\s/m)
})

test('factory exports apply/inject and the page component', () => {
  assert.equal(typeof bundleExports.apply, 'function')
  assert.ok(Array.isArray(bundleExports.inject))
  assert.deepEqual(Array.from(bundleExports.inject), ['slots', 'locale', 'connection'])
  assert.equal(typeof bundleExports.UsageSection, 'function')
  assert.equal(typeof bundleExports.UsagePageContent, 'function')
  assert.equal(typeof bundleExports.STYLE, 'string')
})

test('apply registers dictionaries, a stylesheet and the settings section', () => {
  const registered = []
  const slots = []
  let injectedSlot = ''
  const ctx = {
    locale: {
      register: (namespace, dictionaries) => {
        registered.push({ namespace, dictionaries })
        return () => {}
      },
      bind: () => (key) => key,
    },
    effect: (callback) => {
      const dispose = callback()
      return typeof dispose === 'function' ? dispose : () => {}
    },
    slots: {
      inject: (name, callback) => {
        injectedSlot = name
        callback()
        return () => {}
      },
      register: (options, component) => {
        slots.push({ options, component })
        return () => {}
      },
    },
    get: () => ({ rpc: { call: async () => ({ ok: true, value: {} }) } }),
  }

  bundleExports.apply(ctx)

  assert.equal(registered.length, 1)
  assert.equal(registered[0].namespace, 'dsh-usage-stats')
  assert.ok(registered[0].dictionaries.zh)
  assert.ok(registered[0].dictionaries.en)
  assert.equal(registered[0].dictionaries.zh.title, '使用统计')
  assert.equal(registered[0].dictionaries.en.title, 'Usage')
  assert.equal(registered[0].dictionaries.zh.heroSubtitle, 'Token 用量、活跃趋势与模型分布')
  assert.equal(registered[0].dictionaries.en.heroSubtitle, 'Token usage, activity and model mix')
  assert.equal(registered[0].dictionaries.zh.heatmapSubtitle, '最近一年 · 共 {tokens} tokens')
  assert.equal(registered[0].dictionaries.en.modelsColumnShare, 'Share')
  assert.deepEqual(
    Object.keys(registered[0].dictionaries.zh).sort(),
    Object.keys(registered[0].dictionaries.en).sort(),
    'zh/en dictionaries must expose the same keys',
  )
  assert.equal(injectedSlot, 'settings.section')
  assert.equal(slots.length, 1)
  assert.equal(slots[0].options.id, 'usage-stats')
  assert.equal(slots[0].options.order, 900)
  assert.equal(typeof slots[0].options.label(), 'string')
  assert.equal(slots[0].component, bundleExports.UsageSection)

  const face = slots[0].options.inject()
  assert.equal(typeof face.t, 'function')
  assert.equal(typeof face.request, 'function')
  assert.equal(face.locale, ctx.locale)
})

test('stylesheet carries both heat palettes and the scalable SVG geometry contract', () => {
  for (const colour of ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']) {
    assert.ok(bundle.includes(colour), `missing light heat colour ${colour}`)
  }
  for (const colour of ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']) {
    assert.ok(bundle.includes(colour), `missing dark heat colour ${colour}`)
  }
  assert.ok(bundle.includes('html[style*="color-scheme: dark"] .dsh-usage-root'))
  assert.ok(bundle.includes('html[style*="color-scheme: light"] .dsh-usage-root'))
  assert.ok(bundle.includes('@media (prefers-color-scheme: dark)'))
  assert.ok(bundle.includes('--dsh-usage-heat-0'))
  assert.ok(bundle.includes('--dsh-usage-heat-4'))

  // Natural cell geometry lives in the SVG viewBox (11px cell + 3px gap, 2px radius).
  assert.match(bundle, /const HEAT_CELL = 11/)
  assert.match(bundle, /const HEAT_GAP = 3/)
  assert.match(bundle, /rx: 2/)
  assert.ok(bundle.includes("preserveAspectRatio: 'xMinYMid meet'"))
  assert.match(bundle, /\.dsh-usage-heat-svg\s*\{[^}]*width:\s*100%/s)

  // One row of five metrics at the ~564px settings panel; 3+2 only below 460px.
  assert.ok(bundle.includes('grid-template-columns: repeat(5, minmax(0, 1fr))'))
  assert.ok(bundle.includes('clamp(18px, 2.6cqi, 24px)'))
  assert.ok(bundle.includes('container-type: inline-size'))
  assert.ok(bundle.includes('@container (max-width: 459px)'))
  assert.ok(bundle.includes('@container (max-width: 640px)'))
  assert.ok(bundle.includes('cqi'))
  assert.match(bundle, /--dsw-alias-label-primary/)
  assert.match(bundle, /data-plugin|dataset\.plugin/)
})

test('polish landmarks: hero, heat legend, trend summary, model header, gradient', () => {
  for (const marker of [
    'dsh-usage-hero',
    'dsh-usage-hero-icon',
    'dsh-usage-hero-subtitle',
    'dsh-usage-heat-weekdays',
    'dsh-usage-heat-legend',
    'dsh-usage-heat-swatch',
    'dsh-usage-trend-summary',
    'dsh-usage-trend-gradient-top',
    'dsh-usage-model-head',
    'linearGradient',
  ]) {
    assert.ok(bundle.includes(marker), `missing polish landmark ${marker}`)
  }
  assert.ok(bundle.includes('dsh-usage-trend-gradient'))
  for (const text of [
    'Token 用量、活跃趋势与模型分布',
    '最近一年 · 共',
    'Token usage, activity and model mix',
    'Last 12 months ·',
  ]) {
    assert.ok(bundle.includes(text), `missing polish copy ${text}`)
  }
})

test('page chrome is DSH-token driven (no hardcoded card/text/control colours)', () => {
  for (const token of [
    '--dsw-alias-settings-card-fill',
    '--dsw-alias-settings-card-stroke',
    '--dsw-elevation-panel',
    '--dsw-radius-lg',
    '--dsw-alias-label-primary',
    '--dsw-alias-label-secondary',
    '--dsw-alias-label-tertiary',
    '--dsw-alias-border-l1',
    '--dsw-alias-border-l2',
    '--dsw-alias-border-l3',
    '--dsw-alias-interactive-bg-hover',
    '--dsw-alias-button-ghost-active-fill',
    '--dsw-alias-button-ghost-active-border',
    '--dsw-alias-bg-skeleton',
    '--dsw-alias-bg-overlay',
    '--dsw-alias-state-error-primary',
    '--dsw-alias-state-success-primary',
    '--dsw-alias-state-success-secondary',
    '--dsw-focus-ring-color',
  ]) {
    assert.ok(bundle.includes(token), `missing theme token ${token}`)
  }
  assert.ok(bundle.includes('body[data-ds-dark-theme] .dsh-usage-root'))
  assert.ok(bundle.includes('var(--dsh-usage-heat-0, #ebedf0)'))
  assert.ok(bundle.includes('var(--dsh-usage-trend-line'))
  // SVG fills use CSS variables, never inline colours from JS.
  assert.ok(!bundle.includes("fill: '#"))
  assert.ok(!bundle.includes('fill: "#'))
})

test('bilingual copy and empty-state strings are present', () => {
  assert.ok(bundle.includes('还没有可展示的数据'))
  assert.ok(bundle.includes('当前区间暂无可展示的用量数据。'))
  assert.ok(bundle.includes('正在读取历史会话'))
  assert.ok(bundle.includes('Reading session history'))
  assert.ok(bundle.includes('Nothing to show yet'))
  assert.ok(bundle.includes('No usage data in the current range.'))
})

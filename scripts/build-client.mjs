#!/usr/bin/env node
/**
 * Bundle `src/client/*.js` into `lib/client.js`.
 *
 * The browser half is not an ES module: DSH's client-modules loader executes a
 * bundle through `window.__ModuleLoader__.load({ id, factory })`, and the
 * factory's `require` resolves peer modules by registered id (`react`, …).
 * The source fragments therefore share one function scope and must not use
 * `import` / `export`; the last fragment assigns `exports.apply` and
 * `exports.inject`.
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const PACKAGE_NAME = 'dsh-usage-stats'
const SRC_DIR = 'src/client'
const OUT_FILE = 'lib/client.js'
const REGISTER_FRAGMENT = '90-register.js'

const files = (await readdir(SRC_DIR)).filter((file) => file.endsWith('.js')).sort()
if (files.length === 0) throw new Error(`no client fragments found in ${SRC_DIR}`)
if (files[files.length - 1] !== REGISTER_FRAGMENT) {
  throw new Error(`${REGISTER_FRAGMENT} must sort last (it owns exports.apply / exports.inject); got ${files.join(', ')}`)
}

const fragments = await Promise.all(
  files.map(async (file) => {
    const text = await readFile(join(SRC_DIR, file), 'utf8')
    if (/^\s*(import|export)\s/m.test(text)) {
      throw new Error(`${file}: fragments must not use import/export (shared factory scope)`)
    }
    // Normalize to LF so the bundle is byte-identical on every platform:
    // a CRLF checkout would otherwise produce a different artifact and the
    // committed bundle would look out of sync.
    return `// ── ${file} ──\n${text.replace(/\r\n/g, '\n').trimEnd()}\n`
  }),
)

const bundle = `window.__ModuleLoader__.load({
	id: ${JSON.stringify(PACKAGE_NAME)},
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		const React = require("react");
${fragments.join('\n')}
		return module.exports;
	}
});

//# sourceURL=${PACKAGE_NAME}/client.js
`

for (const marker of ['window.__ModuleLoader__.load', `"${PACKAGE_NAME}"`, 'exports.apply', 'exports.inject', 'settings.section']) {
  if (!bundle.includes(marker)) throw new Error(`bundle is missing required marker: ${marker}`)
}

await mkdir('lib', { recursive: true })
await writeFile(OUT_FILE, bundle, 'utf8')
console.log(`built ${OUT_FILE} from ${files.length} fragment(s): ${files.join(', ')}`)

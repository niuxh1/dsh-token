# Security & privacy

## What this plugin reads

`dsh-usage-stats` reads DeepSeek Harness session logs on the local machine through
`ctx.sessionQuery`. It aggregates token counts, message counts, model names and
timestamps. It does not read prompts, tool outputs, attachments or file contents.

## What it stores

Only aggregated numbers are cached:

`~/.dsh/storages/usage-stats/aggregates.v1.json`

The cache contains session ids, timestamps, token totals, model names and
per-day counters. It never contains message text or file contents. Delete the
file at any time to force a rebuild.

## Network

The plugin makes **no network requests** and has no telemetry. Installation is
the only network operation (fetching the package from GitHub or npm).

## Compatibility fallback

DeepSeek Harness refuses to read a persisted session whose log contains event
types unknown to the installed build. When (and only when) that specific refusal
is reported, the plugin decompresses the local `session.v4.jsonl.zstd` file with
`node:zlib` to count the same usage fields. This is still entirely local.

## Reporting a vulnerability

Open a private security advisory at
<https://github.com/niuxh1/dsh-token/security/advisories/new> or email the
maintainer listed in `package.json`. Please do not open a public issue for
sensitive reports.

window.__ModuleLoader__.load({
	id: "dsh-usage-stats",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		const React = require("react");
// ── 00-style.js ──
/**
 * Stylesheet for the usage settings page.
 *
 * Exposed as the `STYLE` string and injected once by `90-register.js` through a
 * `<style data-plugin="dsh-usage-stats">` element. Every colour reads a DSH
 * theme alias first and falls back to the value measured from the reference
 * screenshot, so the page follows light/dark themes without hard-coding one.
 *
 * No `import`/`export`: this fragment shares the factory scope with the rest.
 */

const STYLE = `
.dsh-usage-root {
	container-type: inline-size;
	--dsh-usage-heat-0: #ebedf0;
	--dsh-usage-heat-1: #9be9a8;
	--dsh-usage-heat-2: #40c463;
	--dsh-usage-heat-3: #30a14e;
	--dsh-usage-heat-4: #216e39;
	--dsh-usage-trend-line: var(--dsw-alias-state-success-primary, #2da44e);
	margin: 0;
	min-width: 0;
}

@media (prefers-color-scheme: dark) {
	.dsh-usage-root {
		--dsh-usage-heat-0: #161b22;
		--dsh-usage-heat-1: #0e4429;
		--dsh-usage-heat-2: #006d32;
		--dsh-usage-heat-3: #26a641;
		--dsh-usage-heat-4: #39d353;
	}
}

/* DSH marks the scheme with html style="color-scheme: light|dark;" — the
 * attribute selectors outrank the media-query fallback, so an explicit light
 * theme on a dark OS (and vice versa) resolves correctly. */
html[style*="color-scheme: light"] .dsh-usage-root,
html[style*="color-scheme:light"] .dsh-usage-root {
	--dsh-usage-heat-0: #ebedf0;
	--dsh-usage-heat-1: #9be9a8;
	--dsh-usage-heat-2: #40c463;
	--dsh-usage-heat-3: #30a14e;
	--dsh-usage-heat-4: #216e39;
	--dsh-usage-trend-line: var(--dsw-alias-state-success-primary, #2da44e);
}

html[style*="color-scheme: dark"] .dsh-usage-root,
html[style*="color-scheme:dark"] .dsh-usage-root {
	--dsh-usage-heat-0: #161b22;
	--dsh-usage-heat-1: #0e4429;
	--dsh-usage-heat-2: #006d32;
	--dsh-usage-heat-3: #26a641;
	--dsh-usage-heat-4: #39d353;
}

/* DSH also marks dark mode with body[data-ds-dark-theme]; keep the chart
 * palette in step even if the html color-scheme hint is absent. */
body[data-ds-dark-theme] .dsh-usage-root {
	--dsh-usage-heat-0: #161b22;
	--dsh-usage-heat-1: #0e4429;
	--dsh-usage-heat-2: #006d32;
	--dsh-usage-heat-3: #26a641;
	--dsh-usage-heat-4: #39d353;
}

.dsh-usage-page {
	display: flex;
	flex-direction: column;
	gap: 20px;
	width: 100%;
	min-width: 0;
	color: var(--dsw-alias-label-primary, #f9fafb);
	font-size: 14px;
	line-height: 1.5;
	box-sizing: border-box;
}

.dsh-usage-hero {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px 20px;
	flex-wrap: wrap;
	min-width: 0;
}

.dsh-usage-hero-main {
	display: flex;
	align-items: center;
	gap: 14px;
	min-width: 0;
	flex: 1 1 auto;
}

.dsh-usage-hero-icon {
	flex: none;
	display: grid;
	place-items: center;
	width: 44px;
	height: 44px;
	border-radius: 12px;
	background: var(--dsw-alias-button-ghost-active-fill, rgba(255, 255, 255, 0.08));
	border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12));
	box-shadow: inset 0 1px 0 var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06));
	color: var(--dsw-alias-state-business-primary, #4d6bfe);
}

.dsh-usage-hero-icon svg {
	display: block;
}

.dsh-usage-hero-bar {
	fill: currentColor;
	opacity: 0.9;
}

.dsh-usage-hero-spark {
	fill: none;
	stroke: currentColor;
	stroke-width: 1.6;
	stroke-linecap: round;
	stroke-linejoin: round;
	opacity: 0.6;
}

.dsh-usage-hero-text {
	min-width: 0;
}

.dsh-usage-hero-title-row {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
	min-width: 0;
}

.dsh-usage-hero-subtitle {
	margin: 4px 0 0;
	font-size: 13px;
	line-height: 1.4;
	color: var(--dsw-alias-label-tertiary, #81858c);
}

.dsh-usage-hero-actions {
	flex: 0 1 auto;
	margin-left: auto;
}

.dsh-usage-title {
	margin: 0;
	font-size: 30px;
	font-weight: 600;
	line-height: 1.2;
	letter-spacing: -0.02em;
	color: var(--dsw-alias-label-primary, #f9fafb);
}

.dsh-usage-pill {
	display: inline-flex;
	align-items: center;
	height: 24px;
	max-width: 320px;
	padding: 0 10px;
	border-radius: 999px;
	background: var(--dsw-alias-button-ghost-active-fill, rgba(255, 255, 255, 0.08));
	color: var(--dsw-alias-label-secondary, #adb2b8);
	font-size: 12px;
	line-height: 1;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.dsh-usage-header-right {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-left: auto;
	min-width: 0;
}

.dsh-usage-select-wrap {
	position: relative;
	display: inline-flex;
	align-items: center;
	min-width: 0;
}

.dsh-usage-select {
	appearance: none;
	-webkit-appearance: none;
	max-width: 200px;
	padding: 7px 30px 7px 12px;
	border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12));
	border-radius: 8px;
	background: var(--dsw-alias-bg-layer-3, #353638);
	color: var(--dsw-alias-label-primary, #f9fafb);
	font: inherit;
	font-size: 13px;
	line-height: 1.2;
	text-overflow: ellipsis;
	cursor: pointer;
}

.dsh-usage-select:hover {
	background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.1));
}

.dsh-usage-select:focus-visible {
	outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary, #4d6bfe));
	outline-offset: 1px;
}

.dsh-usage-select-caret {
	position: absolute;
	right: 11px;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	color: var(--dsw-alias-label-tertiary, #81858c);
	font-size: 11px;
	line-height: 1;
}

.dsh-usage-card {
	box-sizing: border-box;
	background: var(--dsw-alias-settings-card-fill, #232324);
	border: 1px solid var(--dsw-alias-settings-card-stroke, rgba(255, 255, 255, 0.06));
	border-radius: var(--dsw-radius-lg, 16px);
	box-shadow: var(--dsw-elevation-panel, 0 8px 24px rgba(0, 0, 0, 0.18));
	padding: 18px 22px;
	min-width: 0;
}

.dsh-usage-metrics-card {
	position: relative;
	overflow: hidden;
	padding: 22px 4px 20px;
}

/* A restrained accent hairline and a corner glow lift the metrics card
 * without introducing a second colour system: both read the business token. */
.dsh-usage-metrics-card::before {
	content: "";
	position: absolute;
	top: 0;
	left: 18%;
	right: 18%;
	height: 2px;
	border-radius: 0 0 2px 2px;
	background: linear-gradient(90deg, transparent, var(--dsw-alias-state-business-primary, #4d6bfe), transparent);
	opacity: 0.68;
	pointer-events: none;
}

.dsh-usage-metrics-card::after {
	content: "";
	position: absolute;
	top: -60px;
	right: -40px;
	width: 200px;
	height: 140px;
	border-radius: 50%;
	background: radial-gradient(circle, var(--dsw-alias-state-business-primary, #4d6bfe) 0%, transparent 70%);
	opacity: 0.08;
	pointer-events: none;
}

.dsh-usage-metrics {
	position: relative;
	z-index: 1;
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
	align-items: stretch;
	min-width: 0;
}

.dsh-usage-metric {
	position: relative;
	min-width: 0;
	padding: 4px 2px;
	text-align: center;
	border-left: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06));
}

.dsh-usage-metric:nth-child(1) {
	border-left: 0;
}

.dsh-usage-metric-value {
	font-size: clamp(18px, 2.6cqi, 24px);
	font-weight: 600;
	line-height: 1.25;
	letter-spacing: -0.01em;
	font-variant-numeric: tabular-nums;
	color: var(--dsw-alias-label-primary, #f9fafb);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.dsh-usage-metric-label {
	margin-top: 6px;
	font-size: 12px;
	line-height: 1.3;
	color: var(--dsw-alias-label-tertiary, #81858c);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.dsh-usage-card-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 10px 16px;
	margin-bottom: 16px;
	min-width: 0;
}

.dsh-usage-card-heading {
	min-width: 0;
}

.dsh-usage-card-title {
	margin: 0;
	font-size: 15px;
	font-weight: 500;
	line-height: 1.3;
	color: var(--dsw-alias-label-primary, #f9fafb);
}

.dsh-usage-card-subtitle {
	margin: 4px 0 0;
	font-size: 12px;
	line-height: 1.4;
	color: var(--dsw-alias-label-tertiary, #81858c);
}

.dsh-usage-trend-summary {
	display: flex;
	align-items: baseline;
	flex-wrap: wrap;
	gap: 4px 14px;
	margin-top: 6px;
	min-width: 0;
}

.dsh-usage-trend-summary-item {
	display: inline-flex;
	align-items: baseline;
	gap: 4px;
	white-space: nowrap;
}

.dsh-usage-trend-summary-value {
	font-size: 13px;
	font-weight: 600;
	line-height: 1.3;
	font-variant-numeric: tabular-nums;
	color: var(--dsw-alias-label-primary, #f9fafb);
}

.dsh-usage-trend-summary-label {
	font-size: 11px;
	line-height: 1.3;
	color: var(--dsw-alias-label-tertiary, #81858c);
}

.dsh-usage-seg {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	padding: 3px;
	border-radius: 999px;
	background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
	flex: none;
}

.dsh-usage-seg-btn {
	appearance: none;
	-webkit-appearance: none;
	margin: 0;
	padding: 6px 13px;
	border: 1px solid transparent;
	border-radius: 999px;
	background: transparent;
	color: var(--dsw-alias-label-secondary, #adb2b8);
	font: inherit;
	font-size: 13px;
	line-height: 1;
	white-space: nowrap;
	cursor: pointer;
	transition: background-color 0.15s ease, color 0.15s ease;
}

.dsh-usage-seg-btn:hover {
	background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
	color: var(--dsw-alias-label-primary, #f9fafb);
}

.dsh-usage-seg-btn.is-active,
.dsh-usage-seg-btn[aria-pressed="true"] {
	background: var(--dsw-alias-button-ghost-active-fill, #ebeef2);
	box-shadow: inset 0 0 0 1px var(--dsw-alias-button-ghost-active-border, #979da6);
	color: var(--dsw-alias-label-primary, #0f1115);
}

.dsh-usage-seg-btn:focus-visible {
	outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary, #4d6bfe));
	outline-offset: 1px;
}

.dsh-usage-range-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 0 2px;
	min-width: 0;
}

.dsh-usage-range-label {
	font-size: 14px;
	color: var(--dsw-alias-label-primary, #f9fafb);
}

.dsh-usage-heat {
	position: relative;
	min-width: 0;
}

.dsh-usage-heat-main {
	display: flex;
	align-items: stretch;
	gap: 6px;
	min-width: 0;
}

.dsh-usage-heat-weekdays {
	flex: none;
	display: grid;
	grid-template-rows: repeat(7, 1fr);
	width: 20px;
	/* Months row (18px + 8px margin) is below the SVG; keep the seven
	 * weekday rows aligned with the grid only. */
	margin-bottom: 26px;
	font-size: 9px;
	line-height: 1;
	color: var(--dsw-alias-label-tertiary, #81858c);
}

.dsh-usage-heat-weekday {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding-right: 2px;
	white-space: nowrap;
}

.dsh-usage-heat-canvas {
	flex: 1;
	min-width: 0;
}

.dsh-usage-heat-svg {
	display: block;
	width: 100%;
	height: auto;
	overflow: visible;
}

.dsh-usage-heat-cell {
	fill: var(--dsh-usage-heat-0, #ebedf0);
	transition: fill 0.12s ease;
}

.dsh-usage-heat-cell[data-level="1"] { fill: var(--dsh-usage-heat-1, #9be9a8); }
.dsh-usage-heat-cell[data-level="2"] { fill: var(--dsh-usage-heat-2, #40c463); }
.dsh-usage-heat-cell[data-level="3"] { fill: var(--dsh-usage-heat-3, #30a14e); }
.dsh-usage-heat-cell[data-level="4"] { fill: var(--dsh-usage-heat-4, #216e39); }

.dsh-usage-heat-cell.is-hover {
	stroke: var(--dsw-alias-label-secondary, #adb2b8);
	stroke-width: 1.5;
}

.dsh-usage-heat-months {
	position: relative;
	height: 18px;
	margin-top: 8px;
}

.dsh-usage-heat-month {
	position: absolute;
	top: 0;
	font-size: 12px;
	line-height: 18px;
	color: var(--dsw-alias-label-tertiary, #81858c);
	white-space: nowrap;
}

.dsh-usage-heat-legend {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 4px;
	margin-top: 6px;
	font-size: 11px;
	line-height: 1;
	color: var(--dsw-alias-label-tertiary, #81858c);
}

.dsh-usage-heat-legend-label {
	margin: 0 2px;
}

.dsh-usage-heat-swatch {
	width: 10px;
	height: 10px;
	border-radius: 2px;
	background: var(--dsh-usage-heat-0, #ebedf0);
}

.dsh-usage-heat-swatch[data-level="1"] { background: var(--dsh-usage-heat-1, #9be9a8); }
.dsh-usage-heat-swatch[data-level="2"] { background: var(--dsh-usage-heat-2, #40c463); }
.dsh-usage-heat-swatch[data-level="3"] { background: var(--dsh-usage-heat-3, #30a14e); }
.dsh-usage-heat-swatch[data-level="4"] { background: var(--dsh-usage-heat-4, #216e39); }

.dsh-usage-tooltip {
	position: absolute;
	z-index: 30;
	max-width: 220px;
	pointer-events: none;
	padding: 7px 10px;
	border: 1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.16));
	border-radius: 8px;
	background: var(--dsw-alias-bg-overlay, #2a2a2a);
	box-shadow: var(--dsw-elevation-panel, 0 8px 22px rgba(0, 0, 0, 0.45));
	color: var(--dsw-alias-label-primary, #f9fafb);
	font-size: 12px;
	line-height: 1.5;
	white-space: normal;
	overflow-wrap: anywhere;
}

.dsh-usage-tooltip-sub {
	color: var(--dsw-alias-label-tertiary, #81858c);
}

.dsh-usage-trend {
	position: relative;
	min-width: 0;
}

.dsh-usage-trend svg {
	display: block;
	width: 100%;
	height: auto;
}

.dsh-usage-trend-bar {
	fill: var(--dsh-usage-trend-line, #39d353);
	fill-opacity: 0.28;
}

.dsh-usage-trend-area {
	fill: url(#dsh-usage-trend-gradient);
}

.dsh-usage-trend-gradient-top {
	stop-color: var(--dsh-usage-trend-line, #39d353);
	stop-opacity: 0.32;
}

.dsh-usage-trend-gradient-bottom {
	stop-color: var(--dsh-usage-trend-line, #39d353);
	stop-opacity: 0.02;
}

.dsh-usage-trend-hover-band {
	fill: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.06));
}

.dsh-usage-trend-line {
	fill: none;
	stroke: var(--dsh-usage-trend-line, #39d353);
	stroke-width: 1.5;
	stroke-linejoin: round;
	stroke-linecap: round;
}

.dsh-usage-trend-grid {
	stroke: var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
	stroke-width: 1;
	stroke-dasharray: 3 4;
}

.dsh-usage-trend-axis {
	fill: var(--dsw-alias-label-tertiary, #81858c);
	font-size: 11px;
}

.dsh-usage-trend-crosshair {
	stroke: var(--dsw-alias-label-tertiary, #81858c);
	stroke-width: 1;
	stroke-dasharray: 3 3;
}

.dsh-usage-trend-dot {
	fill: var(--dsh-usage-trend-line, #39d353);
	stroke: var(--dsw-alias-bg-base, #161616);
	stroke-width: 2;
}

.dsh-usage-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-height: 180px;
	box-sizing: border-box;
	padding: 48px 20px;
	border: 1px dashed var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.16));
	border-radius: 12px;
	text-align: center;
}

.dsh-usage-empty-title {
	font-size: 15px;
	font-weight: 500;
	line-height: 1.4;
	color: var(--dsw-alias-label-primary, #f9fafb);
}

.dsh-usage-empty-body {
	font-size: 13px;
	line-height: 1.5;
	color: var(--dsw-alias-label-tertiary, #81858c);
}

.dsh-usage-models {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.dsh-usage-model-head {
	display: grid;
	grid-template-columns: minmax(140px, 1.4fr) minmax(100px, 2fr) auto 60px;
	align-items: center;
	gap: 16px;
	padding: 0 2px 8px;
	border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06));
	font-size: 11px;
	line-height: 1.2;
	letter-spacing: 0.02em;
	color: var(--dsw-alias-label-tertiary, #81858c);
	min-width: 0;
}

.dsh-usage-model-head-cell {
	min-width: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.dsh-usage-model-head-cell.is-right {
	text-align: right;
}

.dsh-usage-model-row {
	display: grid;
	grid-template-columns: minmax(140px, 1.4fr) minmax(100px, 2fr) auto 60px;
	align-items: center;
	gap: 16px;
	padding: 11px 2px;
	border-top: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06));
	min-width: 0;
}

.dsh-usage-model-head + .dsh-usage-model-row {
	border-top: 0;
}

.dsh-usage-model-identity {
	min-width: 0;
}

.dsh-usage-model-name {
	font-size: 14px;
	line-height: 1.35;
	color: var(--dsw-alias-label-primary, #f9fafb);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.dsh-usage-model-provider {
	margin-top: 2px;
	font-size: 12px;
	line-height: 1.3;
	color: var(--dsw-alias-label-tertiary, #81858c);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.dsh-usage-model-bar {
	height: 6px;
	border-radius: 3px;
	background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
	overflow: hidden;
}

.dsh-usage-model-fill {
	height: 100%;
	min-width: 2px;
	border-radius: 3px;
	background: linear-gradient(90deg, var(--dsw-alias-state-success-primary, #26a641), var(--dsw-alias-state-success-secondary, #39d353));
}

.dsh-usage-model-tokens {
	font-size: 13px;
	font-variant-numeric: tabular-nums;
	text-align: right;
	white-space: nowrap;
	color: var(--dsw-alias-label-secondary, #adb2b8);
}

.dsh-usage-model-share {
	font-size: 13px;
	font-variant-numeric: tabular-nums;
	text-align: right;
	white-space: nowrap;
	color: var(--dsw-alias-label-tertiary, #81858c);
}

.dsh-usage-loading {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.dsh-usage-skeleton {
	border-radius: 8px;
	background: linear-gradient(
		90deg,
		var(--dsw-alias-bg-skeleton, rgba(255, 255, 255, 0.06)) 25%,
		var(--dsw-alias-bg-mask-2, rgba(255, 255, 255, 0.12)) 37%,
		var(--dsw-alias-bg-skeleton, rgba(255, 255, 255, 0.06)) 63%
	);
	background-size: 400% 100%;
	animation: dsh-usage-shimmer 1.4s ease infinite;
}

@keyframes dsh-usage-shimmer {
	0% { background-position: 100% 50%; }
	100% { background-position: 0 50%; }
}

.dsh-usage-loading-row {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
	font-size: 13px;
	line-height: 1.4;
	color: var(--dsw-alias-label-tertiary, #81858c);
}

.dsh-usage-loading-text {
	flex: none;
}

.dsh-usage-progress {
	position: relative;
	flex: 1;
	max-width: 320px;
	height: 4px;
	border-radius: 2px;
	background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
	overflow: hidden;
}

.dsh-usage-progress-fill {
	display: block;
	height: 100%;
	border-radius: 2px;
	background: var(--dsw-alias-state-success-primary, #39d353);
	transition: width 0.3s ease;
}

.dsh-usage-error {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 16px 18px;
	border: 1px solid var(--dsw-alias-state-error-primary, #e5484d);
	border-radius: 12px;
	background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 8%, transparent);
}

.dsh-usage-error-title {
	font-size: 14px;
	font-weight: 600;
	line-height: 1.4;
	color: var(--dsw-alias-state-error-primary, #e5484d);
}

.dsh-usage-error-body {
	font-size: 13px;
	line-height: 1.5;
	color: var(--dsw-alias-label-secondary, #adb2b8);
	word-break: break-word;
}

.dsh-usage-retry {
	align-self: flex-start;
	appearance: none;
	-webkit-appearance: none;
	margin: 0;
	padding: 5px 12px;
	border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12));
	border-radius: 8px;
	background: transparent;
	color: var(--dsw-alias-label-primary, #f9fafb);
	font: inherit;
	font-size: 13px;
	line-height: 1.3;
	cursor: pointer;
}

.dsh-usage-retry:hover {
	background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.1));
}

.dsh-usage-retry:focus-visible {
	outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary, #4d6bfe));
	outline-offset: 1px;
}

.dsh-usage-sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	margin: -1px;
	padding: 0;
	border: 0;
	overflow: hidden;
	clip: rect(0 0 0 0);
	white-space: nowrap;
}

/* The settings panel is a centered dialog, so viewport media queries alone do
 * not see its ~558px content column. Container queries on .dsh-usage-root keep
 * the five metrics readable: 2 + 3 metrics on two rows instead of five clipped
 * columns. Above 640px there is room for five columns with the cqi-scaled
 * value font. */
/* auto-fit wraps the five metrics; these rules keep the first cell of every
 * wrapped row free of a left divider (5/4/3/2/1 columns). */
/* Only below ~460px do the five metrics degrade to 3+2 (first row three,
 * second row two), keeping every value and label readable. */
@container (max-width: 559px) {
	.dsh-usage-metric-value {
		font-size: clamp(16px, 3.2cqi, 18px);
	}
}

@container (max-width: 459px) {
	.dsh-usage-metrics {
		grid-template-columns: repeat(6, minmax(0, 1fr));
		row-gap: 20px;
	}

	.dsh-usage-metric {
		grid-column: span 2;
		border-left: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06));
	}

	.dsh-usage-metric:nth-child(1),
	.dsh-usage-metric:nth-child(4) {
		border-left: 0;
	}

	.dsh-usage-metric:nth-child(4),
	.dsh-usage-metric:nth-child(5) {
		grid-column: span 3;
	}

	.dsh-usage-metric-value {
		font-size: 18px;
	}

	.dsh-usage-metric-label {
		font-size: 12px;
	}
}

@container (max-width: 640px) {
	.dsh-usage-title {
		font-size: 28px;
	}

	.dsh-usage-pill {
		max-width: 150px;
	}

	.dsh-usage-hero {
		align-items: flex-start;
	}

	.dsh-usage-hero-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
	}

	.dsh-usage-select {
		max-width: 100%;
	}

	.dsh-usage-model-row,
	.dsh-usage-model-head {
		grid-template-columns: minmax(110px, 1.3fr) minmax(70px, 1.4fr) auto 48px;
		gap: 8px;
	}
}

@media (max-width: 820px) {
	.dsh-usage-title {
		font-size: 28px;
	}

	.dsh-usage-model-row,
	.dsh-usage-model-head {
		grid-template-columns: minmax(120px, 1.4fr) minmax(80px, 1.6fr) auto 52px;
		gap: 10px;
	}
}
`

// ── 10-util.js ──
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

// ── 20-api.js ──
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

// ── 30-charts.js ──
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

// ── 40-page.js ──
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

// ── 90-register.js ──
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

		return module.exports;
	}
});

//# sourceURL=dsh-usage-stats/client.js

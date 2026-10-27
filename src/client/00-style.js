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

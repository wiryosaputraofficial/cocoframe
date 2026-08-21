import { jsx, type CocoNode } from "@cocoframe/jsx";

export type ChartType = "line" | "area" | "bar" | "horizontal-bar" | "stacked-bar" | "pie" | "doughnut" | "polar-area" | "radar" | "scatter" | "bubble" | "mixed";
export type ChartTone = "primary" | "emerald" | "blue" | "violet" | "amber" | "red" | "slate" | "cyan";
export type ChartAspect = "wide" | "standard" | "square";
export type ChartSeriesType = "line" | "area" | "bar";

export interface ChartDatum { readonly label: string; readonly value: number; }
export interface ChartPoint { readonly x: number; readonly y: number; readonly r?: number; readonly label?: string; }
export interface ChartDataset {
  readonly label: string;
  readonly data: readonly (number | ChartPoint)[];
  readonly type?: ChartSeriesType;
  readonly tone?: ChartTone;
  readonly fill?: boolean;
}

export interface ChartProps {
  readonly id?: string;
  readonly type?: ChartType;
  readonly label: string;
  readonly description?: string;
  readonly labels?: readonly string[];
  readonly datasets?: readonly ChartDataset[];
  /** Backward-compatible single-series bar data. Prefer labels + datasets. */
  readonly data?: readonly ChartDatum[];
  readonly aspect?: ChartAspect;
  readonly showLegend?: boolean;
  readonly showGrid?: boolean;
  readonly showValues?: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly emptyText?: string;
  readonly formatValue?: (value: number) => string;
  readonly class?: string;
}

interface NormalizedDataset extends ChartDataset { readonly tone: ChartTone; }
interface Scale { readonly min: number; readonly max: number; readonly map: (value: number) => number; readonly ticks: readonly number[]; }

const WIDTH = 720;
const HEIGHT = 360;
const PLOT = { left: 62, top: 25, width: 632, height: 278 } as const;
const TONES: readonly ChartTone[] = ["primary", "blue", "amber", "violet", "emerald", "red", "cyan", "slate"];
const RADIAL = new Set<ChartType>(["pie", "doughnut", "polar-area", "radar"]);

export function Chart({
  id, type = "bar", label, description, labels: providedLabels, datasets: providedDatasets,
  data, aspect = "wide", showLegend, showGrid = true, showValues = false,
  min, max, emptyText = "No chart data available.", formatValue = defaultFormat, class: className,
}: ChartProps): CocoNode {
  const legacyLabels = data?.map((item) => item.label) ?? [];
  const labels = [...(providedLabels ?? legacyLabels)];
  const sourceDatasets: readonly ChartDataset[] = providedDatasets ?? (data ? [{ label, data: data.map((item) => item.value) }] : []);
  const datasets = sourceDatasets.map((dataset, index): NormalizedDataset => ({ ...dataset, tone: dataset.tone ?? TONES[index % TONES.length]! }));
  const hasData = hasPlottableData(type, datasets);
  const legendVisible = showLegend ?? (datasets.length > 1 || RADIAL.has(type));

  return jsx("figure", {
    class: classes("coco-chart", `coco-chart--${type}`, `coco-chart--${aspect}`, className),
    "data-chart-type": type,
    ...(id ? { id } : {}),
    children: [
      jsx("figcaption", { class: "coco-chart__caption", children: [jsx("strong", { children: label }), description ? jsx("small", { children: description }) : null] }),
      hasData ? jsx("div", { class: "coco-chart__viewport", children: jsx("svg", {
        viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
        role: "img",
        "aria-label": description ? `${label}. ${description}` : label,
        children: chartGraphic(type, labels, datasets, {
          showGrid,
          showValues,
          formatValue,
          ...(min === undefined ? {} : { min }),
          ...(max === undefined ? {} : { max }),
        }),
      }) }) : jsx("div", { class: "coco-chart__empty", role: "status", children: emptyText }),
      hasData && legendVisible ? legend(type, labels, datasets) : null,
      hasData ? accessibleTable(label, labels, datasets, formatValue) : null,
    ],
  });
}

function chartGraphic(type: ChartType, labels: readonly string[], datasets: readonly NormalizedDataset[], options: { readonly showGrid: boolean; readonly showValues: boolean; readonly min?: number; readonly max?: number; readonly formatValue: (value: number) => string }): CocoNode[] {
  if (type === "pie" || type === "doughnut" || type === "polar-area") return radialGraphic(type, labels, datasets, options);
  if (type === "radar") return radarGraphic(labels, datasets, options);
  if (type === "scatter" || type === "bubble") return scatterGraphic(type, datasets, options);
  if (type === "horizontal-bar") return horizontalBars(labels, datasets, options);
  return cartesianGraphic(type, labels, datasets, options);
}

function cartesianGraphic(type: ChartType, labels: readonly string[], datasets: readonly NormalizedDataset[], options: { readonly showGrid: boolean; readonly showValues: boolean; readonly min?: number; readonly max?: number; readonly formatValue: (value: number) => string }): CocoNode[] {
  const count = Math.max(labels.length, ...datasets.map((dataset) => dataset.data.length), 1);
  const categoryLabels = labels.length ? labels : Array.from({ length: count }, (_, index) => String(index + 1));
  const stacked = type === "stacked-bar";
  const values = stacked ? stackedExtents(datasets, count) : datasets.flatMap((dataset) => dataset.data.map(valueOf));
  const scale = verticalScale(values, options.min, options.max);
  const nodes: CocoNode[] = [...axes(categoryLabels, scale, options.showGrid, options.formatValue)];
  const barDatasets = datasets.filter((dataset) => type === "bar" || stacked || (type === "mixed" && (dataset.type ?? "line") === "bar"));
  const lineDatasets = datasets.filter((dataset) => type === "line" || type === "area" || (type === "mixed" && (dataset.type ?? "line") !== "bar"));
  if (barDatasets.length) nodes.push(...verticalBars(categoryLabels, barDatasets, scale, stacked, options));
  for (const dataset of lineDatasets) nodes.push(...lineSeries(categoryLabels, dataset, scale, type === "area" || dataset.type === "area" || dataset.fill === true, options));
  return nodes;
}

function axes(labels: readonly string[], scale: Scale, showGrid: boolean, formatValue: (value: number) => string): CocoNode[] {
  const nodes: CocoNode[] = [];
  for (const tick of scale.ticks) {
    const y = scale.map(tick);
    if (showGrid) nodes.push(jsx("line", { x1: PLOT.left, y1: y, x2: PLOT.left + PLOT.width, y2: y, class: "coco-chart__grid" }));
    nodes.push(jsx("text", { x: PLOT.left - 10, y: y + 4, "text-anchor": "end", class: "coco-chart__axis-label", children: formatValue(tick) }));
  }
  const every = Math.max(1, Math.ceil(labels.length / 8));
  labels.forEach((label, index) => {
    if (index % every !== 0 && index !== labels.length - 1) return;
    const x = categoryX(index, labels.length);
    nodes.push(jsx("text", { x, y: PLOT.top + PLOT.height + 27, "text-anchor": "middle", class: "coco-chart__axis-label", children: [jsx("title", { children: label }), shortLabel(label)] }));
  });
  nodes.push(jsx("line", { x1: PLOT.left, y1: scale.map(0), x2: PLOT.left + PLOT.width, y2: scale.map(0), class: "coco-chart__axis" }));
  return nodes;
}

function verticalBars(labels: readonly string[], datasets: readonly NormalizedDataset[], scale: Scale, stacked: boolean, options: { readonly showValues: boolean; readonly formatValue: (value: number) => string }): CocoNode[] {
  const count = Math.max(labels.length, ...datasets.map((dataset) => dataset.data.length), 1);
  const slot = PLOT.width / count;
  const groupWidth = Math.min(slot * .72, 54);
  const barWidth = stacked ? groupWidth : Math.max(3, groupWidth / Math.max(1, datasets.length));
  const positive = Array(count).fill(0) as number[];
  const negative = Array(count).fill(0) as number[];
  const nodes: CocoNode[] = [];
  datasets.forEach((dataset, datasetIndex) => dataset.data.forEach((datum, index) => {
    const value = valueOf(datum);
    const start = stacked ? (value >= 0 ? positive[index]! : negative[index]!) : 0;
    const end = start + value;
    if (stacked) (value >= 0 ? positive : negative)[index] = end;
    const y1 = scale.map(start);
    const y2 = scale.map(end);
    const x = PLOT.left + slot * index + (slot - groupWidth) / 2 + (stacked ? 0 : datasetIndex * barWidth);
    nodes.push(jsx("rect", { x, y: Math.min(y1, y2), width: Math.max(1, barWidth - 2), height: Math.max(1, Math.abs(y2 - y1)), rx: 3, class: classes("coco-chart__bar", toneClass(dataset.tone)), children: jsx("title", { children: `${dataset.label} · ${labels[index] ?? index + 1}: ${options.formatValue(value)}` }) }));
    if (options.showValues && !stacked) nodes.push(valueLabel(x + barWidth / 2, Math.min(y1, y2) - 7, value, options.formatValue));
  }));
  return nodes;
}

function lineSeries(labels: readonly string[], dataset: NormalizedDataset, scale: Scale, fill: boolean, options: { readonly showValues: boolean; readonly formatValue: (value: number) => string }): CocoNode[] {
  const count = Math.max(labels.length, dataset.data.length, 1);
  const points = dataset.data.map((datum, index) => ({ x: categoryX(index, count), y: scale.map(valueOf(datum)), value: valueOf(datum), label: labels[index] ?? String(index + 1) }));
  if (!points.length) return [];
  const path = points.map((point, index) => `${index ? "L" : "M"} ${round(point.x)} ${round(point.y)}`).join(" ");
  const nodes: CocoNode[] = [];
  if (fill) nodes.push(jsx("path", { d: `${path} L ${round(points.at(-1)!.x)} ${round(scale.map(0))} L ${round(points[0]!.x)} ${round(scale.map(0))} Z`, class: classes("coco-chart__area", toneClass(dataset.tone)) }));
  nodes.push(jsx("path", { d: path, class: classes("coco-chart__line", toneClass(dataset.tone)) }));
  for (const point of points) {
    nodes.push(jsx("circle", { cx: point.x, cy: point.y, r: 4, class: classes("coco-chart__point", toneClass(dataset.tone)), children: jsx("title", { children: `${dataset.label} · ${point.label}: ${options.formatValue(point.value)}` }) }));
    if (options.showValues) nodes.push(valueLabel(point.x, point.y - 10, point.value, options.formatValue));
  }
  return nodes;
}

function horizontalBars(labels: readonly string[], datasets: readonly NormalizedDataset[], options: { readonly showGrid: boolean; readonly showValues: boolean; readonly min?: number; readonly max?: number; readonly formatValue: (value: number) => string }): CocoNode[] {
  const count = Math.max(labels.length, ...datasets.map((dataset) => dataset.data.length), 1);
  const scale = horizontalScale(datasets.flatMap((dataset) => dataset.data.map(valueOf)), options.min, options.max);
  const slot = PLOT.height / count;
  const groupHeight = Math.min(slot * .7, 34);
  const barHeight = Math.max(3, groupHeight / Math.max(1, datasets.length));
  const nodes: CocoNode[] = [];
  for (const tick of scale.ticks) {
    const x = scale.map(tick);
    if (options.showGrid) nodes.push(jsx("line", { x1: x, y1: PLOT.top, x2: x, y2: PLOT.top + PLOT.height, class: "coco-chart__grid" }));
    nodes.push(jsx("text", { x, y: PLOT.top + PLOT.height + 27, "text-anchor": "middle", class: "coco-chart__axis-label", children: options.formatValue(tick) }));
  }
  const zero = scale.map(0);
  labels.forEach((label, index) => nodes.push(jsx("text", { x: PLOT.left - 10, y: PLOT.top + slot * index + slot / 2 + 4, "text-anchor": "end", class: "coco-chart__axis-label", children: [jsx("title", { children: label }), shortLabel(label)] })));
  datasets.forEach((dataset, datasetIndex) => dataset.data.forEach((datum, index) => {
    const value = valueOf(datum);
    const end = scale.map(value);
    const y = PLOT.top + slot * index + (slot - groupHeight) / 2 + datasetIndex * barHeight;
    nodes.push(jsx("rect", { x: Math.min(zero, end), y, width: Math.max(1, Math.abs(end - zero)), height: Math.max(1, barHeight - 2), rx: 3, class: classes("coco-chart__bar", toneClass(dataset.tone)), children: jsx("title", { children: `${dataset.label} · ${labels[index] ?? index + 1}: ${options.formatValue(value)}` }) }));
    if (options.showValues) nodes.push(valueLabel(end + (value >= 0 ? 7 : -7), y + barHeight / 2 + 4, value, options.formatValue, value >= 0 ? "start" : "end"));
  }));
  nodes.push(jsx("line", { x1: zero, y1: PLOT.top, x2: zero, y2: PLOT.top + PLOT.height, class: "coco-chart__axis" }));
  return nodes;
}

function radialGraphic(type: "pie" | "doughnut" | "polar-area", labels: readonly string[], datasets: readonly NormalizedDataset[], options: { readonly showValues: boolean; readonly formatValue: (value: number) => string }): CocoNode[] {
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2 + 5;
  const nodes: CocoNode[] = [];
  if (type === "doughnut") {
    const visibleDatasets = datasets.slice(0, 8);
    const ringCount = Math.max(1, visibleDatasets.length);
    const ringGap = 4;
    const strokeWidth = clamp((110 - ringGap * (ringCount - 1)) / ringCount, 8, 22);
    visibleDatasets.forEach((dataset, ringIndex) => {
      const values = dataset.data.map(valueOf).map((value) => Math.max(0, value));
      const total = values.reduce((sum, value) => sum + value, 0) || 1;
      const radius = 122 - strokeWidth / 2 - ringIndex * (strokeWidth + ringGap);
      let offset = 0;
      values.forEach((value, index) => {
        const percent = value / total * 100;
        nodes.push(jsx("circle", { cx, cy, r: radius, pathLength: 100, "stroke-dasharray": `${percent} ${100 - percent}`, "stroke-dashoffset": -offset, transform: `rotate(-90 ${cx} ${cy})`, class: classes("coco-chart__arc", `coco-chart__arc--rings-${ringCount}`, toneClass(TONES[(index + ringIndex) % TONES.length]!)), children: jsx("title", { children: `${dataset.label} · ${labels[index] ?? index + 1}: ${options.formatValue(value)}` }) }));
        offset += percent;
      });
    });
    return nodes;
  }
  const dataset = datasets[0]!;
  const values = dataset.data.map(valueOf).map((value) => Math.max(0, value));
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const max = Math.max(1, ...values);
  let angle = -Math.PI / 2;
  values.forEach((value, index) => {
    const slice = value / total * Math.PI * 2;
    const radius = type === "polar-area" ? 48 + value / max * 86 : 132;
    const end = angle + slice;
    nodes.push(jsx("path", { d: sectorPath(cx, cy, radius, angle, end), class: classes("coco-chart__slice", toneClass(TONES[index % TONES.length]!)), children: jsx("title", { children: `${labels[index] ?? index + 1}: ${options.formatValue(value)}` }) }));
    if (options.showValues && slice > .3) {
      const mid = angle + slice / 2;
      nodes.push(valueLabel(cx + Math.cos(mid) * radius * .65, cy + Math.sin(mid) * radius * .65, value, options.formatValue));
    }
    angle = end;
  });
  return nodes;
}

function radarGraphic(labels: readonly string[], datasets: readonly NormalizedDataset[], options: { readonly showGrid: boolean; readonly showValues: boolean; readonly max?: number; readonly formatValue: (value: number) => string }): CocoNode[] {
  const count = Math.max(labels.length, ...datasets.map((dataset) => dataset.data.length), 3);
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2 + 8;
  const radius = 122;
  const maximum = Math.max(1, options.max ?? Math.max(1, ...datasets.flatMap((dataset) => dataset.data.map(valueOf))));
  const nodes: CocoNode[] = [];
  if (options.showGrid) for (let level = 1; level <= 4; level++) nodes.push(jsx("polygon", { points: radarPoints(count, cx, cy, radius * level / 4, () => 1), class: "coco-chart__radar-grid" }));
  for (let index = 0; index < count; index++) {
    const point = polarPoint(cx, cy, radius, index / count * Math.PI * 2 - Math.PI / 2);
    nodes.push(jsx("line", { x1: cx, y1: cy, x2: point.x, y2: point.y, class: "coco-chart__grid" }));
    const labelPoint = polarPoint(cx, cy, radius + 18, index / count * Math.PI * 2 - Math.PI / 2);
    nodes.push(jsx("text", { x: labelPoint.x, y: labelPoint.y + 3, "text-anchor": labelPoint.x < cx - 5 ? "end" : labelPoint.x > cx + 5 ? "start" : "middle", class: "coco-chart__axis-label", children: shortLabel(labels[index] ?? String(index + 1)) }));
  }
  datasets.forEach((dataset) => {
    nodes.push(jsx("polygon", { points: radarPoints(count, cx, cy, radius, (index) => Math.max(0, valueOf(dataset.data[index] ?? 0)) / maximum), class: classes("coco-chart__radar-area", toneClass(dataset.tone)), children: jsx("title", { children: dataset.label }) }));
    dataset.data.forEach((datum, index) => {
      const value = valueOf(datum);
      const point = polarPoint(cx, cy, radius * Math.max(0, value) / maximum, index / count * Math.PI * 2 - Math.PI / 2);
      nodes.push(jsx("circle", { cx: point.x, cy: point.y, r: 3.5, class: classes("coco-chart__point", toneClass(dataset.tone)), children: jsx("title", { children: `${dataset.label} · ${labels[index] ?? index + 1}: ${options.formatValue(value)}` }) }));
      if (options.showValues) nodes.push(valueLabel(point.x, point.y - 8, value, options.formatValue));
    });
  });
  return nodes;
}

function scatterGraphic(type: "scatter" | "bubble", datasets: readonly NormalizedDataset[], options: { readonly showGrid: boolean; readonly showValues: boolean; readonly min?: number; readonly max?: number; readonly formatValue: (value: number) => string }): CocoNode[] {
  const points = datasets.flatMap((dataset) => dataset.data.filter(isPoint));
  const xScale = horizontalScale(points.map((point) => point.x), options.min, options.max);
  const yScale = verticalScale(points.map((point) => point.y), options.min, options.max);
  const nodes: CocoNode[] = [];
  for (const tick of yScale.ticks) {
    const y = yScale.map(tick);
    if (options.showGrid) nodes.push(jsx("line", { x1: PLOT.left, y1: y, x2: PLOT.left + PLOT.width, y2: y, class: "coco-chart__grid" }));
    nodes.push(jsx("text", { x: PLOT.left - 10, y: y + 4, "text-anchor": "end", class: "coco-chart__axis-label", children: options.formatValue(tick) }));
  }
  for (const tick of xScale.ticks) {
    const x = xScale.map(tick);
    if (options.showGrid) nodes.push(jsx("line", { x1: x, y1: PLOT.top, x2: x, y2: PLOT.top + PLOT.height, class: "coco-chart__grid" }));
    nodes.push(jsx("text", { x, y: PLOT.top + PLOT.height + 27, "text-anchor": "middle", class: "coco-chart__axis-label", children: options.formatValue(tick) }));
  }
  datasets.forEach((dataset) => dataset.data.filter(isPoint).forEach((point) => {
    const radius = type === "bubble" ? clamp(point.r ?? 8, 3, 24) : 5;
    nodes.push(jsx("circle", { cx: xScale.map(point.x), cy: yScale.map(point.y), r: radius, class: classes("coco-chart__bubble", toneClass(dataset.tone)), children: jsx("title", { children: `${dataset.label}${point.label ? ` · ${point.label}` : ""}: x ${options.formatValue(point.x)}, y ${options.formatValue(point.y)}${type === "bubble" ? `, r ${radius}` : ""}` }) }));
    if (options.showValues) nodes.push(valueLabel(xScale.map(point.x), yScale.map(point.y) - radius - 5, point.y, options.formatValue));
  }));
  return nodes;
}

function legend(type: ChartType, labels: readonly string[], datasets: readonly NormalizedDataset[]): CocoNode {
  const categoryLegend = type === "pie" || type === "doughnut" || type === "polar-area";
  const items = categoryLegend
    ? Array.from({ length: Math.max(labels.length, datasets[0]?.data.length ?? 0) }, (_, index) => ({ label: labels[index] ?? String(index + 1), tone: TONES[index % TONES.length]! }))
    : datasets.map((dataset) => ({ label: dataset.label, tone: dataset.tone }));
  return jsx("ul", { class: "coco-chart__legend", "aria-label": "Chart legend", children: items.map((item) => jsx("li", { children: [jsx("span", { class: classes("coco-chart__legend-swatch", toneClass(item.tone)), "aria-hidden": "true" }), jsx("span", { children: item.label })] })) });
}

function accessibleTable(label: string, labels: readonly string[], datasets: readonly NormalizedDataset[], formatValue: (value: number) => string): CocoNode {
  const count = Math.max(labels.length, ...datasets.map((dataset) => dataset.data.length), 0);
  return jsx("table", { class: "coco-visually-hidden", children: [
    jsx("caption", { children: `${label} data` }),
    jsx("thead", { children: jsx("tr", { children: [jsx("th", { scope: "col", children: "Label" }), ...datasets.map((dataset) => jsx("th", { scope: "col", children: dataset.label }))] }) }),
    jsx("tbody", { children: Array.from({ length: count }, (_, index) => jsx("tr", { children: [jsx("th", { scope: "row", children: labels[index] ?? String(index + 1) }), ...datasets.map((dataset) => jsx("td", { children: datumText(dataset.data[index], formatValue) }))] })) }),
  ] });
}

function verticalScale(values: readonly number[], min?: number, max?: number): Scale { return createScale(values, PLOT.top + PLOT.height, PLOT.top, min, max); }
function horizontalScale(values: readonly number[], min?: number, max?: number): Scale { return createScale(values, PLOT.left, PLOT.left + PLOT.width, min, max); }
function createScale(values: readonly number[], outputMin: number, outputMax: number, explicitMin?: number, explicitMax?: number): Scale {
  const finiteValues = values.filter(Number.isFinite);
  let minimum = explicitMin ?? Math.min(0, ...finiteValues);
  let maximum = explicitMax ?? Math.max(0, ...finiteValues);
  if (!Number.isFinite(minimum)) minimum = 0;
  if (!Number.isFinite(maximum)) maximum = 1;
  if (minimum === maximum) { minimum = minimum > 0 ? 0 : minimum - 1; maximum = maximum <= 0 ? 0 : maximum + 1; }
  if (minimum > maximum) [minimum, maximum] = [maximum, minimum];
  const range = maximum - minimum;
  return { min: minimum, max: maximum, map: (value) => outputMin + (value - minimum) / range * (outputMax - outputMin), ticks: Array.from({ length: 5 }, (_, index) => minimum + range * index / 4) };
}

function stackedExtents(datasets: readonly NormalizedDataset[], count: number): number[] {
  const positive = Array(count).fill(0) as number[];
  const negative = Array(count).fill(0) as number[];
  datasets.forEach((dataset) => dataset.data.forEach((datum, index) => {
    if (index >= count) return;
    const value = valueOf(datum);
    const totals = value >= 0 ? positive : negative;
    totals[index] = (totals[index] ?? 0) + value;
  }));
  return [...positive, ...negative];
}
function categoryX(index: number, count: number): number { return PLOT.left + (index + .5) / Math.max(1, count) * PLOT.width; }
function valueOf(datum: number | ChartPoint): number { return typeof datum === "number" ? finite(datum) : finite(datum.y); }
function validDatum(datum: number | ChartPoint): boolean { return typeof datum === "number" ? Number.isFinite(datum) : Number.isFinite(datum.x) && Number.isFinite(datum.y); }
function hasPlottableData(type: ChartType, datasets: readonly NormalizedDataset[]): boolean {
  if (type === "scatter" || type === "bubble") return datasets.some((dataset) => dataset.data.some(isPoint));
  if (type === "pie" || type === "doughnut" || type === "polar-area" || type === "radar") return datasets.some((dataset) => dataset.data.some((datum) => validDatum(datum) && valueOf(datum) > 0));
  return datasets.some((dataset) => dataset.data.some(validDatum));
}
function isPoint(datum: number | ChartPoint): datum is ChartPoint { return typeof datum === "object" && datum !== null && Number.isFinite(datum.x) && Number.isFinite(datum.y); }
function finite(value: number): number { return Number.isFinite(value) ? value : 0; }
function defaultFormat(value: number): string { return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value); }
function shortLabel(value: string): string { return value.length > 12 ? `${value.slice(0, 11)}…` : value; }
function toneClass(tone: ChartTone): string { return `coco-chart__tone--${tone}`; }
function valueLabel(x: number, y: number, value: number, formatValue: (value: number) => string, anchor: "start" | "middle" | "end" = "middle"): CocoNode { return jsx("text", { x, y, "text-anchor": anchor, class: "coco-chart__value", children: formatValue(value) }); }
function datumText(datum: number | ChartPoint | undefined, formatValue: (value: number) => string): string { if (datum === undefined) return "—"; return typeof datum === "number" ? formatValue(datum) : `x ${formatValue(datum.x)}, y ${formatValue(datum.y)}${datum.r === undefined ? "" : `, r ${formatValue(datum.r)}`}`; }
function polarPoint(cx: number, cy: number, radius: number, angle: number): { readonly x: number; readonly y: number } { return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }; }
function sectorPath(cx: number, cy: number, radius: number, start: number, end: number): string {
  const startPoint = polarPoint(cx, cy, radius, start);
  const endPoint = polarPoint(cx, cy, radius, end);
  if (end - start >= Math.PI * 2 - .0001) return `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius} Z`;
  return `M ${cx} ${cy} L ${round(startPoint.x)} ${round(startPoint.y)} A ${radius} ${radius} 0 ${end - start > Math.PI ? 1 : 0} 1 ${round(endPoint.x)} ${round(endPoint.y)} Z`;
}
function radarPoints(count: number, cx: number, cy: number, radius: number, ratio: (index: number) => number): string { return Array.from({ length: count }, (_, index) => { const point = polarPoint(cx, cy, radius * clamp(ratio(index), 0, 1), index / count * Math.PI * 2 - Math.PI / 2); return `${round(point.x)},${round(point.y)}`; }).join(" "); }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
function round(value: number): number { return Math.round(value * 100) / 100; }
function classes(...names: readonly (string | undefined | false)[]): string { return names.filter(Boolean).join(" "); }

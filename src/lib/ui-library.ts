/**
 * Fundamental Composable UI Blocks Catalog
 * Inspired by Gamma's liquid cards and nested block architecture.
 *
 * Rather than rigid monolithic templates (stopwatch, clock, weather, slides),
 * this system provides fundamental, nestable building blocks linked to a reactive
 * logic engine (`state`, `tick`, `onTick`, `onClick`, `bind`, and `${...}` interpolation).
 */

export interface UIComponentDef {
  id: string;
  name: string;
  type: string;
  category: "layout" | "content" | "interactive" | "data" | "visualizer";
  description: string;
  tags: string[];
  defaultProps: Record<string, any>;
  snippet: string;
  jsonSnippet: string;
}

export const COMPONENT_CATALOG: UIComponentDef[] = [
  /* =========================================================================
     LAYOUT & CONTAINERS (Gamma-inspired composable cards & grids)
     ========================================================================= */
  {
    id: "card",
    name: "Composable Card",
    type: "card",
    category: "layout",
    description: "Universal liquid container. Can hold title, subtitle, badge, child blocks, and define its own reactive state and tick loop.",
    tags: ["card", "container", "box", "slide", "section", "reactive"],
    defaultProps: {
      title: "Active Workspace",
      subtitle: "Dynamic scenario modeling",
      blocks: [
        { type: "text", text: "Liquid container with nested composable primitives.", variant: "sub" },
      ],
    },
    snippet: '<component type="card" title="Workspace" subtitle="Dynamic model" />',
    jsonSnippet: JSON.stringify(
      {
        type: "card",
        title: "Workspace Model",
        subtitle: "Composable block container",
        blocks: [
          { type: "metric", label: "Throughput", value: "2.4k req/s", delta: "+18%" },
        ],
      },
      null,
      2
    ),
  },
  {
    id: "grid",
    name: "Layout Grid",
    type: "grid",
    category: "layout",
    description: "Nestable multi-column layout grid (cols: 1 to 6) for placing metrics, inputs, charts, or cards side-by-side.",
    tags: ["grid", "columns", "layout", "row", "flex"],
    defaultProps: {
      cols: 2,
      gap: "10px",
      blocks: [
        { type: "metric", label: "CPU Usage", value: "42%" },
        { type: "metric", label: "Memory", value: "3.2 GB" },
      ],
    },
    snippet: '<component type="grid" cols="2" />',
    jsonSnippet: JSON.stringify(
      {
        type: "grid",
        cols: 2,
        blocks: [
          { type: "metric", label: "Metric A", value: "100" },
          { type: "metric", label: "Metric B", value: "200" },
        ],
      },
      null,
      2
    ),
  },

  /* =========================================================================
     TYPOGRAPHY & CONTENT
     ========================================================================= */
  {
    id: "text",
    name: "Typography Text Block",
    type: "text",
    category: "content",
    description: "Composable text block supporting title, sub, kicker, code, and markdown variants with reactive ${...} interpolation.",
    tags: ["text", "title", "heading", "typography", "sub", "kicker", "code"],
    defaultProps: { text: "Main takeaway or section summary.", variant: "body" },
    snippet: '<component type="text" text="Executive Summary" variant="title" />',
    jsonSnippet: JSON.stringify({ type: "text", text: "Executive Summary", variant: "title" }, null, 2),
  },
  {
    id: "badge",
    name: "Status Badge / Tag",
    type: "badge",
    category: "content",
    description: "Minimalist pill badge with color variants (default, accent, ok, warn, danger, faint) and reactive state binding.",
    tags: ["badge", "tag", "pill", "status", "label"],
    defaultProps: { text: "ACTIVE", color: "ok" },
    snippet: '<component type="badge" text="ACTIVE" color="ok" />',
    jsonSnippet: JSON.stringify({ type: "badge", text: "ACTIVE", color: "ok" }, null, 2),
  },
  {
    id: "divider",
    name: "Hairline Divider",
    type: "divider",
    category: "content",
    description: "Subtle hairline rule separating sections within a card or view.",
    tags: ["divider", "hr", "separator", "rule", "line"],
    defaultProps: {},
    snippet: '<component type="divider" />',
    jsonSnippet: JSON.stringify({ type: "divider" }, null, 2),
  },

  /* =========================================================================
     DATA & KPIS
     ========================================================================= */
  {
    id: "metric",
    name: "KPI Metric Stat",
    type: "metric",
    category: "data",
    description: "High-impact stat block displaying large tabular figures, trend delta, and subtext with live formula recalculation.",
    tags: ["metric", "stat", "kpi", "number", "delta", "growth"],
    defaultProps: { label: "Monthly Recurring Revenue", value: "$48,500", delta: "+12.4%", sub: "vs last month" },
    snippet: '<component type="metric" label="MRR" value="$48.5K" delta="+12.4%" />',
    jsonSnippet: JSON.stringify({ type: "metric", label: "MRR", value: "$48.5K", delta: "+12.4%" }, null, 2),
  },
  {
    id: "chart",
    name: "Interactive Composable Chart",
    type: "chart",
    category: "data",
    description: "Chart block (line, area, bar, hbar, donut, pie, radar, gauge, candlestick) with tooltips and reactive data bindings.",
    tags: ["chart", "plot", "graph", "line", "bar", "area", "donut", "pie", "radar", "gauge"],
    defaultProps: {
      kind: "area",
      title: "Inference Volume",
      data: [
        { label: "Mon", value: 1200 },
        { label: "Tue", value: 1900 },
        { label: "Wed", value: 2400 },
        { label: "Thu", value: 1800 },
        { label: "Fri", value: 2800 },
      ],
    },
    snippet: '<component type="chart" kind="area" title="Volume" />',
    jsonSnippet: JSON.stringify(
      {
        type: "chart",
        kind: "area",
        title: "Inference Volume",
        data: [
          { label: "Q1", value: 120 },
          { label: "Q2", value: 240 },
          { label: "Q3", value: 310 },
        ],
      },
      null,
      2
    ),
  },
  {
    id: "table",
    name: "Data Table",
    type: "table",
    category: "data",
    description: "Sortable, clean data table with tabular number alignment.",
    tags: ["table", "grid", "data", "rows", "columns"],
    defaultProps: {
      headers: ["Region", "Cluster", "Latency (ms)", "Status"],
      rows: [
        ["us-east-1", "east-prod-01", 24, "Healthy"],
        ["us-west-2", "west-prod-04", 29, "Healthy"],
        ["eu-west-1", "eu-prod-02", 34, "Healthy"],
      ],
    },
    snippet: '<component type="table" headers=\'["Name","Value"]\' rows=\'[["A",10],["B",20]]\' />',
    jsonSnippet: JSON.stringify({ type: "table", headers: ["Name", "Value"], rows: [["A", 10], ["B", 20]] }, null, 2),
  },

  /* =========================================================================
     INTERACTIVE CONTROLS & REACTIVE BINDINGS
     ========================================================================= */
  {
    id: "slider",
    name: "Precision Expansion Slider",
    type: "slider",
    category: "interactive",
    description: "Resting hairline bar expanding to 26px on drag with precision numeric readout, two-way bound to reactive state via bind.",
    tags: ["slider", "range", "stepper", "number", "precision", "bind"],
    defaultProps: { label: "Seat Price: $${price}", min: 10, max: 200, step: 5, bind: "price" },
    snippet: '<component type="slider" label="Seat Price" min="10" max="200" step="5" bind="price" />',
    jsonSnippet: JSON.stringify({ type: "slider", label: "Seat Price: $${price}", min: 10, max: 200, step: 5, bind: "price" }, null, 2),
  },
  {
    id: "button",
    name: "Reactive Action Button",
    type: "button",
    category: "interactive",
    description: "Tactile button executing state mutation scripts (onClick) or submitting scenario state back to chat (submitToChat).",
    tags: ["button", "action", "trigger", "cta", "submit", "onClick"],
    defaultProps: { text: "Increment Counter", variant: "primary", onClick: "count++" },
    snippet: '<component type="button" text="Increment" variant="primary" onClick="count++" />',
    jsonSnippet: JSON.stringify({ type: "button", text: "Increment", variant: "primary", onClick: "count++" }, null, 2),
  },
  {
    id: "input",
    name: "Text / Number Input",
    type: "input",
    category: "interactive",
    description: "Universal clean text or number input with two-way binding to reactive state via bind.",
    tags: ["input", "text", "number", "field", "bind"],
    defaultProps: { label: "Project Title", placeholder: "Enter title...", bind: "title" },
    snippet: '<component type="input" label="Project Title" bind="title" />',
    jsonSnippet: JSON.stringify({ type: "input", label: "Project Title", bind: "title" }, null, 2),
  },
  {
    id: "dropdown",
    name: "Select Dropdown",
    type: "dropdown",
    category: "interactive",
    description: "Minimalist select menu with search and two-way binding to reactive state via bind.",
    tags: ["dropdown", "select", "options", "menu", "bind"],
    defaultProps: {
      label: "Deployment Region",
      options: ["us-east-1", "us-west-2", "eu-central-1", "ap-northeast-1"],
      bind: "region",
    },
    snippet: '<component type="dropdown" label="Region" options=\'["us-east-1","us-west-2"]\' bind="region" />',
    jsonSnippet: JSON.stringify({ type: "dropdown", label: "Region", options: ["us-east-1", "us-west-2"], bind: "region" }, null, 2),
  },
  {
    id: "switch",
    name: "Toggle Switch",
    type: "switch",
    category: "interactive",
    description: "Smooth toggle switch for boolean state, two-way bound via bind.",
    tags: ["switch", "toggle", "boolean", "bind"],
    defaultProps: { label: "Enable telemetry", description: "Send performance diagnostics", bind: "telemetry" },
    snippet: '<component type="switch" label="Enable telemetry" bind="telemetry" />',
    jsonSnippet: JSON.stringify({ type: "switch", label: "Enable telemetry", bind: "telemetry" }, null, 2),
  },
  {
    id: "checkbox",
    name: "Checkbox",
    type: "checkbox",
    category: "interactive",
    description: "Checkbox for boolean state with label and description, two-way bound via bind.",
    tags: ["checkbox", "check", "boolean", "bind"],
    defaultProps: { label: "Include historical benchmarks", bind: "includeBenchmarks" },
    snippet: '<component type="checkbox" label="Include benchmarks" bind="includeBenchmarks" />',
    jsonSnippet: JSON.stringify({ type: "checkbox", label: "Include benchmarks", bind: "includeBenchmarks" }, null, 2),
  },
  {
    id: "progress",
    name: "Progress Meter",
    type: "progress",
    category: "interactive",
    description: "Progress bar with dynamic expression evaluation (e.g. ((total - left)/total)*100).",
    tags: ["progress", "meter", "bar", "percentage"],
    defaultProps: { label: "Sprint Completion", value: 68, max: 100, unit: "%" },
    snippet: '<component type="progress" label="Completion" value="68" />',
    jsonSnippet: JSON.stringify({ type: "progress", label: "Completion", value: 68 }, null, 2),
  },

  /* =========================================================================
     SPECIALIZED VISUALIZERS
     ========================================================================= */
  {
    id: "math",
    name: "Interactive 2D Math Function Plotter",
    type: "math",
    category: "visualizer",
    description: "Interactive 2D function visualizer with drag-to-pan, zoom, axes, tracking crosshairs, or Desmos embeds.",
    tags: ["math", "plot", "function", "formula", "desmos", "calculus"],
    defaultProps: { fn: "sin(x) * cos(2*x)", title: "Wave Function Interference", xmin: -6, xmax: 6, ymin: -2, ymax: 2 },
    snippet: '<component type="math" fn="sin(x)*cos(2*x)" title="Wave Interference" />',
    jsonSnippet: JSON.stringify({ type: "math", fn: "sin(x)*cos(2*x)", title: "Wave Interference" }, null, 2),
  },
  {
    id: "chemistry",
    name: "Organic Chemistry Molecular Diagram",
    type: "chemistry",
    category: "visualizer",
    description: "2D molecular structure diagram rendered directly from SMILES strings or common molecule names via smiles-drawer.",
    tags: ["chemistry", "molecule", "smiles", "diagram", "compound"],
    defaultProps: { smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C", title: "Caffeine Molecular Structure" },
    snippet: '<component type="chemistry" molecule="caffeine" />',
    jsonSnippet: JSON.stringify({ type: "chemistry", molecule: "caffeine" }, null, 2),
  },
];

/**
 * Search the component catalog by query, tag, or category.
 */
export function searchComponents(query?: string, opts?: { category?: string; tag?: string; limit?: number }): UIComponentDef[] {
  let list = COMPONENT_CATALOG;
  if (opts?.category && opts.category !== "all") {
    list = list.filter((c) => c.category === opts.category);
  }
  if (opts?.tag) {
    const t = opts.tag.toLowerCase();
    list = list.filter((c) => c.tags.some((tag) => tag.toLowerCase() === t));
  }
  const q = (query || "").trim().toLowerCase();
  if (!q || q === "all" || q === "*") {
    return opts?.limit ? list.slice(0, opts.limit) : list;
  }
  const keywords = q.split(/\s+/).filter(Boolean);
  const matched = list.filter((c) => {
    const hay = `${c.name} ${c.type} ${c.description} ${c.tags.join(" ")} ${c.category}`.toLowerCase();
    return keywords.some((kw) => hay.includes(kw));
  });
  return opts?.limit ? matched.slice(0, opts.limit) : matched;
}

/** Get a component definition by exact type or id. */
export function getComponentDef(typeOrId: string): UIComponentDef | undefined {
  const norm = (typeOrId || "").trim().toLowerCase();
  return COMPONENT_CATALOG.find((c) => c.type.toLowerCase() === norm || c.id.toLowerCase() === norm);
}

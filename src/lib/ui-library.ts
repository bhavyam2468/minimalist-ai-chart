/**
 * UI Component Library & Marketplace
 * Comprehensive registry of interactive components for both users and LLMs.
 */

export interface UIComponentProp {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  default?: any;
  required?: boolean;
  options?: string[];
}

export interface UIComponentDef {
  id: string;
  type: string;
  name: string;
  category: "form" | "chart" | "math-science" | "data" | "feedback" | "layout" | "interactive";
  tags: string[];
  description: string;
  schema: Record<string, UIComponentProp>;
  defaultProps: Record<string, any>;
  snippet: string;
  jsonSnippet: string;
}

export const COMPONENT_CATALOG: UIComponentDef[] = [
  /* ------------------------------------------------------------ FORM COMPONENTS */
  {
    id: "slider",
    type: "slider",
    name: "iOS Fluid Volume Slider",
    category: "form",
    tags: ["form", "slider", "volume", "range", "ios", "input", "control", "audio"],
    description: "Tactile iOS-style pill slider with fluid spring expansion on hover/drag, smooth inner fill, and live value indicator.",
    schema: {
      value: { name: "value", type: "number", description: "Initial or current slider value", default: 65 },
      min: { name: "min", type: "number", description: "Minimum boundary value", default: 0 },
      max: { name: "max", type: "number", description: "Maximum boundary value", default: 100 },
      step: { name: "step", type: "number", description: "Step increment", default: 1 },
      unit: { name: "unit", type: "string", description: "Unit label suffix (e.g. %, dB, ms, px)", default: "%" },
      label: { name: "label", type: "string", description: "Slider label or title", default: "Volume" },
      icon: { name: "icon", type: "string", description: "Optional icon prefix ('volume', 'sliders', 'none')", default: "volume" },
    },
    defaultProps: {
      value: 70,
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
      label: "Output Volume",
      icon: "volume",
    },
    snippet: '<component type="slider" label="Output Volume" value="70" min="0" max="100" unit="%" icon="volume" />',
    jsonSnippet: JSON.stringify({ type: "slider", label: "Output Volume", value: 70, min: 0, max: 100, unit: "%", icon: "volume" }, null, 2),
  },
  {
    id: "button",
    type: "button",
    name: "Interactive Action Button",
    category: "form",
    tags: ["form", "button", "action", "cta", "click", "input", "press"],
    description: "Versatile button with spring press feedback, support for primary, secondary, outline, danger variants, icon slots, and animated loading spinner.",
    schema: {
      label: { name: "label", type: "string", description: "Button text", default: "Run Analysis", required: true },
      variant: { name: "variant", type: "string", description: "Visual style variant", default: "primary", options: ["primary", "secondary", "outline", "ghost", "danger", "pill"] },
      size: { name: "size", type: "string", description: "Size of the button", default: "md", options: ["sm", "md", "lg"] },
      icon: { name: "icon", type: "string", description: "Icon name to display beside text" },
      loading: { name: "loading", type: "boolean", description: "Displays animated spinner", default: false },
      disabled: { name: "disabled", type: "boolean", description: "Disables interaction", default: false },
    },
    defaultProps: {
      label: "Execute Pipeline",
      variant: "primary",
      size: "md",
    },
    snippet: '<component type="button" label="Execute Pipeline" variant="primary" size="md" />',
    jsonSnippet: JSON.stringify({ type: "button", label: "Execute Pipeline", variant: "primary", size: "md" }, null, 2),
  },
  {
    id: "checkbox",
    type: "checkbox",
    name: "Animated Checkbox",
    category: "form",
    tags: ["form", "checkbox", "toggle", "check", "select", "choice", "boolean"],
    description: "Fluid checkbox with SVG stroke checkmark drawing animation, subtle bounce, title, and optional description.",
    schema: {
      label: { name: "label", type: "string", description: "Checkbox title or question", required: true },
      description: { name: "description", type: "string", description: "Sub-label or explanatory note" },
      checked: { name: "checked", type: "boolean", description: "Checked state", default: false },
      disabled: { name: "disabled", type: "boolean", description: "Disabled state", default: false },
    },
    defaultProps: {
      label: "Stream real-time performance telemetry",
      description: "Sample metrics every 250ms with zero server latency",
      checked: true,
    },
    snippet: '<component type="checkbox" label="Stream real-time performance telemetry" description="Sample metrics every 250ms" checked="true" />',
    jsonSnippet: JSON.stringify({ type: "checkbox", label: "Stream real-time performance telemetry", description: "Sample metrics every 250ms", checked: true }, null, 2),
  },
  {
    id: "radio",
    type: "radio",
    name: "Radio Selection Group",
    category: "form",
    tags: ["form", "radio", "radio-group", "choice", "options", "select"],
    description: "Radio selection cards with spring-animated center dot indicator and smooth border transitions.",
    schema: {
      name: { name: "name", type: "string", description: "Group name identifier", default: "selection" },
      value: { name: "value", type: "string", description: "Currently selected option id" },
      options: { name: "options", type: "array", description: "Array of options [{ id, label, description }]", required: true },
    },
    defaultProps: {
      value: "balanced",
      options: [
        { id: "fast", label: "Ultra Low Latency", description: "< 40ms edge inference" },
        { id: "balanced", label: "Balanced Throughput", description: "Recommended for production workloads" },
        { id: "accurate", label: "High Precision", description: "Extended chain-of-thought verification" },
      ],
    },
    snippet: '<component type="radio" value="balanced" options=\'[{"id":"fast","label":"Low Latency"},{"id":"balanced","label":"Balanced"},{"id":"accurate","label":"High Precision"}]\' />',
    jsonSnippet: JSON.stringify({
      type: "radio",
      value: "balanced",
      options: [
        { id: "fast", label: "Low Latency", description: "< 40ms edge inference" },
        { id: "balanced", label: "Balanced Throughput", description: "Recommended for production workloads" },
        { id: "accurate", label: "High Precision", description: "Extended chain-of-thought verification" },
      ],
    }, null, 2),
  },
  {
    id: "dropdown",
    type: "dropdown",
    name: "Searchable Dropdown Menu",
    category: "form",
    tags: ["form", "dropdown", "select", "combobox", "menu", "picker", "options"],
    description: "Dropdown selector with smooth fold-out animation, search filtering, chevron flip, and keyboard selection.",
    schema: {
      label: { name: "label", type: "string", description: "Dropdown field label" },
      placeholder: { name: "placeholder", type: "string", description: "Placeholder when no value is chosen", default: "Select an option..." },
      value: { name: "value", type: "string", description: "Currently selected option value" },
      options: { name: "options", type: "array", description: "Array of items [{ label, value }]", required: true },
      searchable: { name: "searchable", type: "boolean", description: "Whether to enable live search filtering", default: true },
    },
    defaultProps: {
      label: "Deployment Region",
      placeholder: "Choose region...",
      value: "us-east",
      options: [
        { label: "US East (N. Virginia)", value: "us-east" },
        { label: "US West (Oregon)", value: "us-west" },
        { label: "EU Central (Frankfurt)", value: "eu-central" },
        { label: "Asia Pacific (Tokyo)", value: "ap-tokyo" },
        { label: "South America (São Paulo)", value: "sa-east" },
      ],
      searchable: true,
    },
    snippet: '<component type="dropdown" label="Deployment Region" value="us-east" options=\'[{"label":"US East","value":"us-east"},{"label":"EU Central","value":"eu-central"}]\' />',
    jsonSnippet: JSON.stringify({
      type: "dropdown",
      label: "Deployment Region",
      value: "us-east",
      options: [
        { label: "US East (N. Virginia)", value: "us-east" },
        { label: "EU Central (Frankfurt)", value: "eu-central" },
        { label: "Asia Pacific (Tokyo)", value: "ap-tokyo" },
      ],
    }, null, 2),
  },
  {
    id: "switch",
    type: "switch",
    name: "iOS Fluid Toggle Switch",
    category: "form",
    tags: ["form", "switch", "toggle", "ios", "boolean", "control"],
    description: "Fluid iOS-style sliding toggle switch with spring handle elongation and smooth track color morphing.",
    schema: {
      label: { name: "label", type: "string", description: "Toggle title", required: true },
      description: { name: "description", type: "string", description: "Explanatory subtitle" },
      checked: { name: "checked", type: "boolean", description: "Current switch state", default: false },
    },
    defaultProps: {
      label: "Autonomous Model Routing",
      description: "Route requests dynamically across fastest available frontier models",
      checked: true,
    },
    snippet: '<component type="switch" label="Autonomous Model Routing" description="Route requests dynamically" checked="true" />',
    jsonSnippet: JSON.stringify({ type: "switch", label: "Autonomous Model Routing", description: "Route requests dynamically across fastest available models", checked: true }, null, 2),
  },
  {
    id: "input",
    type: "input",
    name: "Text Input Field",
    category: "form",
    tags: ["form", "input", "text", "field", "search", "textbox"],
    description: "Clean input field with animated focus ring, clear button, prefix icon, and optional placeholder.",
    schema: {
      label: { name: "label", type: "string", description: "Field label" },
      placeholder: { name: "placeholder", type: "string", description: "Ghost hint text" },
      value: { name: "value", type: "string", description: "Current input text" },
      clearable: { name: "clearable", type: "boolean", description: "Whether to show quick clear button", default: true },
    },
    defaultProps: {
      label: "Prometheus Metrics Endpoint",
      placeholder: "https://prometheus.internal/metrics",
      value: "https://metrics.cluster.local:9090/federate",
      clearable: true,
    },
    snippet: '<component type="input" label="Prometheus Metrics Endpoint" value="https://metrics.cluster.local:9090/federate" />',
    jsonSnippet: JSON.stringify({ type: "input", label: "Prometheus Metrics Endpoint", value: "https://metrics.cluster.local:9090/federate" }, null, 2),
  },
  {
    id: "stepper",
    type: "stepper",
    name: "Number Stepper",
    category: "form",
    tags: ["form", "stepper", "number", "counter", "increment", "decrement"],
    description: "Increment and decrement stepper control with smooth digit transition, min, max, and step boundaries.",
    schema: {
      label: { name: "label", type: "string", description: "Stepper label" },
      value: { name: "value", type: "number", description: "Current integer/float value", default: 1 },
      min: { name: "min", type: "number", description: "Minimum limit", default: 1 },
      max: { name: "max", type: "number", description: "Maximum limit", default: 100 },
      step: { name: "step", type: "number", description: "Increment amount", default: 1 },
      unit: { name: "unit", type: "string", description: "Unit suffix (e.g. instances, workers, ms)" },
    },
    defaultProps: {
      label: "Compute Replicas",
      value: 4,
      min: 1,
      max: 16,
      step: 1,
      unit: "nodes",
    },
    snippet: '<component type="stepper" label="Compute Replicas" value="4" min="1" max="16" unit="nodes" />',
    jsonSnippet: JSON.stringify({ type: "stepper", label: "Compute Replicas", value: 4, min: 1, max: 16, unit: "nodes" }, null, 2),
  },

  /* ------------------------------------------------------------ FEEDBACK */
  {
    id: "rating",
    type: "rating",
    name: "Interactive Star Rating",
    category: "feedback",
    tags: ["feedback", "rating", "stars", "review", "score", "interactive"],
    description: "5-star rating widget with hover preview and spring bounce animation.",
    schema: {
      value: { name: "value", type: "number", description: "Rated score out of max", default: 5 },
      max: { name: "max", type: "number", description: "Maximum stars", default: 5 },
      label: { name: "label", type: "string", description: "Optional title or label" },
    },
    defaultProps: {
      label: "Code Generation Accuracy",
      value: 4.5,
      max: 5,
    },
    snippet: '<component type="rating" label="Code Generation Accuracy" value="4.5" max="5" />',
    jsonSnippet: JSON.stringify({ type: "rating", label: "Code Generation Accuracy", value: 4.5, max: 5 }, null, 2),
  },
  {
    id: "progress",
    type: "progress",
    name: "Smooth Progress Bar",
    category: "feedback",
    tags: ["feedback", "progress", "meter", "bar", "status", "loading", "percentage"],
    description: "Progress meter with smooth width interpolation, gradient finish, and percentage readout.",
    schema: {
      value: { name: "value", type: "number", description: "Current value", default: 75 },
      max: { name: "max", type: "number", description: "Total value (100 for %)", default: 100 },
      label: { name: "label", type: "string", description: "Status label" },
      unit: { name: "unit", type: "string", description: "Unit suffix", default: "%" },
    },
    defaultProps: {
      label: "Training Convergence",
      value: 82,
      max: 100,
      unit: "%",
    },
    snippet: '<component type="progress" label="Training Convergence" value="82" max="100" unit="%" />',
    jsonSnippet: JSON.stringify({ type: "progress", label: "Training Convergence", value: 82, max: 100, unit: "%" }, null, 2),
  },

  /* ------------------------------------------------------------ CHARTS */
  {
    id: "chart",
    type: "chart",
    name: "Google-Style Chart Suite",
    category: "chart",
    tags: ["chart", "graph", "line", "area", "bar", "radar", "gauge", "funnel", "pie", "donut", "heatmap", "candlestick"],
    description: "Interactive data visualization engine featuring smooth Bézier splines, entrance sweep animations, focal dots, and crosshairs. Supports 11 distinct chart kinds.",
    schema: {
      kind: { name: "kind", type: "string", description: "Chart visualization type", default: "line", options: ["line", "area", "bar", "hbar", "donut", "pie", "radar", "gauge", "funnel", "heatmap", "candlestick"] },
      title: { name: "title", type: "string", description: "Chart header title" },
      data: { name: "data", type: "array", description: "Array of points: [{ label, value }]", required: true },
      unit: { name: "unit", type: "string", description: "Unit suffix for values" },
    },
    defaultProps: {
      kind: "area",
      title: "API Throughput (Requests / sec)",
      data: [
        { label: "00:00", value: 340 },
        { label: "04:00", value: 680 },
        { label: "08:00", value: 1450 },
        { label: "12:00", value: 2100 },
        { label: "16:00", value: 1890 },
        { label: "20:00", value: 1100 },
        { label: "23:59", value: 520 },
      ],
      unit: "rps",
    },
    snippet: '<component type="chart" kind="area" title="API Throughput" data=\'[{"label":"00:00","value":340},{"label":"08:00","value":1450},{"label":"12:00","value":2100}]\' />',
    jsonSnippet: JSON.stringify({
      type: "chart",
      kind: "area",
      title: "API Throughput",
      data: [
        { label: "00:00", value: 340 },
        { label: "04:00", value: 680 },
        { label: "08:00", value: 1450 },
        { label: "12:00", value: 2100 },
        { label: "16:00", value: 1890 },
        { label: "20:00", value: 1100 },
      ],
      unit: "rps",
    }, null, 2),
  },

  /* ------------------------------------------------------------ MATH & SCIENCE */
  {
    id: "math",
    type: "math",
    name: "2D Math & Desmos Plotter",
    category: "math-science",
    tags: ["math", "desmos", "plot", "equation", "function", "graph", "calculus", "algebra", "latex"],
    description: "Interactive 2D math function grapher supporting LaTeX formulas, implicit curves (e.g. x^2 + y^2 = 25), trigonometric superposition, crosshairs, pan, and zoom.",
    schema: {
      fn: { name: "fn", type: "string", description: "Primary function expression, e.g. 'sin(x)*cos(2*x)' or LaTeX '\\frac{\\sin(x)}{x}'" },
      title: { name: "title", type: "string", description: "Plot card title" },
      xmin: { name: "xmin", type: "number", description: "Minimum X axis boundary", default: -6 },
      xmax: { name: "xmax", type: "number", description: "Maximum X axis boundary", default: 6 },
      ymin: { name: "ymin", type: "number", description: "Minimum Y axis boundary", default: -2 },
      ymax: { name: "ymax", type: "number", description: "Maximum Y axis boundary", default: 2 },
      functions: { name: "functions", type: "array", description: "Multi-function array: [{ expr, label, color }]" },
      desmos: { name: "desmos", type: "string", description: "Optional external Desmos calculator URL or embed flag" },
    },
    defaultProps: {
      fn: "sin(x) * cos(2*x)",
      title: "Damped Harmonic Superposition",
      xmin: -6,
      xmax: 6,
      ymin: -2,
      ymax: 2,
    },
    snippet: '<component type="math" fn="sin(x) * cos(2*x)" title="Damped Harmonic Superposition" />',
    jsonSnippet: JSON.stringify({
      type: "math",
      title: "Damped Harmonic Superposition",
      fn: "sin(x) * cos(2*x)",
      xmin: -6,
      xmax: 6,
      ymin: -2,
      ymax: 2,
    }, null, 2),
  },
  {
    id: "chemistry",
    type: "chemistry",
    name: "2D SMILES Molecular Structure",
    category: "math-science",
    tags: ["chemistry", "smiles", "molecule", "structure", "formula", "science", "biology"],
    description: "Crisp 2D chemical structure renderer from SMILES or common molecule names (caffeine, aspirin, dopamine, serotonin, ibuprofen).",
    schema: {
      smiles: { name: "smiles", type: "string", description: "SMILES string or common molecule name", required: true },
      title: { name: "title", type: "string", description: "Molecule name" },
      caption: { name: "caption", type: "string", description: "Pharmacological or chemical description" },
    },
    defaultProps: {
      smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
      title: "Caffeine",
      caption: "1,3,7-Trimethylxanthine — Central Nervous System Stimulant",
    },
    snippet: '<component type="chemistry" smiles="CN1C=NC2=C1C(=O)N(C(=O)N2C)C" title="Caffeine" caption="Central Nervous System Stimulant" />',
    jsonSnippet: JSON.stringify({
      type: "chemistry",
      smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
      title: "Caffeine",
      caption: "1,3,7-Trimethylxanthine — Central Nervous System Stimulant",
    }, null, 2),
  },

  /* ------------------------------------------------------------ LAYOUT & DATA */
  {
    id: "switcher",
    type: "switcher",
    name: "Multi-View Segmented Switcher",
    category: "layout",
    tags: ["layout", "switcher", "tabs", "multi-view", "comparison", "dashboard"],
    description: "Seamless segmented tab switcher for toggling between 2-4 alternative charts, dashboards, or views without reflow.",
    schema: {
      tabs: { name: "tabs", type: "array", description: "Array of tabs: [{ label, content: <component-data> }]", required: true },
    },
    defaultProps: {
      tabs: [
        {
          label: "Throughput (RPS)",
          content: {
            type: "chart",
            kind: "area",
            title: "Peak Throughput Over Time",
            data: [{ label: "00:00", value: 300 }, { label: "06:00", value: 720 }, { label: "12:00", value: 1950 }, { label: "18:00", value: 1640 }],
          },
        },
        {
          label: "Latency (ms)",
          content: {
            type: "chart",
            kind: "line",
            title: "P99 Latency (ms)",
            data: [{ label: "00:00", value: 38 }, { label: "06:00", value: 42 }, { label: "12:00", value: 68 }, { label: "18:00", value: 51 }],
          },
        },
      ],
    },
    snippet: '<component type="switcher" tabs=\'[{"label":"Throughput","content":{"type":"chart","kind":"area","data":[{"label":"00:00","value":300},{"label":"12:00","value":1950}]}}]\' />',
    jsonSnippet: JSON.stringify({
      type: "switcher",
      tabs: [
        {
          label: "Throughput",
          content: {
            type: "chart",
            kind: "area",
            title: "Peak Throughput",
            data: [{ label: "00:00", value: 300 }, { label: "12:00", value: 1950 }],
          },
        },
        {
          label: "Latency",
          content: {
            type: "chart",
            kind: "line",
            title: "P99 Latency",
            data: [{ label: "00:00", value: 38 }, { label: "12:00", value: 68 }],
          },
        },
      ],
    }, null, 2),
  },
  {
    id: "metrics",
    type: "metrics",
    name: "Executive KPI Metrics Grid",
    category: "data",
    tags: ["data", "metrics", "stats", "kpi", "cards", "dashboard"],
    description: "High-density KPI metric badges with tabular value formatting, uppercase keys, and positive/negative delta change badges.",
    schema: {
      items: { name: "items", type: "array", description: "Array of KPI metrics: [{ label, value, delta }]", required: true },
    },
    defaultProps: {
      items: [
        { label: "Active Nodes", value: "24", delta: "+2" },
        { label: "Avg Latency", value: "34ms", delta: "-3.2ms" },
        { label: "Peak RPS", value: "54.2k", delta: "+18%" },
        { label: "Uptime", value: "99.99%" },
      ],
    },
    snippet: '<component type="metrics" items=\'[{"label":"ACTIVE NODES","value":"24"},{"label":"AVG LATENCY","value":"34ms","delta":"-3.2ms"}]\' />',
    jsonSnippet: JSON.stringify({
      type: "metrics",
      items: [
        { label: "ACTIVE NODES", value: "24", delta: "+2" },
        { label: "AVG LATENCY", value: "34ms", delta: "-3.2ms" },
        { label: "PEAK RPS", value: "54.2k", delta: "+18%" },
        { label: "UPTIME", value: "99.99%" },
      ],
    }, null, 2),
  },
  {
    id: "question",
    type: "question",
    name: "Interactive Question Card",
    category: "interactive",
    tags: ["interactive", "question", "form", "survey", "choice", "input", "poll"],
    description: "Decision card presenting options with descriptions, optional custom text response, and skip button.",
    schema: {
      id: { name: "id", type: "string", description: "Unique question key", required: true },
      question: { name: "question", type: "string", description: "Question prompt text", required: true },
      options: { name: "options", type: "array", description: "Options: [{ id, label, description }]", required: true },
      allowCustom: { name: "allowCustom", type: "boolean", description: "Allows custom freeform answer input", default: true },
      skipButton: { name: "skipButton", type: "boolean", description: "Shows skip button", default: true },
    },
    defaultProps: {
      id: "strategy_decision",
      question: "Which deployment strategy should we apply?",
      options: [
        { id: "canary", label: "Canary Rollout (10%)", description: "Gradual release with telemetry monitoring" },
        { id: "blue-green", label: "Blue-Green Switch", description: "Instant zero-downtime cutover to isolated standby" },
      ],
      allowCustom: true,
      skipButton: true,
    },
    snippet: '<component type="question" id="strategy_decision" question="Which deployment strategy?" options=\'[{"id":"canary","label":"Canary (10%)"},{"id":"blue-green","label":"Blue-Green"}]\' allowCustom="true" skipButton="true" />',
    jsonSnippet: JSON.stringify({
      type: "question",
      id: "strategy_decision",
      question: "Which deployment strategy should we apply?",
      options: [
        { id: "canary", label: "Canary Rollout (10%)", description: "Gradual release with telemetry monitoring" },
        { id: "blue-green", label: "Blue-Green Switch", description: "Instant zero-downtime cutover" },
      ],
      allowCustom: true,
      skipButton: true,
    }, null, 2),
  },
];

/**
 * Search the UI Component Library using keywords, types, categories, or tags.
 */
export function searchComponents(
  query = "",
  options?: { category?: string; tag?: string; limit?: number }
): UIComponentDef[] {
  const q = (query || "").toLowerCase().trim();
  const cat = (options?.category || "").toLowerCase().trim();
  const tag = (options?.tag || "").toLowerCase().trim();
  const limit = options?.limit ?? 20;

  return COMPONENT_CATALOG.filter((comp) => {
    if (cat && comp.category.toLowerCase() !== cat) return false;
    if (tag && !comp.tags.some((t) => t.toLowerCase() === tag)) return false;
    if (!q) return true;

    return (
      comp.id.toLowerCase().includes(q) ||
      comp.type.toLowerCase().includes(q) ||
      comp.name.toLowerCase().includes(q) ||
      comp.description.toLowerCase().includes(q) ||
      comp.tags.some((t) => t.toLowerCase().includes(q))
    );
  }).slice(0, limit);
}

/**
 * Retrieve a specific component definition by ID or type.
 */
export function getComponentDef(idOrType: string): UIComponentDef | undefined {
  const norm = (idOrType || "").toLowerCase().trim();
  return COMPONENT_CATALOG.find((c) => c.id.toLowerCase() === norm || c.type.toLowerCase() === norm);
}

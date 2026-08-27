/**
 * UI Component Library & Marketplace
 * Unified registry of 90+ interactive components, charts, visualizers, slides, and data blocks.
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
  category: "interactive" | "chart" | "visualizer" | "data" | "slides" | "layout";
  tags: string[];
  description: string;
  schema: Record<string, UIComponentProp>;
  defaultProps: Record<string, any>;
  snippet: string;
  jsonSnippet: string;
}

export const COMPONENT_CATALOG: UIComponentDef[] = [
  /* =========================================================================
     1. INTERACTIVE (Inputs, Sliders, Buttons, Selectors, Questions, Polls)
     ========================================================================= */
  {
    id: "slider",
    type: "slider",
    name: "Precision Expansion Slider",
    category: "interactive",
    tags: ["slider", "precision", "volume", "range", "input", "control", "audio", "fluid"],
    description: "Minimal hairline slider that smoothly thickens on press or drag for high-precision tactile adjustment.",
    schema: {
      value: { name: "value", type: "number", description: "Initial value", default: 65 },
      min: { name: "min", type: "number", description: "Minimum limit", default: 0 },
      max: { name: "max", type: "number", description: "Maximum limit", default: 100 },
      step: { name: "step", type: "number", description: "Step increment", default: 1 },
      unit: { name: "unit", type: "string", description: "Unit suffix (e.g. %, dB, ms)", default: "%" },
      label: { name: "label", type: "string", description: "Slider title", default: "Level" },
    },
    defaultProps: { value: 70, min: 0, max: 100, step: 1, unit: "%", label: "Master Level" },
    snippet: '<component type="slider" label="Master Level" value="70" min="0" max="100" unit="%" />',
    jsonSnippet: JSON.stringify({ type: "slider", label: "Master Level", value: 70, min: 0, max: 100, unit: "%" }, null, 2),
  },
  {
    id: "range-slider",
    type: "range-slider",
    name: "Dual-Handle Range Slider",
    category: "interactive",
    tags: ["range", "slider", "min-max", "filter", "boundary"],
    description: "Dual-thumb slider for setting lower and upper boundaries.",
    schema: {
      min: { name: "min", type: "number", description: "Lower range bound", default: 0 },
      max: { name: "max", type: "number", description: "Upper range bound", default: 100 },
      low: { name: "low", type: "number", description: "Selected lower value", default: 20 },
      high: { name: "high", type: "number", description: "Selected upper value", default: 80 },
      label: { name: "label", type: "string", description: "Field label", default: "Latency Window" },
    },
    defaultProps: { min: 0, max: 1000, low: 150, high: 600, unit: "ms", label: "Latency Filter Window" },
    snippet: '<component type="range-slider" label="Latency Filter Window" min="0" max="1000" low="150" high="600" unit="ms" />',
    jsonSnippet: JSON.stringify({ type: "range-slider", label: "Latency Filter Window", min: 0, max: 1000, low: 150, high: 600, unit: "ms" }, null, 2),
  },
  {
    id: "button",
    type: "button",
    name: "Interactive Action Button",
    category: "interactive",
    tags: ["button", "action", "cta", "click", "input", "press"],
    description: "Button with spring press feedback, style variants, and animated loading state.",
    schema: {
      label: { name: "label", type: "string", description: "Button text", default: "Execute", required: true },
      variant: { name: "variant", type: "string", description: "Style variant", default: "primary", options: ["primary", "secondary", "outline", "danger", "pill"] },
      size: { name: "size", type: "string", description: "Button size", default: "md", options: ["sm", "md", "lg"] },
    },
    defaultProps: { label: "Execute Workflow", variant: "primary", size: "md" },
    snippet: '<component type="button" label="Execute Workflow" variant="primary" size="md" />',
    jsonSnippet: JSON.stringify({ type: "button", label: "Execute Workflow", variant: "primary", size: "md" }, null, 2),
  },
  {
    id: "button-group",
    type: "button-group",
    name: "Segmented Action Group",
    category: "interactive",
    tags: ["buttons", "group", "toolbar", "actions"],
    description: "Horizontally connected action buttons for toolbars and workflows.",
    schema: {
      items: { name: "items", type: "array", description: "Array of button items: [{ id, label, icon }]" },
    },
    defaultProps: { items: [{ id: "copy", label: "Copy" }, { id: "share", label: "Share" }, { id: "export", label: "Export" }] },
    snippet: '<component type="button-group" items=\'[{"id":"copy","label":"Copy"},{"id":"export","label":"Export"}]\' />',
    jsonSnippet: JSON.stringify({ type: "button-group", items: [{ id: "copy", label: "Copy" }, { id: "export", label: "Export" }] }, null, 2),
  },
  {
    id: "checkbox",
    type: "checkbox",
    name: "Animated Stroke Checkbox",
    category: "interactive",
    tags: ["checkbox", "toggle", "check", "boolean", "choice"],
    description: "Animated checkbox with SVG stroke path drawing and subtle spring bounce.",
    schema: {
      label: { name: "label", type: "string", description: "Checkbox title", required: true },
      description: { name: "description", type: "string", description: "Sub-label text" },
      checked: { name: "checked", type: "boolean", description: "Checked state", default: false },
    },
    defaultProps: { label: "Stream real-time telemetry", description: "Sample metrics every 250ms with zero latency", checked: true },
    snippet: '<component type="checkbox" label="Stream real-time telemetry" description="Sample metrics every 250ms" checked="true" />',
    jsonSnippet: JSON.stringify({ type: "checkbox", label: "Stream real-time telemetry", description: "Sample metrics every 250ms", checked: true }, null, 2),
  },
  {
    id: "radio",
    type: "radio",
    name: "Radio Selection Group",
    category: "interactive",
    tags: ["radio", "selection", "options", "choice"],
    description: "Radio selection cards with spring-animated center dot indicator.",
    schema: {
      value: { name: "value", type: "string", description: "Selected option id" },
      options: { name: "options", type: "array", description: "Options: [{ id, label, description }]" },
    },
    defaultProps: {
      value: "balanced",
      options: [
        { id: "fast", label: "Low Latency", description: "< 40ms edge inference" },
        { id: "balanced", label: "Balanced Throughput", description: "Recommended for production workloads" },
        { id: "accurate", label: "High Precision", description: "Full chain-of-thought verification" },
      ],
    },
    snippet: '<component type="radio" value="balanced" options=\'[{"id":"fast","label":"Low Latency"},{"id":"balanced","label":"Balanced"}]\' />',
    jsonSnippet: JSON.stringify({ type: "radio", value: "balanced", options: [{ id: "fast", label: "Low Latency" }, { id: "balanced", label: "Balanced" }] }, null, 2),
  },
  {
    id: "switch",
    type: "switch",
    name: "Precision Toggle Switch",
    category: "interactive",
    tags: ["switch", "toggle", "boolean", "state"],
    description: "Sliding toggle switch with smooth track color morphing.",
    schema: {
      label: { name: "label", type: "string", description: "Switch label", required: true },
      description: { name: "description", type: "string", description: "Subtitle description" },
      checked: { name: "checked", type: "boolean", description: "Toggle state", default: false },
    },
    defaultProps: { label: "Autonomous Model Routing", description: "Route requests dynamically across fastest available models", checked: true },
    snippet: '<component type="switch" label="Autonomous Model Routing" checked="true" />',
    jsonSnippet: JSON.stringify({ type: "switch", label: "Autonomous Model Routing", checked: true }, null, 2),
  },
  {
    id: "dropdown",
    type: "dropdown",
    name: "Searchable Dropdown Select",
    category: "interactive",
    tags: ["dropdown", "select", "combobox", "menu", "picker"],
    description: "Dropdown selector with fold-out animation and live search filtering.",
    schema: {
      label: { name: "label", type: "string", description: "Label text" },
      value: { name: "value", type: "string", description: "Selected value" },
      options: { name: "options", type: "array", description: "Options: [{ label, value }]" },
    },
    defaultProps: {
      label: "Deployment Region",
      value: "us-east",
      options: [
        { label: "US East (N. Virginia)", value: "us-east" },
        { label: "EU Central (Frankfurt)", value: "eu-central" },
        { label: "Asia Pacific (Tokyo)", value: "ap-tokyo" },
      ],
    },
    snippet: '<component type="dropdown" label="Deployment Region" value="us-east" options=\'[{"label":"US East","value":"us-east"}]\' />',
    jsonSnippet: JSON.stringify({ type: "dropdown", label: "Deployment Region", value: "us-east", options: [{ label: "US East", value: "us-east" }] }, null, 2),
  },
  {
    id: "input",
    type: "input",
    name: "Text Input Field",
    category: "interactive",
    tags: ["input", "text", "field", "form", "search"],
    description: "Text field with animated focus ring and clear button.",
    schema: {
      label: { name: "label", type: "string", description: "Input label" },
      placeholder: { name: "placeholder", type: "string", description: "Placeholder hint" },
      value: { name: "value", type: "string", description: "Current text" },
    },
    defaultProps: { label: "API Endpoint", placeholder: "https://api.datacenter.net", value: "https://api.datacenter.net/metrics" },
    snippet: '<component type="input" label="API Endpoint" value="https://api.datacenter.net/metrics" />',
    jsonSnippet: JSON.stringify({ type: "input", label: "API Endpoint", value: "https://api.datacenter.net/metrics" }, null, 2),
  },
  {
    id: "textarea",
    type: "textarea",
    name: "Multiline Auto-Expand Textarea",
    category: "interactive",
    tags: ["textarea", "multiline", "prompt", "notes", "input"],
    description: "Multiline text entry that expands with content.",
    schema: {
      label: { name: "label", type: "string", description: "Label" },
      value: { name: "value", type: "string", description: "Content text" },
      rows: { name: "rows", type: "number", description: "Base rows", default: 3 },
    },
    defaultProps: { label: "System Directive", value: "Act as a senior data systems architect.", rows: 3 },
    snippet: '<component type="textarea" label="System Directive" value="Directive text..." />',
    jsonSnippet: JSON.stringify({ type: "textarea", label: "System Directive", value: "Directive text..." }, null, 2),
  },
  {
    id: "stepper",
    type: "stepper",
    name: "Numeric Stepper",
    category: "interactive",
    tags: ["stepper", "number", "counter", "increment"],
    description: "Increment/decrement counter with boundary limits.",
    schema: {
      label: { name: "label", type: "string", description: "Field label" },
      value: { name: "value", type: "number", description: "Current count", default: 1 },
      min: { name: "min", type: "number", description: "Minimum", default: 1 },
      max: { name: "max", type: "number", description: "Maximum", default: 100 },
      unit: { name: "unit", type: "string", description: "Unit suffix" },
    },
    defaultProps: { label: "Compute Replicas", value: 4, min: 1, max: 16, unit: "nodes" },
    snippet: '<component type="stepper" label="Compute Replicas" value="4" min="1" max="16" unit="nodes" />',
    jsonSnippet: JSON.stringify({ type: "stepper", label: "Compute Replicas", value: 4, min: 1, max: 16, unit: "nodes" }, null, 2),
  },
  {
    id: "rating",
    type: "rating",
    name: "Interactive Star Rating",
    category: "interactive",
    tags: ["rating", "stars", "feedback", "score"],
    description: "Interactive rating widget with hover preview and spring bounce.",
    schema: {
      value: { name: "value", type: "number", description: "Rating score", default: 5 },
      max: { name: "max", type: "number", description: "Max stars", default: 5 },
      label: { name: "label", type: "string", description: "Rating label" },
    },
    defaultProps: { label: "Model Quality Score", value: 4.5, max: 5 },
    snippet: '<component type="rating" label="Model Quality Score" value="4.5" max="5" />',
    jsonSnippet: JSON.stringify({ type: "rating", label: "Model Quality Score", value: 4.5, max: 5 }, null, 2),
  },
  {
    id: "color-picker",
    type: "color-picker",
    name: "Palette Color Swatch Selector",
    category: "interactive",
    tags: ["color", "swatch", "palette", "picker", "theme"],
    description: "Interactive color swatch picker with hex feedback.",
    schema: {
      value: { name: "value", type: "string", description: "Selected hex color", default: "#3b82f6" },
      colors: { name: "colors", type: "array", description: "Palette colors array" },
    },
    defaultProps: { value: "#d7b28c", colors: ["#d7b28c", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"] },
    snippet: '<component type="color-picker" value="#d7b28c" colors=\'["#d7b28c","#3b82f6","#10b981"]\' />',
    jsonSnippet: JSON.stringify({ type: "color-picker", value: "#d7b28c", colors: ["#d7b28c", "#3b82f6", "#10b981"] }, null, 2),
  },
  {
    id: "date-picker",
    type: "date-picker",
    name: "Calendar Date Selector",
    category: "interactive",
    tags: ["date", "calendar", "time", "schedule"],
    description: "Minimalist date selector with quick preset chips.",
    schema: {
      label: { name: "label", type: "string", description: "Date label" },
      value: { name: "value", type: "string", description: "Date string (YYYY-MM-DD)" },
    },
    defaultProps: { label: "Deployment Date", value: "2026-08-28" },
    snippet: '<component type="date-picker" label="Deployment Date" value="2026-08-28" />',
    jsonSnippet: JSON.stringify({ type: "date-picker", label: "Deployment Date", value: "2026-08-28" }, null, 2),
  },
  {
    id: "time-picker",
    type: "time-picker",
    name: "Time Slot Selector",
    category: "interactive",
    tags: ["time", "clock", "schedule", "hour"],
    description: "Time selector for scheduling tasks and benchmarks.",
    schema: {
      label: { name: "label", type: "string", description: "Label" },
      value: { name: "value", type: "string", description: "Time string (HH:MM)" },
    },
    defaultProps: { label: "Maintenance Window", value: "02:00 UTC" },
    snippet: '<component type="time-picker" label="Maintenance Window" value="02:00 UTC" />',
    jsonSnippet: JSON.stringify({ type: "time-picker", label: "Maintenance Window", value: "02:00 UTC" }, null, 2),
  },
  {
    id: "tags-input",
    type: "tags-input",
    name: "Tokenized Tag Editor",
    category: "interactive",
    tags: ["tags", "tokens", "chips", "input"],
    description: "Interactive tag editor for adding and removing keyword tags.",
    schema: {
      label: { name: "label", type: "string", description: "Field label" },
      tags: { name: "tags", type: "array", description: "Array of string tags" },
    },
    defaultProps: { label: "Project Tags", tags: ["production", "v2", "latency-optimized"] },
    snippet: '<component type="tags-input" label="Project Tags" tags=\'["production","v2"]\' />',
    jsonSnippet: JSON.stringify({ type: "tags-input", label: "Project Tags", tags: ["production", "v2"] }, null, 2),
  },
  {
    id: "file-upload",
    type: "file-upload",
    name: "Dropzone File Target",
    category: "interactive",
    tags: ["upload", "file", "dropzone", "import"],
    description: "Minimalist file drag-and-drop target zone.",
    schema: {
      label: { name: "label", type: "string", description: "Upload header" },
      accept: { name: "accept", type: "string", description: "Accepted extensions" },
    },
    defaultProps: { label: "Drop CSV or Excel dataset to analyze", accept: ".csv, .xlsx, .json" },
    snippet: '<component type="file-upload" label="Drop CSV to analyze" />',
    jsonSnippet: JSON.stringify({ type: "file-upload", label: "Drop CSV to analyze" }, null, 2),
  },
  {
    id: "search-bar",
    type: "search-bar",
    name: "Interactive Search Bar",
    category: "interactive",
    tags: ["search", "query", "filter", "find"],
    description: "Search input with magnifying icon and escape-to-clear.",
    schema: {
      placeholder: { name: "placeholder", type: "string", description: "Placeholder text" },
      value: { name: "value", type: "string", description: "Current search string" },
    },
    defaultProps: { placeholder: "Search logs and telemetry...", value: "" },
    snippet: '<component type="search-bar" placeholder="Search logs and telemetry..." />',
    jsonSnippet: JSON.stringify({ type: "search-bar", placeholder: "Search logs..." }, null, 2),
  },
  {
    id: "segmented-control",
    type: "segmented-control",
    name: "Sliding Segmented Control",
    category: "interactive",
    tags: ["segmented", "pills", "tabs", "selector", "switch"],
    description: "Segmented button bar with active background pill transition.",
    schema: {
      options: { name: "options", type: "array", description: "Array of options [{ id, label }]" },
      value: { name: "value", type: "string", description: "Selected option id" },
    },
    defaultProps: { value: "day", options: [{ id: "hour", label: "1H" }, { id: "day", label: "24H" }, { id: "week", label: "7D" }, { id: "month", label: "30D" }] },
    snippet: '<component type="segmented-control" value="day" options=\'[{"id":"hour","label":"1H"},{"id":"day","label":"24H"}]\' />',
    jsonSnippet: JSON.stringify({ type: "segmented-control", value: "day", options: [{ id: "hour", label: "1H" }, { id: "day", label: "24H" }] }, null, 2),
  },
  {
    id: "progress",
    type: "progress",
    name: "Linear Progress Meter",
    category: "interactive",
    tags: ["progress", "meter", "bar", "status", "percentage"],
    description: "Linear progress bar with animated width interpolation.",
    schema: {
      value: { name: "value", type: "number", description: "Value", default: 50 },
      max: { name: "max", type: "number", description: "Total", default: 100 },
      label: { name: "label", type: "string", description: "Status label" },
    },
    defaultProps: { label: "Task Execution", value: 78, max: 100, unit: "%" },
    snippet: '<component type="progress" label="Task Execution" value="78" max="100" />',
    jsonSnippet: JSON.stringify({ type: "progress", label: "Task Execution", value: 78, max: 100 }, null, 2),
  },
  {
    id: "circular-progress",
    type: "circular-progress",
    name: "Radial Circular Meter",
    category: "interactive",
    tags: ["circle", "progress", "meter", "radial"],
    description: "Circular SVG stroke meter with center value readout.",
    schema: {
      value: { name: "value", type: "number", description: "Percentage value", default: 65 },
      label: { name: "label", type: "string", description: "Meter label" },
    },
    defaultProps: { value: 84, label: "GPU Memory Used", unit: "%" },
    snippet: '<component type="circular-progress" label="GPU Memory" value="84" />',
    jsonSnippet: JSON.stringify({ type: "circular-progress", label: "GPU Memory", value: 84 }, null, 2),
  },
  {
    id: "question",
    type: "question",
    name: "Interactive Decision Card",
    category: "interactive",
    tags: ["question", "decision", "survey", "choice", "input"],
    description: "Decision prompt with option cards, skip button, and custom text response.",
    schema: {
      question: { name: "question", type: "string", description: "Question text", required: true },
      options: { name: "options", type: "array", description: "Options: [{ id, label, description }]" },
      allowCustom: { name: "allowCustom", type: "boolean", description: "Allow custom text entry", default: true },
    },
    defaultProps: {
      id: "q1",
      question: "Which deployment strategy should we apply?",
      options: [
        { id: "canary", label: "Canary Rollout (10%)", description: "Gradual release with telemetry monitoring" },
        { id: "blue-green", label: "Blue-Green Cutover", description: "Instant zero-downtime switch" },
      ],
      allowCustom: true,
      skipButton: true,
    },
    snippet: '<component type="question" question="Which deployment strategy?" options=\'[{"id":"canary","label":"Canary"}]\' />',
    jsonSnippet: JSON.stringify({ type: "question", question: "Which deployment strategy?", options: [{ id: "canary", label: "Canary" }] }, null, 2),
  },
  {
    id: "poll",
    type: "poll",
    name: "Interactive Community Poll",
    category: "interactive",
    tags: ["poll", "vote", "survey", "percentages"],
    description: "Live voting poll card with real-time percentage distribution bars.",
    schema: {
      title: { name: "title", type: "string", description: "Poll question" },
      options: { name: "options", type: "array", description: "Options: [{ label, votes }]" },
    },
    defaultProps: {
      title: "Preferred API protocol for microservices?",
      options: [
        { label: "gRPC / Protobuf", votes: 420 },
        { label: "REST / JSON-HTTP", votes: 290 },
        { label: "GraphQL Federation", votes: 140 },
      ],
    },
    snippet: '<component type="poll" title="Preferred API protocol?" options=\'[{"label":"gRPC","votes":420},{"label":"REST","votes":290}]\' />',
    jsonSnippet: JSON.stringify({ type: "poll", title: "Preferred API protocol?", options: [{ label: "gRPC", votes: 420 }, { label: "REST", votes: 290 }] }, null, 2),
  },
  {
    id: "quiz",
    type: "quiz",
    name: "Knowledge Quiz Card",
    category: "interactive",
    tags: ["quiz", "test", "multiple-choice", "education"],
    description: "Interactive multiple-choice quiz card with instant feedback and explanation.",
    schema: {
      question: { name: "question", type: "string", description: "Question" },
      options: { name: "options", type: "array", description: "Options array" },
      correctIndex: { name: "correctIndex", type: "number", description: "0-based index of correct option" },
    },
    defaultProps: {
      question: "What is the time complexity of lookup in a balanced red-black tree?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correctIndex: 1,
      explanation: "Balanced binary search trees guarantee O(log n) worst-case height.",
    },
    snippet: '<component type="quiz" question="Lookup in a balanced BST?" options=\'["O(1)","O(log n)"]\' correctIndex="1" />',
    jsonSnippet: JSON.stringify({ type: "quiz", question: "Lookup in a balanced BST?", options: ["O(1)", "O(log n)"], correctIndex: 1 }, null, 2),
  },
  {
    id: "pin-code",
    type: "pin-code",
    name: "PIN & Passcode Input",
    category: "interactive",
    tags: ["pin", "otp", "security", "passcode", "auth"],
    description: "Segmented 4-to-6 cell PIN input with auto-advance.",
    schema: {
      length: { name: "length", type: "number", description: "Number of cells", default: 4 },
      label: { name: "label", type: "string", description: "Header" },
    },
    defaultProps: { length: 4, label: "Enter 4-Digit Cluster Access PIN" },
    snippet: '<component type="pin-code" length="4" label="Access PIN" />',
    jsonSnippet: JSON.stringify({ type: "pin-code", length: 4, label: "Access PIN" }, null, 2),
  },

  /* =========================================================================
     2. CHARTS & GRAPHS (20 Components)
     ========================================================================= */
  {
    id: "chart-line",
    type: "chart",
    name: "Bézier Spline Line Chart",
    category: "chart",
    tags: ["chart", "line", "spline", "timeseries", "trend"],
    description: "Smooth Bézier curves with tracking vertical crosshair, steady focal point, and tooltip.",
    schema: {
      title: { name: "title", type: "string", description: "Chart title" },
      data: { name: "data", type: "array", description: "Points [{ label, value }]" },
      unit: { name: "unit", type: "string", description: "Unit label" },
    },
    defaultProps: { kind: "line", title: "Latency Trend (ms)", data: [{ label: "00:00", value: 34 }, { label: "06:00", value: 42 }, { label: "12:00", value: 85 }, { label: "18:00", value: 50 }], unit: "ms" },
    snippet: '<component type="chart" kind="line" title="Latency Trend" data=\'[{"label":"00:00","value":34},{"label":"12:00","value":85}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "line", title: "Latency Trend", data: [{ label: "00:00", value: 34 }, { label: "12:00", value: 85 }] }, null, 2),
  },
  {
    id: "chart-area",
    type: "chart",
    name: "Gradient Area Chart",
    category: "chart",
    tags: ["chart", "area", "gradient", "throughput", "volume"],
    description: "Gradient-filled area chart with smooth entrance sweep animation.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      data: { name: "data", type: "array", description: "Points [{ label, value }]" },
    },
    defaultProps: { kind: "area", title: "Request Throughput", data: [{ label: "00:00", value: 200 }, { label: "08:00", value: 1100 }, { label: "16:00", value: 1850 }, { label: "22:00", value: 650 }], unit: "rps" },
    snippet: '<component type="chart" kind="area" title="Request Throughput" data=\'[{"label":"00:00","value":200},{"label":"16:00","value":1850}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "area", title: "Request Throughput", data: [{ label: "00:00", value: 200 }, { label: "16:00", value: 1850 }] }, null, 2),
  },
  {
    id: "chart-bar",
    type: "chart",
    name: "Vertical Column Bar Chart",
    category: "chart",
    tags: ["chart", "bar", "column", "comparison"],
    description: "Vertical bar chart with staggered entrance animations and value badges.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      data: { name: "data", type: "array", description: "Points [{ label, value }]" },
    },
    defaultProps: { kind: "bar", title: "Throughput by Service", data: [{ label: "Auth", value: 450 }, { label: "Ingest", value: 1250 }, { label: "Search", value: 890 }, { label: "Billing", value: 310 }] },
    snippet: '<component type="chart" kind="bar" title="Throughput by Service" data=\'[{"label":"Auth","value":450},{"label":"Ingest","value":1250}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "bar", title: "Throughput by Service", data: [{ label: "Auth", value: 450 }, { label: "Ingest", value: 1250 }] }, null, 2),
  },
  {
    id: "chart-hbar",
    type: "chart",
    name: "Horizontal Bar Chart",
    category: "chart",
    tags: ["chart", "hbar", "ranking", "horizontal"],
    description: "Horizontal bar comparison with smooth left-to-right wipe animations.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      data: { name: "data", type: "array", description: "Points [{ label, value }]" },
    },
    defaultProps: { kind: "hbar", title: "Database Query Duration", data: [{ label: "UserLookup", value: 12 }, { label: "FeedQuery", value: 38 }, { label: "AggregateMetrics", value: 92 }, { label: "BatchSync", value: 145 }], unit: "ms" },
    snippet: '<component type="chart" kind="hbar" title="Query Duration" data=\'[{"label":"Lookup","value":12},{"label":"Sync","value":145}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "hbar", title: "Query Duration", data: [{ label: "Lookup", value: 12 }, { label: "Sync", value: 145 }] }, null, 2),
  },
  {
    id: "chart-donut",
    type: "chart",
    name: "Radial Donut Ring Chart",
    category: "chart",
    tags: ["chart", "donut", "ring", "proportion", "slices"],
    description: "Radial donut ring chart with center total summary and segment hover.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      data: { name: "data", type: "array", description: "Slices [{ label, value }]" },
    },
    defaultProps: { kind: "donut", title: "Traffic Distribution", data: [{ label: "Direct", value: 45 }, { label: "Search", value: 30 }, { label: "Referral", value: 15 }, { label: "API", value: 10 }] },
    snippet: '<component type="chart" kind="donut" title="Traffic Distribution" data=\'[{"label":"Direct","value":45},{"label":"Search","value":30}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "donut", title: "Traffic Distribution", data: [{ label: "Direct", value: 45 }, { label: "Search", value: 30 }] }, null, 2),
  },
  {
    id: "chart-pie",
    type: "chart",
    name: "Proportional Circular Pie Chart",
    category: "chart",
    tags: ["chart", "pie", "share", "proportion"],
    description: "Circular pie chart with clean proportional arcs.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      data: { name: "data", type: "array", description: "Slices [{ label, value }]" },
    },
    defaultProps: { kind: "pie", title: "Resource Allocation", data: [{ label: "Compute", value: 55 }, { label: "Storage", value: 25 }, { label: "Networking", value: 20 }] },
    snippet: '<component type="chart" kind="pie" title="Resource Allocation" data=\'[{"label":"Compute","value":55},{"label":"Storage","value":25}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "pie", title: "Resource Allocation", data: [{ label: "Compute", value: 55 }, { label: "Storage", value: 25 }] }, null, 2),
  },
  {
    id: "chart-radar",
    type: "chart",
    name: "Multi-Axis Radar Spider Chart",
    category: "chart",
    tags: ["chart", "radar", "spider", "benchmark", "dimensions"],
    description: "Multi-dimensional polygon evaluating 3+ comparative axes.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      data: { name: "data", type: "array", description: "Axes [{ label, value }]" },
    },
    defaultProps: { kind: "radar", title: "System Architecture Rating", data: [{ label: "Speed", value: 92 }, { label: "Resilience", value: 85 }, { label: "Cost", value: 78 }, { label: "Security", value: 95 }, { label: "Scale", value: 88 }] },
    snippet: '<component type="chart" kind="radar" title="System Rating" data=\'[{"label":"Speed","value":92},{"label":"Cost","value":78}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "radar", title: "System Rating", data: [{ label: "Speed", value: 92 }, { label: "Cost", value: 78 }] }, null, 2),
  },
  {
    id: "chart-gauge",
    type: "chart",
    name: "Radial Speedometer Gauge",
    category: "chart",
    tags: ["chart", "gauge", "meter", "speedometer", "cpu"],
    description: "Radial dial showing current metric within min and max thresholds.",
    schema: {
      title: { name: "title", type: "string", description: "Gauge title" },
      value: { name: "value", type: "number", description: "Current value" },
    },
    defaultProps: { kind: "gauge", title: "Cluster CPU Load", value: 72, min: 0, max: 100, unit: "%" },
    snippet: '<component type="chart" kind="gauge" title="Cluster CPU Load" value="72" unit="%" />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "gauge", title: "Cluster CPU Load", value: 72, unit: "%" }, null, 2),
  },
  {
    id: "chart-funnel",
    type: "chart",
    name: "Conversion Funnel Chart",
    category: "chart",
    tags: ["chart", "funnel", "conversion", "dropoff"],
    description: "Conversion pipeline showing stage dropoffs with smooth left-aligned entrance wipes.",
    schema: {
      title: { name: "title", type: "string", description: "Funnel title" },
      data: { name: "data", type: "array", description: "Stages [{ label, value }]" },
    },
    defaultProps: { kind: "funnel", title: "User Onboarding Funnel", data: [{ label: "Visitors", value: 12000 }, { label: "Signups", value: 4500 }, { label: "Active Project", value: 2100 }, { label: "Pro Paid", value: 720 }] },
    snippet: '<component type="chart" kind="funnel" title="Onboarding Funnel" data=\'[{"label":"Visitors","value":12000},{"label":"Signups","value":4500}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "funnel", title: "Onboarding Funnel", data: [{ label: "Visitors", value: 12000 }, { label: "Signups", value: 4500 }] }, null, 2),
  },
  {
    id: "chart-heatmap",
    type: "chart",
    name: "2D Intensity Grid Heatmap",
    category: "chart",
    tags: ["chart", "heatmap", "density", "matrix"],
    description: "2D color intensity matrix visualizing hourly and daily densities.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      data: { name: "data", type: "array", description: "Matrix rows" },
    },
    defaultProps: { kind: "heatmap", title: "Traffic Density Matrix", data: [{ label: "Mon", value: 85 }, { label: "Tue", value: 92 }, { label: "Wed", value: 74 }, { label: "Thu", value: 88 }, { label: "Fri", value: 65 }] },
    snippet: '<component type="chart" kind="heatmap" title="Traffic Density" data=\'[{"label":"Mon","value":85},{"label":"Tue","value":92}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "heatmap", title: "Traffic Density", data: [{ label: "Mon", value: 85 }, { label: "Tue", value: 92 }] }, null, 2),
  },
  {
    id: "chart-candlestick",
    type: "chart",
    name: "Financial Candlestick OHLC",
    category: "chart",
    tags: ["chart", "candlestick", "ohlc", "financial", "trading", "stocks"],
    description: "Stock trading candlesticks with open, high, low, and close markers.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      data: { name: "data", type: "array", description: "Points [{ label, open, high, low, close }]" },
    },
    defaultProps: { kind: "candlestick", title: "Token Market Index", data: [{ label: "09:00", value: [142, 148, 140, 146] }, { label: "10:00", value: [146, 152, 144, 150] }, { label: "11:00", value: [150, 154, 147, 148] }] },
    snippet: '<component type="chart" kind="candlestick" title="Market Index" data=\'[{"label":"09:00","value":[142,148,140,146]}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "candlestick", title: "Market Index", data: [{ label: "09:00", value: [142, 148, 140, 146] }] }, null, 2),
  },
  {
    id: "chart-scatter",
    type: "chart",
    name: "2D Correlation Scatter Plot",
    category: "chart",
    tags: ["chart", "scatter", "correlation", "points", "data"],
    description: "2D scatter plot showing correlation and clusters.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      data: { name: "data", type: "array", description: "Points [{ x, y }]" },
    },
    defaultProps: { kind: "scatter", title: "Latency vs Concurrency", data: [{ label: "10 rps", value: 12 }, { label: "50 rps", value: 18 }, { label: "100 rps", value: 34 }, { label: "200 rps", value: 85 }] },
    snippet: '<component type="chart" kind="scatter" title="Latency vs Concurrency" data=\'[{"label":"10 rps","value":12}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "scatter", title: "Latency vs Concurrency", data: [{ label: "10 rps", value: 12 }] }, null, 2),
  },
  {
    id: "chart-bubble",
    type: "chart",
    name: "3-Variable Bubble Chart",
    category: "chart",
    tags: ["chart", "bubble", "multivariate", "size"],
    description: "Multivariate scatter plot with proportional bubble sizes.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      data: { name: "data", type: "array", description: "Points [{ x, y, r }]" },
    },
    defaultProps: { kind: "bubble", title: "Market Opportunity (Size = Revenue)", data: [{ label: "US", value: [40, 85, 30] }, { label: "EU", value: [65, 70, 24] }, { label: "APAC", value: [80, 92, 45] }] },
    snippet: '<component type="chart" kind="bubble" title="Market Opportunity" data=\'[{"label":"US","value":[40,85,30]}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "bubble", title: "Market Opportunity", data: [{ label: "US", value: [40, 85, 30] }] }, null, 2),
  },
  {
    id: "chart-waterfall",
    type: "chart",
    name: "Cumulative Waterfall Bridge",
    category: "chart",
    tags: ["chart", "waterfall", "variance", "budget"],
    description: "Sequential bar chart showing positive and negative step contributions.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      data: { name: "data", type: "array", description: "Steps [{ label, value }]" },
    },
    defaultProps: { kind: "bar", title: "Net Revenue Bridge ($K)", data: [{ label: "Starting", value: 120 }, { label: "New ARR", value: 45 }, { label: "Churn", value: -12 }, { label: "Expansion", value: 28 }, { label: "Ending", value: 181 }] },
    snippet: '<component type="chart" kind="bar" title="Revenue Bridge" data=\'[{"label":"Starting","value":120}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "bar", title: "Revenue Bridge", data: [{ label: "Starting", value: 120 }] }, null, 2),
  },
  {
    id: "chart-sparkline",
    type: "chart",
    name: "Inline Trend Sparkline",
    category: "chart",
    tags: ["chart", "sparkline", "mini", "inline", "trend"],
    description: "Compact word-sized mini line chart for data tables and metrics.",
    schema: {
      data: { name: "data", type: "array", description: "Numbers array" },
    },
    defaultProps: { kind: "line", title: "24h Sparkline", data: [{ label: "1", value: 12 }, { label: "2", value: 18 }, { label: "3", value: 14 }, { label: "4", value: 24 }, { label: "5", value: 32 }] },
    snippet: '<component type="chart" kind="line" title="24h Sparkline" data=\'[{"label":"1","value":12},{"label":"5","value":32}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "line", title: "24h Sparkline", data: [{ label: "1", value: 12 }, { label: "5", value: 32 }] }, null, 2),
  },
  {
    id: "chart-treemap",
    type: "chart",
    name: "Hierarchical Treemap",
    category: "chart",
    tags: ["chart", "treemap", "hierarchy", "nested", "storage"],
    description: "Nested rectangles displaying hierarchical proportions.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      data: { name: "data", type: "array", description: "Items [{ label, value }]" },
    },
    defaultProps: { kind: "bar", title: "Disk Space by Directory", data: [{ label: "node_modules", value: 420 }, { label: "src", value: 85 }, { label: "dist", value: 45 }, { label: "public", value: 22 }] },
    snippet: '<component type="chart" kind="bar" title="Disk Space" data=\'[{"label":"node_modules","value":420}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "bar", title: "Disk Space", data: [{ label: "node_modules", value: 420 }] }, null, 2),
  },
  {
    id: "chart-polar",
    type: "chart",
    name: "Polar Coordinate Chart",
    category: "chart",
    tags: ["chart", "polar", "radial", "angles"],
    description: "Radial chart plotting values across angular intervals.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      data: { name: "data", type: "array", description: "Points [{ label, value }]" },
    },
    defaultProps: { kind: "radar", title: "Wind Direction & Speed", data: [{ label: "N", value: 14 }, { label: "E", value: 28 }, { label: "S", value: 42 }, { label: "W", value: 18 }] },
    snippet: '<component type="chart" kind="radar" title="Wind Direction" data=\'[{"label":"N","value":14}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "radar", title: "Wind Direction", data: [{ label: "N", value: 14 }] }, null, 2),
  },
  {
    id: "chart-bullet",
    type: "chart",
    name: "Benchmark Bullet Chart",
    category: "chart",
    tags: ["chart", "bullet", "target", "benchmark", "kpi"],
    description: "Horizontal bar showing actual metric vs target benchmark threshold.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      value: { name: "value", type: "number", description: "Current value" },
      target: { name: "target", type: "number", description: "Benchmark target" },
    },
    defaultProps: { kind: "hbar", title: "Sprint Velocity (Target: 80)", data: [{ label: "Completed", value: 74 }, { label: "Target", value: 80 }] },
    snippet: '<component type="chart" kind="hbar" title="Sprint Velocity" data=\'[{"label":"Completed","value":74}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "hbar", title: "Sprint Velocity", data: [{ label: "Completed", value: 74 }] }, null, 2),
  },
  {
    id: "chart-grouped-bar",
    type: "chart",
    name: "Clustered Grouped Bar Chart",
    category: "chart",
    tags: ["chart", "grouped", "comparison", "series"],
    description: "Multi-series side-by-side grouped bar comparison.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      series: { name: "series", type: "array", description: "Series array" },
    },
    defaultProps: { kind: "bar", title: "Q1 vs Q2 Performance", data: [{ label: "Q1 Core", value: 420 }, { label: "Q2 Core", value: 580 }, { label: "Q1 Edge", value: 310 }, { label: "Q2 Edge", value: 490 }] },
    snippet: '<component type="chart" kind="bar" title="Performance" data=\'[{"label":"Q1","value":420}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "bar", title: "Performance", data: [{ label: "Q1", value: 420 }] }, null, 2),
  },
  {
    id: "chart-stacked-bar",
    type: "chart",
    name: "Stacked Proportion Bar",
    category: "chart",
    tags: ["chart", "stacked", "composition", "bar"],
    description: "Stacked segments showing cumulative total and component breakdown.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      data: { name: "data", type: "array", description: "Data items" },
    },
    defaultProps: { kind: "bar", title: "Server Fleet Health", data: [{ label: "Healthy", value: 84 }, { label: "Degraded", value: 12 }, { label: "Offline", value: 4 }] },
    snippet: '<component type="chart" kind="bar" title="Fleet Health" data=\'[{"label":"Healthy","value":84}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "bar", title: "Fleet Health", data: [{ label: "Healthy", value: 84 }] }, null, 2),
  },

  /* =========================================================================
     3. PRESENTATION & SLIDES (PowerPoint Deck Blocks - 15 Components)
     ========================================================================= */
  {
    id: "slide-title",
    type: "slide:title",
    name: "Presentation Deck Cover",
    category: "slides",
    tags: ["slides", "presentation", "cover", "title", "deck", "keynote"],
    description: "Executive presentation title slide with bold typography, subtitle, and presenter tag.",
    schema: {
      title: { name: "title", type: "string", description: "Presentation Title", required: true },
      subtitle: { name: "subtitle", type: "string", description: "Subtitle or description" },
      presenter: { name: "presenter", type: "string", description: "Presenter name / organization" },
    },
    defaultProps: { title: "Next-Gen AI Systems", subtitle: "Architecture, Real-Time Inference & Autonomous Workflows", presenter: "Engineering Systems Group" },
    snippet: '<component type="slide:title" title="Next-Gen AI Systems" subtitle="Architecture & Real-Time Inference" />',
    jsonSnippet: JSON.stringify({ type: "slide:title", title: "Next-Gen AI Systems", subtitle: "Architecture & Inference" }, null, 2),
  },
  {
    id: "slide-hero",
    type: "slide:hero",
    name: "High-Impact Statement Hero Slide",
    category: "slides",
    tags: ["slides", "hero", "statement", "vision", "impact"],
    description: "High-contrast hero slide centering a single bold strategic statement.",
    schema: {
      headline: { name: "headline", type: "string", description: "Main statement" },
      lead: { name: "lead", type: "string", description: "Supporting paragraph" },
    },
    defaultProps: { headline: "10x Throughput at 50% Lower Compute Cost", lead: "By migrating our ingestion pipelines to streaming Rust microservices, we unlocked sub-10ms P99 latency." },
    snippet: '<component type="slide:hero" headline="10x Throughput at 50% Lower Cost" />',
    jsonSnippet: JSON.stringify({ type: "slide:hero", headline: "10x Throughput at 50% Lower Cost" }, null, 2),
  },
  {
    id: "slide-split",
    type: "slide:split",
    name: "Two-Column Versus Comparison Slide",
    category: "slides",
    tags: ["slides", "split", "comparison", "versus", "before-after"],
    description: "Side-by-side balanced comparison contrasting baseline vs proposed architecture.",
    schema: {
      leftTitle: { name: "leftTitle", type: "string", description: "Left column header" },
      rightTitle: { name: "rightTitle", type: "string", description: "Right column header" },
      leftItems: { name: "leftItems", type: "array", description: "Left bullet items" },
      rightItems: { name: "rightItems", type: "array", description: "Right bullet items" },
    },
    defaultProps: {
      leftTitle: "Legacy Batch Ingest",
      leftItems: ["15-minute sync intervals", "Fragile monolithic crons", "High memory overhead"],
      rightTitle: "Streaming Event Bus",
      rightItems: ["Sub-second continuous ingest", "Stateless horizontal workers", "Automatic retry & backpressure"],
    },
    snippet: '<component type="slide:split" leftTitle="Legacy" rightTitle="Modern Streaming" />',
    jsonSnippet: JSON.stringify({ type: "slide:split", leftTitle: "Legacy", rightTitle: "Modern" }, null, 2),
  },
  {
    id: "slide-features",
    type: "slide:features",
    name: "3-Column Feature Highlight Slide",
    category: "slides",
    tags: ["slides", "features", "pillars", "grid", "overview"],
    description: "Three-column card layout displaying key pillars or core technical advantages.",
    schema: {
      title: { name: "title", type: "string", description: "Slide Title" },
      items: { name: "items", type: "array", description: "Cards: [{ title, description, icon }]" },
    },
    defaultProps: {
      title: "Core Architectural Pillars",
      items: [
        { title: "Zero Latency", description: "P99 inference below 35ms via edge compilation." },
        { title: "Deterministic State", description: "Reproducible agent runs via immutable event logs." },
        { title: "Autonomous Routing", description: "Dynamically cascades requests to cheapest optimal model." },
      ],
    },
    snippet: '<component type="slide:features" title="Core Pillars" items=\'[{"title":"Fast","description":"< 35ms"}]\' />',
    jsonSnippet: JSON.stringify({ type: "slide:features", title: "Core Pillars", items: [{ title: "Fast", description: "< 35ms" }] }, null, 2),
  },
  {
    id: "slide-stats",
    type: "slide:stats",
    name: "Key Numerical Metric Callout Slide",
    category: "slides",
    tags: ["slides", "stats", "kpi", "numbers", "metrics"],
    description: "Slide featuring 3 to 4 large numerical achievements with labels.",
    schema: {
      title: { name: "title", type: "string", description: "Header" },
      stats: { name: "stats", type: "array", description: "Stats [{ number, label, delta }]" },
    },
    defaultProps: {
      title: "Q2 Infrastructure Milestones",
      stats: [
        { number: "99.995%", label: "Uptime SLA" },
        { number: "14.2M", label: "Queries Processed / Day" },
        { number: "18ms", label: "Average Response Time" },
      ],
    },
    snippet: '<component type="slide:stats" title="Milestones" stats=\'[{"number":"99.99%","label":"Uptime"}]\' />',
    jsonSnippet: JSON.stringify({ type: "slide:stats", title: "Milestones", stats: [{ number: "99.99%", label: "Uptime" }] }, null, 2),
  },
  {
    id: "slide-quote",
    type: "slide:quote",
    name: "Executive Quote & Testimonial Slide",
    category: "slides",
    tags: ["slides", "quote", "testimonial", "callout"],
    description: "Elegant typography slide highlighting an important quote and attribution.",
    schema: {
      quote: { name: "quote", type: "string", description: "The quote statement" },
      author: { name: "author", type: "string", description: "Author name" },
      role: { name: "role", type: "string", description: "Author title or organization" },
    },
    defaultProps: {
      quote: "Simplicity is prerequisite for reliability. Complex systems always fail in complex ways.",
      author: "Edsger W. Dijkstra",
      role: "Turing Award Laureate",
    },
    snippet: '<component type="slide:quote" quote="Simplicity is prerequisite for reliability." author="Dijkstra" />',
    jsonSnippet: JSON.stringify({ type: "slide:quote", quote: "Simplicity is prerequisite for reliability.", author: "Dijkstra" }, null, 2),
  },
  {
    id: "slide-roadmap",
    type: "slide:roadmap",
    name: "Phased Product Roadmap Slide",
    category: "slides",
    tags: ["slides", "roadmap", "timeline", "phases", "planning"],
    description: "Horizontal multi-phase roadmap card showing milestones across quarters.",
    schema: {
      title: { name: "title", type: "string", description: "Roadmap header" },
      phases: { name: "phases", type: "array", description: "Phases [{ phase, title, items }]" },
    },
    defaultProps: {
      title: "2026 Engineering Roadmap",
      phases: [
        { phase: "Q1", title: "Foundation", items: ["Edge compiler rollout", "Streaming protocol RFC"] },
        { phase: "Q2", title: "Autonomous Agents", items: ["Multi-hop tool coordination", "Local memory embeddings"] },
        { phase: "Q3", title: "Global Scale", items: ["Multi-region mesh", "Zero-trust token gateway"] },
      ],
    },
    snippet: '<component type="slide:roadmap" title="Roadmap" phases=\'[{"phase":"Q1","title":"Core"}]\' />',
    jsonSnippet: JSON.stringify({ type: "slide:roadmap", title: "Roadmap", phases: [{ phase: "Q1", title: "Core" }] }, null, 2),
  },
  {
    id: "slide-agenda",
    type: "slide:agenda",
    name: "Numbered Meeting Agenda Slide",
    category: "slides",
    tags: ["slides", "agenda", "outline", "contents", "meeting"],
    description: "Numbered meeting table of contents outlining topics and allocated time.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      items: { name: "items", type: "array", description: "Agenda items: [{ num, title, duration }]" },
    },
    defaultProps: {
      title: "Technical Review Agenda",
      items: [
        { num: "01", title: "System Performance Retrospective", duration: "10 mins" },
        { num: "02", title: "Streaming UI Architecture", duration: "20 mins" },
        { num: "03", title: "Security & Sandbox Hardening", duration: "15 mins" },
        { num: "04", title: "Q&A and Next Steps", duration: "15 mins" },
      ],
    },
    snippet: '<component type="slide:agenda" title="Meeting Agenda" items=\'[{"num":"01","title":"Overview"}]\' />',
    jsonSnippet: JSON.stringify({ type: "slide:agenda", title: "Meeting Agenda", items: [{ num: "01", title: "Overview" }] }, null, 2),
  },
  {
    id: "slide-team",
    type: "slide:team",
    name: "Team & Speaker Introduction Slide",
    category: "slides",
    tags: ["slides", "team", "speakers", "members", "bio"],
    description: "Slide introducing contributors with name, avatar, role, and focus area.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      members: { name: "members", type: "array", description: "Members [{ name, role, handle }]" },
    },
    defaultProps: {
      title: "Core Contributors",
      members: [
        { name: "Elena Rostova", role: "Principal Distributed Systems", handle: "@erostova" },
        { name: "Marcus Chen", role: "Staff Frontend Architect", handle: "@mchen" },
        { name: "Aria Thorne", role: "Lead ML Optimization", handle: "@athorne" },
      ],
    },
    snippet: '<component type="slide:team" title="Core Contributors" members=\'[{"name":"Elena","role":"Lead"}]\' />',
    jsonSnippet: JSON.stringify({ type: "slide:team", title: "Core Contributors", members: [{ name: "Elena", role: "Lead" }] }, null, 2),
  },
  {
    id: "slide-process",
    type: "slide:process",
    name: "Linear Step-by-Step Workflow Slide",
    category: "slides",
    tags: ["slides", "process", "steps", "workflow", "flow"],
    description: "Linear step diagram with connecting arrows and descriptions.",
    schema: {
      title: { name: "title", type: "string", description: "Header" },
      steps: { name: "steps", type: "array", description: "Steps: [{ step, label, detail }]" },
    },
    defaultProps: {
      title: "Continuous Deployment Pipeline",
      steps: [
        { step: 1, label: "Commit & Lint", detail: "Fast static analysis and type checks" },
        { step: 2, label: "Hermetic Build", detail: "Single-file bundle artifact packaging" },
        { step: 3, label: "Canary Verify", detail: "Deploy to 5% cluster with live monitoring" },
        { step: 4, label: "Global Rollout", detail: "Zero-downtime DNS traffic cutover" },
      ],
    },
    snippet: '<component type="slide:process" title="Pipeline" steps=\'[{"step":1,"label":"Build"}]\' />',
    jsonSnippet: JSON.stringify({ type: "slide:process", title: "Pipeline", steps: [{ step: 1, label: "Build" }] }, null, 2),
  },
  {
    id: "slide-swot",
    type: "slide:swot",
    name: "2x2 SWOT Strategic Analysis Matrix",
    category: "slides",
    tags: ["slides", "swot", "matrix", "strategy", "analysis"],
    description: "Four-quadrant matrix detailing Strengths, Weaknesses, Opportunities, and Threats.",
    schema: {
      strengths: { name: "strengths", type: "array", description: "Strengths list" },
      weaknesses: { name: "weaknesses", type: "array", description: "Weaknesses list" },
      opportunities: { name: "opportunities", type: "array", description: "Opportunities list" },
      threats: { name: "threats", type: "array", description: "Threats list" },
    },
    defaultProps: {
      strengths: ["Ultra-low latency inference", "Fully local offline canvas"],
      weaknesses: ["Higher initial WASM load time"],
      opportunities: ["Decentralized edge execution"],
      threats: ["Proprietary closed-garden alternatives"],
    },
    snippet: '<component type="slide:swot" strengths=\'["Fast execution"]\' />',
    jsonSnippet: JSON.stringify({ type: "slide:swot", strengths: ["Fast execution"], weaknesses: ["Memory footprint"] }, null, 2),
  },
  {
    id: "slide-matrix",
    type: "slide:matrix",
    name: "2x2 Priority Matrix (Impact vs Effort)",
    category: "slides",
    tags: ["slides", "matrix", "priority", "quadrant", "planning"],
    description: "Decision quadrant mapping initiatives across Value/Impact vs Effort.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      quadrants: { name: "quadrants", type: "object", description: "4 quadrants items" },
    },
    defaultProps: {
      title: "Feature Prioritization Matrix",
      quickWins: ["Inline tool traces", "Precision slider interaction"],
      majorProjects: ["Semantic component embeddings", "Unified local model runtime"],
      fillIns: ["Color theme tweaks", "Font size adjustments"],
      thanklessTasks: ["Legacy browser polyfills"],
    },
    snippet: '<component type="slide:matrix" title="Priority Matrix" />',
    jsonSnippet: JSON.stringify({ type: "slide:matrix", title: "Priority Matrix" }, null, 2),
  },
  {
    id: "slide-pros-cons",
    type: "slide:pros-cons",
    name: "Pros & Cons Evaluation Card",
    category: "slides",
    tags: ["slides", "pros", "cons", "tradeoffs", "decision"],
    description: "Side-by-side tradeoff card showing advantages and potential downsides.",
    schema: {
      title: { name: "title", type: "string", description: "Decision subject" },
      pros: { name: "pros", type: "array", description: "Pros list" },
      cons: { name: "cons", type: "array", description: "Cons list" },
    },
    defaultProps: {
      title: "Evaluating Single-File Distribution Bundle",
      pros: ["Zero external CDN dependencies", "Instant offline loading", "Impenetrable sandbox integrity"],
      cons: ["Larger initial download size (approx. 2.5MB)", "Must inline all SVG and CSS assets"],
    },
    snippet: '<component type="slide:pros-cons" title="Bundle Tradeoffs" pros=\'["Offline"]\' cons=\'["Size"]\' />',
    jsonSnippet: JSON.stringify({ type: "slide:pros-cons", title: "Bundle Tradeoffs", pros: ["Offline"], cons: ["Size"] }, null, 2),
  },
  {
    id: "slide-pricing",
    type: "slide:pricing",
    name: "Tiered Pricing & Plan Card",
    category: "slides",
    tags: ["slides", "pricing", "plans", "tiers", "saas"],
    description: "Three-tier pricing table highlighting Starter, Pro, and Enterprise options.",
    schema: {
      tiers: { name: "tiers", type: "array", description: "Pricing tiers [{ name, price, period, features, highlight }]" },
    },
    defaultProps: {
      tiers: [
        { name: "Starter", price: "$0", period: "forever", features: ["100 queries / day", "Standard models", "Community support"] },
        { name: "Pro", price: "$29", period: "per month", highlight: true, features: ["Unlimited queries", "Frontier model reasoning", "Real-time web & code sandbox", "Priority queue"] },
        { name: "Team", price: "$79", period: "per seat / mo", features: ["Dedicated GPU endpoints", "Shared workspace knowledge", "SSO & compliance"] },
      ],
    },
    snippet: '<component type="slide:pricing" tiers=\'[{"name":"Starter","price":"$0"},{"name":"Pro","price":"$29","highlight":true}]\' />',
    jsonSnippet: JSON.stringify({ type: "slide:pricing", tiers: [{ name: "Starter", price: "$0" }, { name: "Pro", price: "$29", highlight: true }] }, null, 2),
  },
  {
    id: "slide-conclusion",
    type: "slide:conclusion",
    name: "Key Takeaways & Next Steps Slide",
    category: "slides",
    tags: ["slides", "conclusion", "takeaways", "summary", "actions"],
    description: "Closing presentation slide summarizing core conclusions and action items.",
    schema: {
      title: { name: "title", type: "string", description: "Header" },
      takeaways: { name: "takeaways", type: "array", description: "Summary points" },
    },
    defaultProps: {
      title: "Summary & Action Items",
      takeaways: [
        "Minimalist design accelerates user focus and eliminates interface cognitive fatigue.",
        "Streaming blur-to-focus animations prevent layout jank and jarring reflows.",
        "Precision expansion sliders provide both high aesthetic cleanliness and exact tactile control.",
      ],
    },
    snippet: '<component type="slide:conclusion" title="Takeaways" takeaways=\'["Ship minimal","Ensure fluid feel"]\' />',
    jsonSnippet: JSON.stringify({ type: "slide:conclusion", title: "Takeaways", takeaways: ["Ship minimal", "Ensure fluid feel"] }, null, 2),
  },

  /* =========================================================================
     4. VISUALIZERS & MATH / SCIENCE (15 Components)
     ========================================================================= */
  {
    id: "math",
    type: "math",
    name: "2D Math Function Plotter",
    category: "visualizer",
    tags: ["math", "plot", "equation", "function", "graph", "calculus", "latex", "desmos"],
    description: "Interactive 2D math plotter supporting LaTeX equations, implicit curves, crosshairs, pan, and zoom.",
    schema: {
      fn: { name: "fn", type: "string", description: "Function expr or LaTeX, e.g. sin(x)*cos(2x)" },
      title: { name: "title", type: "string", description: "Title" },
      xmin: { name: "xmin", type: "number", description: "Min X", default: -6 },
      xmax: { name: "xmax", type: "number", description: "Max X", default: 6 },
    },
    defaultProps: { fn: "sin(x) * cos(2*x)", title: "Damped Harmonic Superposition", xmin: -6, xmax: 6, ymin: -2, ymax: 2 },
    snippet: '<component type="math" fn="sin(x) * cos(2*x)" title="Harmonic Wave" />',
    jsonSnippet: JSON.stringify({ type: "math", fn: "sin(x) * cos(2*x)", title: "Harmonic Wave" }, null, 2),
  },
  {
    id: "chemistry",
    type: "chemistry",
    name: "2D SMILES Molecular Diagram",
    category: "visualizer",
    tags: ["chemistry", "smiles", "molecule", "structure", "formula", "science"],
    description: "Crisp 2D chemical structure renderer from SMILES or common molecule names (caffeine, aspirin).",
    schema: {
      smiles: { name: "smiles", type: "string", description: "SMILES string or molecule name", required: true },
      title: { name: "title", type: "string", description: "Name" },
    },
    defaultProps: { smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C", title: "Caffeine", caption: "Central Nervous System Stimulant" },
    snippet: '<component type="chemistry" smiles="CN1C=NC2=C1C(=O)N(C(=O)N2C)C" title="Caffeine" />',
    jsonSnippet: JSON.stringify({ type: "chemistry", smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C", title: "Caffeine" }, null, 2),
  },
  {
    id: "flowchart",
    type: "flowchart",
    name: "Node-Edge Process Flowchart",
    category: "visualizer",
    tags: ["flowchart", "nodes", "graph", "dag", "workflow"],
    description: "Interactive node-and-edge process flowchart depicting dataflow sequences.",
    schema: {
      nodes: { name: "nodes", type: "array", description: "Nodes [{ id, label, type }]" },
      edges: { name: "edges", type: "array", description: "Edges [{ from, to, label }]" },
    },
    defaultProps: {
      nodes: [{ id: "1", label: "Client Request" }, { id: "2", label: "Auth Gateway" }, { id: "3", label: "Fast Cache" }, { id: "4", label: "Database Cluster" }],
      edges: [{ from: "1", to: "2" }, { from: "2", to: "3" }, { from: "3", to: "4", label: "cache miss" }],
    },
    snippet: '<component type="flowchart" nodes=\'[{"id":"1","label":"Start"},{"id":"2","label":"End"}]\' edges=\'[{"from":"1","to":"2"}]\' />',
    jsonSnippet: JSON.stringify({ type: "flowchart", nodes: [{ id: "1", label: "Start" }, { id: "2", label: "End" }], edges: [{ from: "1", to: "2" }] }, null, 2),
  },
  {
    id: "mindmap",
    type: "mindmap",
    name: "Radial Concept Mindmap",
    category: "visualizer",
    tags: ["mindmap", "brainstorm", "concept", "radial", "tree"],
    description: "Radial node concept map organizing ideas and sub-branches.",
    schema: {
      root: { name: "root", type: "string", description: "Central topic" },
      branches: { name: "branches", type: "array", description: "Branch items" },
    },
    defaultProps: {
      root: "Core Engine",
      branches: [
        { label: "Compiler", kids: ["AST Parser", "Type Checker", "Bytecode Emit"] },
        { label: "Runtime", kids: ["Memory Arena", "GC", "Async Event Loop"] },
        { label: "Tool Mesh", kids: ["MCP Client", "Web Search", "Python Sandbox"] },
      ],
    },
    snippet: '<component type="mindmap" root="Core Engine" />',
    jsonSnippet: JSON.stringify({ type: "mindmap", root: "Core Engine" }, null, 2),
  },
  {
    id: "timeline",
    type: "timeline",
    name: "Chronological Sequence Timeline",
    category: "visualizer",
    tags: ["timeline", "history", "events", "sequence", "audit"],
    description: "Vertical timeline card connecting historical milestones and events.",
    schema: {
      events: { name: "events", type: "array", description: "Events [{ date, title, description }]" },
    },
    defaultProps: {
      events: [
        { date: "09:00", title: "Incident Triggered", description: "Spike in API error rate detected by telemetry" },
        { date: "09:04", title: "Automated Traffic Reroute", description: "Standby clusters engaged in secondary availability zone" },
        { date: "09:12", title: "Full Stabilization", description: "Latency returned to normal baseline P99 < 30ms" },
      ],
    },
    snippet: '<component type="timeline" events=\'[{"date":"09:00","title":"Alert"}]\' />',
    jsonSnippet: JSON.stringify({ type: "timeline", events: [{ date: "09:00", title: "Alert" }] }, null, 2),
  },
  {
    id: "tree-view",
    type: "tree-view",
    name: "Hierarchical File Tree",
    category: "visualizer",
    tags: ["tree", "files", "directory", "hierarchy", "folders"],
    description: "Collapsible nested tree depicting directory and folder hierarchies.",
    schema: {
      items: { name: "items", type: "array", description: "Tree items" },
    },
    defaultProps: {
      items: [
        { name: "src", type: "dir", kids: [{ name: "canvas", type: "dir", kids: [{ name: "Blocks.tsx" }, { name: "MathPlotBlock.tsx" }] }, { name: "App.tsx" }] },
        { name: "package.json", type: "file" },
      ],
    },
    snippet: '<component type="tree-view" items=\'[{"name":"src","type":"dir"}]\' />',
    jsonSnippet: JSON.stringify({ type: "tree-view", items: [{ name: "src", type: "dir" }] }, null, 2),
  },
  {
    id: "venn",
    type: "venn",
    name: "Set Overlap Venn Diagram",
    category: "visualizer",
    tags: ["venn", "sets", "intersection", "logic"],
    description: "Overlapping circle diagram showing set intersections.",
    schema: {
      sets: { name: "sets", type: "array", description: "Sets [{ name, items }]" },
    },
    defaultProps: {
      sets: [
        { name: "Speed", items: ["Low Latency", "Quick Start"] },
        { name: "Quality", items: ["Deep Reasoning", "Chain of Thought"] },
        { overlap: ["Optimized Frontier Models"] },
      ],
    },
    snippet: '<component type="venn" sets=\'[{"name":"Fast"},{"name":"Accurate"}]\' />',
    jsonSnippet: JSON.stringify({ type: "venn", sets: [{ name: "Fast" }, { name: "Accurate" }] }, null, 2),
  },
  {
    id: "architecture",
    type: "architecture",
    name: "System Architecture Map",
    category: "visualizer",
    tags: ["architecture", "cloud", "infra", "diagram", "services"],
    description: "Multi-tier cloud system architecture component diagram.",
    schema: {
      tiers: { name: "tiers", type: "array", description: "Tiers [{ name, services }]" },
    },
    defaultProps: {
      tiers: [
        { name: "Edge Layer", services: ["Cloudflare CDN", "WAF", "Anycast DNS"] },
        { name: "Compute Mesh", services: ["Rust Ingest Workers", "Node Orchestrator", "Model Gateway"] },
        { name: "Persistence", services: ["PostgreSQL HA", "Redis Cache", "S3 Vector Store"] },
      ],
    },
    snippet: '<component type="architecture" tiers=\'[{"name":"Edge","services":["CDN"]}]\' />',
    jsonSnippet: JSON.stringify({ type: "architecture", tiers: [{ name: "Edge", services: ["CDN"] }] }, null, 2),
  },
  {
    id: "circuit",
    type: "circuit",
    name: "Logic Gate Circuit Schematic",
    category: "visualizer",
    tags: ["circuit", "schematic", "logic", "electronics", "gates"],
    description: "Digital circuit diagram displaying interconnected logic gates.",
    schema: {
      gates: { name: "gates", type: "array", description: "Gates list" },
    },
    defaultProps: {
      gates: [{ type: "AND", in: ["A", "B"], out: "X" }, { type: "OR", in: ["X", "C"], out: "Q" }],
    },
    snippet: '<component type="circuit" gates=\'[{"type":"AND","out":"X"}]\' />',
    jsonSnippet: JSON.stringify({ type: "circuit", gates: [{ type: "AND", out: "X" }] }, null, 2),
  },
  {
    id: "git-graph",
    type: "git-graph",
    name: "Git Branch & Commit Graph",
    category: "visualizer",
    tags: ["git", "commits", "branches", "merge", "versioning"],
    description: "Visual DAG representing Git commits, branching paths, and merges.",
    schema: {
      branches: { name: "branches", type: "array", description: "Branch names" },
      commits: { name: "commits", type: "array", description: "Commit history" },
    },
    defaultProps: {
      commits: [
        { hash: "8efa752", branch: "main", msg: "Initial stable release" },
        { hash: "c9c6c6d", branch: "feat/interactive", msg: "Add precision expansion slider" },
        { hash: "32d374e", branch: "main", msg: "Merge interactive components" },
      ],
    },
    snippet: '<component type="git-graph" commits=\'[{"hash":"8efa752","msg":"Init"}]\' />',
    jsonSnippet: JSON.stringify({ type: "git-graph", commits: [{ hash: "8efa752", msg: "Init" }] }, null, 2),
  },
  {
    id: "diff-viewer",
    type: "diff-viewer",
    name: "Side-by-Side Unified Code Diff",
    category: "visualizer",
    tags: ["diff", "patch", "git", "code", "compare"],
    description: "Side-by-side code diff visualizer showing added, modified, and removed lines.",
    schema: {
      oldCode: { name: "oldCode", type: "string", description: "Original code" },
      newCode: { name: "newCode", type: "string", description: "New modified code" },
      lang: { name: "lang", type: "string", description: "Language", default: "typescript" },
    },
    defaultProps: {
      lang: "typescript",
      oldCode: "function getSlider() {\n  return <input type=\"range\" />;\n}",
      newCode: "function getSlider() {\n  return <PrecisionExpansionSlider />;\n}",
    },
    snippet: '<component type="diff-viewer" oldCode="a" newCode="b" lang="typescript" />',
    jsonSnippet: JSON.stringify({ type: "diff-viewer", oldCode: "a", newCode: "b", lang: "typescript" }, null, 2),
  },
  {
    id: "color-palette",
    type: "color-palette",
    name: "Color Harmony Palette Grid",
    category: "visualizer",
    tags: ["colors", "palette", "design", "contrast", "tokens"],
    description: "Design token visualizer displaying semantic color swatches and hex codes.",
    schema: {
      title: { name: "title", type: "string", description: "Palette Title" },
      swatches: { name: "swatches", type: "array", description: "Swatches [{ name, hex }]" },
    },
    defaultProps: {
      title: "App Design System Tokens",
      swatches: [
        { name: "Background", hex: "#141414" },
        { name: "Surface", hex: "#1c1c1c" },
        { name: "Accent", hex: "#d7b28c" },
        { name: "Text Primary", hex: "#f5f5f5" },
        { name: "Text Muted", hex: "#a1a1aa" },
      ],
    },
    snippet: '<component type="color-palette" title="Design System" swatches=\'[{"name":"Accent","hex":"#d7b28c"}]\' />',
    jsonSnippet: JSON.stringify({ type: "color-palette", title: "Design System", swatches: [{ name: "Accent", hex: "#d7b28c" }] }, null, 2),
  },
  {
    id: "unit-circle",
    type: "unit-circle",
    name: "Trigonometric Unit Circle",
    category: "visualizer",
    tags: ["math", "trig", "circle", "sin", "cos", "geometry"],
    description: "Interactive unit circle illustrating sine, cosine, and tangent coordinates.",
    schema: {
      angle: { name: "angle", type: "number", description: "Angle in degrees", default: 45 },
    },
    defaultProps: { angle: 45 },
    snippet: '<component type="unit-circle" angle="45" />',
    jsonSnippet: JSON.stringify({ type: "unit-circle", angle: 45 }, null, 2),
  },
  {
    id: "audio-player",
    type: "audio-player",
    name: "Waveform Audio Player",
    category: "visualizer",
    tags: ["audio", "player", "waveform", "sound", "media"],
    description: "Minimalist audio player with audio waveform scrubber and playback controls.",
    schema: {
      title: { name: "title", type: "string", description: "Audio track title" },
      src: { name: "src", type: "string", description: "Audio URL" },
      duration: { name: "duration", type: "string", description: "Track duration" },
    },
    defaultProps: { title: "Telemetry Waveform", duration: "03:42" },
    snippet: '<component type="audio-player" title="Synthesis Voiceover" />',
    jsonSnippet: JSON.stringify({ type: "audio-player", title: "Synthesis Voiceover" }, null, 2),
  },
  {
    id: "video-player",
    type: "video-player",
    name: "Minimalist Video Player",
    category: "visualizer",
    tags: ["video", "player", "stream", "media"],
    description: "Embedded clean video viewport with playback overlay.",
    schema: {
      title: { name: "title", type: "string", description: "Video title" },
      src: { name: "src", type: "string", description: "Video URL" },
    },
    defaultProps: { title: "Product Architecture Walkthrough", src: "https://example.com/demo.mp4" },
    snippet: '<component type="video-player" title="Demo" src="url" />',
    jsonSnippet: JSON.stringify({ type: "video-player", title: "Demo", src: "url" }, null, 2),
  },

  /* =========================================================================
     5. DATA & TABLES (10 Components)
     ========================================================================= */
  {
    id: "metrics",
    type: "metrics",
    name: "Executive KPI Metrics Grid",
    category: "data",
    tags: ["metrics", "kpi", "stats", "executive", "cards"],
    description: "Dense KPI metric badges with value, uppercase label, and positive/negative delta change badges.",
    schema: {
      items: { name: "items", type: "array", description: "KPI Items: [{ label, value, delta }]" },
    },
    defaultProps: {
      items: [
        { label: "ACTIVE NODES", value: "24", delta: "+2" },
        { label: "AVG LATENCY", value: "34ms", delta: "-3.2ms" },
        { label: "PEAK RPS", value: "54.2k", delta: "+18%" },
        { label: "UPTIME", value: "99.99%" },
      ],
    },
    snippet: '<component type="metrics" items=\'[{"label":"ACTIVE NODES","value":"24"},{"label":"LATENCY","value":"34ms","delta":"-3ms"}]\' />',
    jsonSnippet: JSON.stringify({ type: "metrics", items: [{ label: "ACTIVE NODES", value: "24" }, { label: "LATENCY", value: "34ms", delta: "-3ms" }] }, null, 2),
  },
  {
    id: "table",
    type: "table",
    name: "Sortable Searchable Data Table",
    category: "data",
    tags: ["table", "grid", "data", "rows", "columns", "sort"],
    description: "Data table with sortable columns, row search, and pagination.",
    schema: {
      columns: { name: "columns", type: "array", description: "Headers" },
      rows: { name: "rows", type: "array", description: "Row data arrays" },
    },
    defaultProps: {
      columns: ["Service", "Environment", "Status", "P99 Latency", "Error Rate"],
      rows: [
        ["auth-gateway", "production", "Healthy", "14ms", "0.01%"],
        ["vector-index", "production", "Healthy", "28ms", "0.00%"],
        ["realtime-sync", "production", "Degraded", "112ms", "0.45%"],
        ["billing-worker", "production", "Healthy", "42ms", "0.02%"],
      ],
    },
    snippet: '<component type="table" columns=\'["Service","Status"]\' rows=\'[["auth","ok"],["sync","ok"]]\' />',
    jsonSnippet: JSON.stringify({ type: "table", columns: ["Service", "Status"], rows: [["auth", "ok"], ["sync", "ok"]] }, null, 2),
  },
  {
    id: "leaderboard",
    type: "leaderboard",
    name: "Ranked Standings Leaderboard",
    category: "data",
    tags: ["leaderboard", "rankings", "score", "standings"],
    description: "Ranked leaderboard list showing standings, avatar medals, and scores.",
    schema: {
      title: { name: "title", type: "string", description: "Title" },
      entries: { name: "entries", type: "array", description: "Entries [{ rank, name, score }]" },
    },
    defaultProps: {
      title: "Model Benchmark Leaderboard (Code Synthesis)",
      entries: [
        { rank: 1, name: "Frontier Reasoner 4.5", score: "94.8%" },
        { rank: 2, name: "Claude 3.7 Sonnet (Thinking)", score: "94.2%" },
        { rank: 3, name: "DeepSeek R1", score: "93.6%" },
        { rank: 4, name: "GPT-4o (2024-11)", score: "90.4%" },
      ],
    },
    snippet: '<component type="leaderboard" title="Leaderboard" entries=\'[{"rank":1,"name":"Model A","score":"95%"}]\' />',
    jsonSnippet: JSON.stringify({ type: "leaderboard", title: "Leaderboard", entries: [{ rank: 1, name: "Model A", score: "95%" }] }, null, 2),
  },
  {
    id: "activity-feed",
    type: "activity-feed",
    name: "Chronological Activity Feed",
    category: "data",
    tags: ["activity", "feed", "log", "history", "audit"],
    description: "Event audit feed with user avatars, action tags, and relative timestamps.",
    schema: {
      title: { name: "title", type: "string", description: "Header" },
      items: { name: "items", type: "array", description: "Feed items [{ user, action, time }]" },
    },
    defaultProps: {
      title: "Recent Deployment Activity",
      items: [
        { user: "alex.dev", action: "Merged PR #412: Optimize slider expansion physics", time: "5m ago" },
        { user: "ci-bot", action: "Automated test suite passed (68 tests, 0 failures)", time: "12m ago" },
        { user: "elena.r", action: "Promoted build #32d374e to production cluster", time: "42m ago" },
      ],
    },
    snippet: '<component type="activity-feed" title="Recent Activity" items=\'[{"user":"alex","action":"Deployed"}]\' />',
    jsonSnippet: JSON.stringify({ type: "activity-feed", title: "Recent Activity", items: [{ user: "alex", action: "Deployed" }] }, null, 2),
  },
  {
    id: "kv",
    type: "kv",
    name: "Key-Value Metadata Summary",
    category: "data",
    tags: ["kv", "metadata", "summary", "details"],
    description: "High-contrast key-value list for metadata, parameters, and environment info.",
    schema: {
      items: { name: "items", type: "array", description: "Pairs: [{ k, v }]" },
    },
    defaultProps: {
      items: [
        { k: "Runtime Engine", v: "Node.js v22 (Hermetic Sandbox)" },
        { k: "Compiler Optimization", v: "Vite Single-File Inline" },
        { k: "TLS Protocol", v: "TLS 1.3 Strict Origin" },
        { k: "Memory Allocated", v: "512 MB High-Watermark" },
      ],
    },
    snippet: '<component type="kv" items=\'[{"k":"Runtime","v":"V8"}]\' />',
    jsonSnippet: JSON.stringify({ type: "kv", items: [{ k: "Runtime", v: "V8" }] }, null, 2),
  },
  {
    id: "changelog",
    type: "changelog",
    name: "Version Release Notes & Changelog",
    category: "data",
    tags: ["changelog", "release", "versions", "notes"],
    description: "Versioned release notes card with feature tags and release dates.",
    schema: {
      version: { name: "version", type: "string", description: "Version string" },
      date: { name: "date", type: "string", description: "Release date" },
      changes: { name: "changes", type: "array", description: "Changes array" },
    },
    defaultProps: {
      version: "v2.4.0",
      date: "August 2026",
      changes: [
        "Added Precision Expansion Slider with tactile thickening on hold",
        "Streamlined UI Component Library with hover-revealed metadata",
        "Resolved streaming component freeze; live blur-to-focus animation",
      ],
    },
    snippet: '<component type="changelog" version="v2.4.0" changes=\'["Precision slider"]\' />',
    jsonSnippet: JSON.stringify({ type: "changelog", version: "v2.4.0", changes: ["Precision slider"] }, null, 2),
  },
  {
    id: "status-badge",
    type: "status-badge",
    name: "System Health Status Pill",
    category: "data",
    tags: ["status", "health", "badge", "pill", "indicator"],
    description: "Compact status badge with steady dot indicator and state label.",
    schema: {
      status: { name: "status", type: "string", description: "Status mode: ok | warn | err", default: "ok" },
      label: { name: "label", type: "string", description: "Text label" },
    },
    defaultProps: { status: "ok", label: "All 24 Nodes Operational" },
    snippet: '<component type="status-badge" status="ok" label="Systems Operational" />',
    jsonSnippet: JSON.stringify({ type: "status-badge", status: "ok", label: "Systems Operational" }, null, 2),
  },
  {
    id: "counter",
    type: "counter",
    name: "Animated Number Counter",
    category: "data",
    tags: ["counter", "odometer", "number", "stats"],
    description: "Animated odometer number display for counts and totals.",
    schema: {
      value: { name: "value", type: "number", description: "Number value" },
      label: { name: "label", type: "string", description: "Counter label" },
    },
    defaultProps: { label: "Total Telemetry Events Logged", value: 148290 },
    snippet: '<component type="counter" label="Events" value="148290" />',
    jsonSnippet: JSON.stringify({ type: "counter", label: "Events", value: 148290 }, null, 2),
  },
  {
    id: "benchmark",
    type: "benchmark",
    name: "Comparative Performance Benchmark",
    category: "data",
    tags: ["benchmark", "comparison", "performance", "throughput"],
    description: "Side-by-side benchmark card contrasting speed, throughput, and memory.",
    schema: {
      title: { name: "title", type: "string", description: "Benchmark title" },
      rows: { name: "rows", type: "array", description: "Rows [{ name, valA, valB }]" },
    },
    defaultProps: {
      title: "Compiler Optimization Benchmark",
      targetA: "Old Architecture",
      targetB: "Minimalist Engine",
      metrics: [
        { label: "Cold Start", valA: "1,240 ms", valB: "140 ms" },
        { label: "Memory Footprint", valA: "185 MB", valB: "24 MB" },
        { label: "Throughput (RPS)", valA: "420", valB: "3,850" },
      ],
    },
    snippet: '<component type="benchmark" title="Benchmark" />',
    jsonSnippet: JSON.stringify({ type: "benchmark", title: "Benchmark" }, null, 2),
  },
  {
    id: "user-card",
    type: "user-card",
    name: "Profile Summary Card",
    category: "data",
    tags: ["user", "profile", "card", "author"],
    description: "Minimalist user card with initials badge, role, and details.",
    schema: {
      name: { name: "name", type: "string", description: "Name" },
      role: { name: "role", type: "string", description: "Role" },
    },
    defaultProps: { name: "Alexander Vance", role: "Principal Distributed Systems Architect", email: "avance@datacenter.net" },
    snippet: '<component type="user-card" name="Alex" role="Engineer" />',
    jsonSnippet: JSON.stringify({ type: "user-card", name: "Alex", role: "Engineer" }, null, 2),
  },

  /* =========================================================================
     6. LAYOUT & STRUCTURE (7 Components)
     ========================================================================= */
  {
    id: "switcher",
    type: "switcher",
    name: "Multi-View Segmented Switcher",
    category: "layout",
    tags: ["switcher", "tabs", "multi-view", "comparison", "dashboard", "layout"],
    description: "Seamless segmented tab switcher for toggling between multiple charts or dashboards without reflow.",
    schema: {
      tabs: { name: "tabs", type: "array", description: "Tabs [{ label, content }]" },
    },
    defaultProps: {
      tabs: [
        { label: "Throughput (RPS)", content: { type: "chart", kind: "area", title: "Peak Throughput Over Time", data: [{ label: "00:00", value: 300 }, { label: "12:00", value: 1950 }] } },
        { label: "Latency (ms)", content: { type: "chart", kind: "line", title: "P99 Latency", data: [{ label: "00:00", value: 38 }, { label: "12:00", value: 68 }] } },
      ],
    },
    snippet: '<component type="switcher" tabs=\'[{"label":"Tab 1","content":{"type":"chart","kind":"area"}}]\' />',
    jsonSnippet: JSON.stringify({ type: "switcher", tabs: [{ label: "Tab 1", content: { type: "chart", kind: "area" } }] }, null, 2),
  },
  {
    id: "tabs",
    type: "tabs",
    name: "Horizontal Sliding Pill Tabs",
    category: "layout",
    tags: ["tabs", "navigation", "layout", "sections"],
    description: "Tab container with smooth sliding pill indicator.",
    schema: {
      tabs: { name: "tabs", type: "array", description: "Tabs array" },
    },
    defaultProps: {
      tabs: [
        { label: "Overview", content: { type: "callout", title: "Overview", text: "Core cluster operating at nominal parameters." } },
        { label: "Metrics", content: { type: "metrics", items: [{ label: "NODES", value: "24" }, { label: "LATENCY", value: "32ms" }] } },
      ],
    },
    snippet: '<component type="tabs" tabs=\'[{"label":"Overview"}]\' />',
    jsonSnippet: JSON.stringify({ type: "tabs", tabs: [{ label: "Overview" }] }, null, 2),
  },
  {
    id: "accordion",
    type: "accordion",
    name: "Collapsible Accordion Sections",
    category: "layout",
    tags: ["accordion", "collapse", "faq", "sections", "expand"],
    description: "Expandable accordions with smooth height transitions.",
    schema: {
      items: { name: "items", type: "array", description: "Sections: [{ title, content }]" },
    },
    defaultProps: {
      items: [
        { title: "What is the Precision Expansion Slider?", content: "It starts as a sleek, hairline 6px track, and expands to 26px when held or dragged, revealing precision numbers." },
        { title: "How does streaming UI work?", content: "Components animate in smoothly with a gentle blur-to-focus transition without freezing or jitter." },
      ],
    },
    snippet: '<component type="accordion" items=\'[{"title":"Section 1","content":"Details"}]\' />',
    jsonSnippet: JSON.stringify({ type: "accordion", items: [{ title: "Section 1", content: "Details" }] }, null, 2),
  },
  {
    id: "carousel",
    type: "carousel",
    name: "Horizontal Card Carousel",
    category: "layout",
    tags: ["carousel", "slider", "horizontal", "cards", "scroll"],
    description: "Swipeable horizontal card container with navigation arrows.",
    schema: {
      cards: { name: "cards", type: "array", description: "Cards array" },
    },
    defaultProps: {
      cards: [
        { title: "Card 1: High Precision", text: "Tactile slider control" },
        { title: "Card 2: Fast Streaming", text: "Zero layout reflow" },
        { title: "Card 3: 90+ Components", text: "Full presentation & UI library" },
      ],
    },
    snippet: '<component type="carousel" cards=\'[{"title":"Card 1"}]\' />',
    jsonSnippet: JSON.stringify({ type: "carousel", cards: [{ title: "Card 1" }] }, null, 2),
  },
  {
    id: "split-view",
    type: "split-view",
    name: "Dual-Pane Split Container",
    category: "layout",
    tags: ["split", "dual", "columns", "layout"],
    description: "Two-pane container for displaying code and live preview side-by-side.",
    schema: {
      left: { name: "left", type: "object", description: "Left pane content" },
      right: { name: "right", type: "object", description: "Right pane content" },
    },
    defaultProps: {
      left: { type: "callout", title: "Specification", text: "Defines input props and bounds." },
      right: { type: "slider", label: "Live Output", value: 60 },
    },
    snippet: '<component type="split-view" />',
    jsonSnippet: JSON.stringify({ type: "split-view" }, null, 2),
  },
  {
    id: "callout",
    type: "callout",
    name: "Minimalist Tonal Callout",
    category: "layout",
    tags: ["callout", "alert", "notice", "info", "warning"],
    description: "Clean tone banner without harsh accent lines, using subtle surface contrast.",
    schema: {
      title: { name: "title", type: "string", description: "Callout title" },
      text: { name: "text", type: "string", description: "Body text" },
      tone: { name: "tone", type: "string", description: "info | warn | ok | err", default: "info" },
    },
    defaultProps: { title: "Telemetry Live", text: "Streaming telemetry connected over secure WebSocket transport.", tone: "info" },
    snippet: '<component type="callout" title="Notice" text="System nominal" />',
    jsonSnippet: JSON.stringify({ type: "callout", title: "Notice", text: "System nominal" }, null, 2),
  },
  {
    id: "modal-dialog",
    type: "modal-dialog",
    name: "In-Situ Action Dialog",
    category: "layout",
    tags: ["modal", "dialog", "confirm", "action"],
    description: "In-situ confirmation dialog card with confirm and cancel buttons.",
    schema: {
      title: { name: "title", type: "string", description: "Dialog title" },
      message: { name: "message", type: "string", description: "Dialog message" },
    },
    defaultProps: { title: "Confirm Node Migration?", message: "Migrating 24 nodes to edge runtime will cause a 25ms connection re-handshake." },
    snippet: '<component type="modal-dialog" title="Confirm Action" />',
    jsonSnippet: JSON.stringify({ type: "modal-dialog", title: "Confirm Action" }, null, 2),
  },
];

/**
 * Unified search function for both UI search inputs and LLM queries.
 */
export function searchComponents(
  query = "",
  options?: { category?: string; tag?: string; limit?: number }
): UIComponentDef[] {
  const q = (query || "").toLowerCase().trim();
  const cat = (options?.category || "").toLowerCase().trim();
  const tag = (options?.tag || "").toLowerCase().trim();
  const limit = options?.limit ?? 100;

  // Clean category normalization (consolidates form/feedback into interactive)
  const normalizedCat = cat === "form" || cat === "feedback" ? "interactive" : cat;

  return COMPONENT_CATALOG.filter((comp) => {
    if (normalizedCat && normalizedCat !== "all" && comp.category.toLowerCase() !== normalizedCat) {
      return false;
    }
    if (tag && !comp.tags.some((t) => t.toLowerCase() === tag)) {
      return false;
    }
    if (!q) return true;

    const terms = q.split(/\s+/).filter(Boolean);
    return terms.every((term) =>
      comp.id.toLowerCase().includes(term) ||
      comp.type.toLowerCase().includes(term) ||
      comp.name.toLowerCase().includes(term) ||
      comp.description.toLowerCase().includes(term) ||
      comp.category.toLowerCase().includes(term) ||
      comp.tags.some((t) => t.toLowerCase().includes(term))
    );
  }).slice(0, limit);
}

/**
 * Retrieve a specific component definition by ID or type.
 */
export function getComponentDef(idOrType: string): UIComponentDef | undefined {
  const norm = (idOrType || "").toLowerCase().trim();
  return COMPONENT_CATALOG.find(
    (c) => c.id.toLowerCase() === norm || c.type.toLowerCase() === norm
  );
}

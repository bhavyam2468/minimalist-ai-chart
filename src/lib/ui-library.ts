/**
 * UI Component Library & Marketplace
 * Curated suite of 100% functional, minimalist, and interactive components.
 * Every component here renders seamlessly in chat inline (<component>) and in the canvas.
 */

export interface UIComponentDef {
  id: string;
  name: string;
  type: string;
  category: "interactive" | "chart" | "slides" | "visualizer" | "data" | "layout";
  description: string;
  tags: string[];
  defaultProps: Record<string, any>;
  snippet: string;
  jsonSnippet: string;
}

export const COMPONENT_CATALOG: UIComponentDef[] = [
  /* =========================================================================
     INTERACTIVE CONTROLS & WIDGETS
     ========================================================================= */
  {
    id: "slider",
    name: "Precision Expansion Slider",
    type: "slider",
    category: "interactive",
    description: "Resting hairline bar that expands on press/drag for fine numerical control, with live numeric readout.",
    tags: ["slider", "range", "volume", "stepper", "number", "precision"],
    defaultProps: { label: "Compute Capacity", value: 65, min: 0, max: 100, step: 1, unit: "%" },
    snippet: '<component type="slider" label="Compute Capacity" value="65" min="0" max="100" step="1" unit="%" />',
    jsonSnippet: JSON.stringify({ type: "slider", label: "Compute Capacity", value: 65, min: 0, max: 100, step: 1, unit: "%" }, null, 2),
  },
  {
    id: "color-picker",
    name: "Palette Color Swatch Selector",
    type: "color-picker",
    category: "interactive",
    description: "Interactive color swatch picker with active outline ring, hex feedback, copy button, and custom input.",
    tags: ["color", "swatch", "palette", "theme", "design", "hex"],
    defaultProps: {
      label: "Accent Palette",
      value: "#7C3AED",
      colors: ["#7C3AED", "#FF6B6B", "#F59E0B", "#10B981", "#38BDF8", "#64748B", "#F43F5E", "#D97706", "#059669", "#1E293B"]
    },
    snippet: '<component type="color-picker" label="Accent Palette" value="#7C3AED" colors=\'["#7C3AED","#FF6B6B","#F59E0B","#10B981","#38BDF8"]\' />',
    jsonSnippet: JSON.stringify({ type: "color-picker", label: "Accent Palette", value: "#7C3AED", colors: ["#7C3AED", "#FF6B6B", "#F59E0B", "#10B981", "#38BDF8"] }, null, 2),
  },
  {
    id: "calendar",
    name: "Calendar Date Selector",
    type: "calendar",
    category: "interactive",
    description: "Interactive monthly calendar with month navigation, day grid, and selected date readout.",
    tags: ["calendar", "date", "picker", "schedule", "time", "day"],
    defaultProps: { label: "Target Delivery Date", value: "2026-08-28" },
    snippet: '<component type="calendar" label="Target Delivery Date" value="2026-08-28" />',
    jsonSnippet: JSON.stringify({ type: "calendar", label: "Target Delivery Date", value: "2026-08-28" }, null, 2),
  },
  {
    id: "clock",
    name: "Digital World Clock",
    type: "clock",
    category: "interactive",
    description: "Live ticking digital clock with seconds, formatted date, and Local/UTC timezone toggle.",
    tags: ["clock", "time", "timezone", "world", "digital", "timer"],
    defaultProps: { label: "System Clock (UTC / Local)" },
    snippet: '<component type="clock" label="System Clock" />',
    jsonSnippet: JSON.stringify({ type: "clock", label: "System Clock" }, null, 2),
  },
  {
    id: "timer",
    name: "Countdown Focus Timer",
    type: "timer",
    category: "interactive",
    description: "Interactive countdown timer with start/pause/reset and animated time progression.",
    tags: ["timer", "countdown", "clock", "focus", "stopwatch"],
    defaultProps: { label: "Sprint Countdown", seconds: 300 },
    snippet: '<component type="timer" label="Sprint Countdown" seconds="300" />',
    jsonSnippet: JSON.stringify({ type: "timer", label: "Sprint Countdown", seconds: 300 }, null, 2),
  },
  {
    id: "stopwatch",
    name: "Precision Stopwatch",
    type: "stopwatch",
    category: "interactive",
    description: "Stopwatch with hundredths of a second precision, split laps, and control buttons.",
    tags: ["stopwatch", "timer", "lap", "time", "precision"],
    defaultProps: { label: "Latency Benchmark" },
    snippet: '<component type="stopwatch" label="Latency Benchmark" />',
    jsonSnippet: JSON.stringify({ type: "stopwatch", label: "Latency Benchmark" }, null, 2),
  },
  {
    id: "weather",
    name: "Weather & Forecast Card",
    type: "weather",
    category: "interactive",
    description: "Clean minimalist weather status card with condition icon, temperature, humidity, and wind metrics.",
    tags: ["weather", "forecast", "temp", "temperature", "climate", "meteo"],
    defaultProps: { city: "New York City, NY", temp: "74°F", condition: "Clear Skies", high: "78°", low: "62°", humidity: "45%", wind: "7 mph" },
    snippet: '<component type="weather" city="New York City, NY" temp="74°F" condition="Clear Skies" high="78°" low="62°" humidity="45%" wind="7 mph" />',
    jsonSnippet: JSON.stringify({ type: "weather", city: "New York City, NY", temp: "74°F", condition: "Clear Skies", high: "78°", low: "62°", humidity: "45%", wind: "7 mph" }, null, 2),
  },
  {
    id: "search-bar",
    name: "Interactive Search Bar",
    type: "search-bar",
    category: "interactive",
    description: "Minimalist search input with magnifying glass, clear button, and real-time query feedback.",
    tags: ["search", "input", "filter", "query", "find"],
    defaultProps: { placeholder: "Search repository symbols..." },
    snippet: '<component type="search-bar" placeholder="Search repository symbols..." />',
    jsonSnippet: JSON.stringify({ type: "search-bar", placeholder: "Search repository symbols..." }, null, 2),
  },
  {
    id: "tags-input",
    name: "Tokenized Tag Editor",
    type: "tags-input",
    category: "interactive",
    description: "Interactive chip editor with removable tags and an inline adder on Enter.",
    tags: ["tags", "chips", "badges", "labels", "keywords", "categories"],
    defaultProps: { label: "Project Tags", tags: ["Frontend", "Performance", "Minimalist"] },
    snippet: '<component type="tags-input" label="Project Tags" tags=\'["Frontend","Performance","Minimalist"]\' />',
    jsonSnippet: JSON.stringify({ type: "tags-input", label: "Project Tags", tags: ["Frontend", "Performance", "Minimalist"] }, null, 2),
  },
  {
    id: "file-upload",
    name: "Dropzone File Target",
    type: "file-upload",
    category: "interactive",
    description: "Minimal dashed dropzone with file type requirements and simulated upload feedback.",
    tags: ["upload", "file", "dropzone", "attachment", "import"],
    defaultProps: { label: "Upload Evaluation Dataset", accept: "JSON, CSV, or Parquet up to 50MB" },
    snippet: '<component type="file-upload" label="Upload Evaluation Dataset" accept="JSON, CSV up to 50MB" />',
    jsonSnippet: JSON.stringify({ type: "file-upload", label: "Upload Evaluation Dataset", accept: "JSON, CSV up to 50MB" }, null, 2),
  },
  {
    id: "segmented-control",
    name: "Sliding Segmented Control",
    type: "segmented-control",
    category: "interactive",
    description: "Concentric pill switcher with smooth sliding active background indicator.",
    tags: ["segmented", "tabs", "pills", "switcher", "toggle"],
    defaultProps: { value: "24H", options: ["1H", "24H", "7D", "30D", "All"] },
    snippet: '<component type="segmented-control" value="24H" options=\'["1H","24H","7D","30D"]\' />',
    jsonSnippet: JSON.stringify({ type: "segmented-control", value: "24H", options: ["1H", "24H", "7D", "30D"] }, null, 2),
  },
  {
    id: "button",
    name: "Action Button",
    type: "button",
    category: "interactive",
    description: "Interactive button supporting primary, secondary, and danger styles with click feedback.",
    tags: ["button", "action", "submit", "trigger", "cta"],
    defaultProps: { label: "Deploy Cluster", variant: "primary" },
    snippet: '<component type="button" label="Deploy Cluster" variant="primary" />',
    jsonSnippet: JSON.stringify({ type: "button", label: "Deploy Cluster", variant: "primary" }, null, 2),
  },
  {
    id: "button-group",
    name: "Multi-Action Button Bar",
    type: "button-group",
    category: "interactive",
    description: "Horizontal bar of grouped action buttons with interactive feedback.",
    tags: ["buttons", "actions", "toolbar", "group", "bar"],
    defaultProps: { items: [{ label: "Copy JSON" }, { label: "Share" }, { label: "Export PDF" }] },
    snippet: '<component type="button-group" items=\'[{"label":"Copy"},{"label":"Share"},{"label":"Export"}]\' />',
    jsonSnippet: JSON.stringify({ type: "button-group", items: [{ label: "Copy" }, { label: "Share" }, { label: "Export" }] }, null, 2),
  },
  {
    id: "checkbox",
    name: "Toggle Checkbox",
    type: "checkbox",
    category: "interactive",
    description: "Smooth toggle checkbox with checked checkmark animation and description.",
    tags: ["checkbox", "check", "toggle", "boolean", "option"],
    defaultProps: { label: "Enable telemetry streaming", description: "Send anonymous performance metrics", checked: true },
    snippet: '<component type="checkbox" label="Enable telemetry streaming" description="Send metrics" checked="true" />',
    jsonSnippet: JSON.stringify({ type: "checkbox", label: "Enable telemetry streaming", description: "Send metrics", checked: true }, null, 2),
  },
  {
    id: "radio",
    name: "Radio Selection Group",
    type: "radio",
    category: "interactive",
    description: "Radio button group for mutually exclusive options with active indicator.",
    tags: ["radio", "choice", "options", "select", "mode"],
    defaultProps: {
      value: "balanced",
      options: [
        { id: "fast", label: "Low Latency (< 30ms)" },
        { id: "balanced", label: "Balanced Throughput" },
        { id: "deep", label: "Deep Reasoning" },
      ],
    },
    snippet: '<component type="radio" value="balanced" options=\'[{"id":"fast","label":"Low Latency"},{"id":"balanced","label":"Balanced"}]\' />',
    jsonSnippet: JSON.stringify({ type: "radio", value: "balanced", options: [{ id: "fast", label: "Low Latency" }, { id: "balanced", label: "Balanced" }] }, null, 2),
  },
  {
    id: "switch",
    name: "Binary Toggle Switch",
    type: "switch",
    category: "interactive",
    description: "Minimal sliding toggle switch for enabling or disabling features.",
    tags: ["switch", "toggle", "on-off", "boolean"],
    defaultProps: { label: "Auto-save checkpoints", checked: true },
    snippet: '<component type="switch" label="Auto-save checkpoints" checked="true" />',
    jsonSnippet: JSON.stringify({ type: "switch", label: "Auto-save checkpoints", checked: true }, null, 2),
  },
  {
    id: "dropdown",
    name: "Select Dropdown",
    type: "dropdown",
    category: "interactive",
    description: "Minimalist dropdown menu with chevron indicator and option list.",
    tags: ["dropdown", "select", "menu", "picker", "options"],
    defaultProps: {
      label: "Active Environment",
      value: "prod",
      options: [
        { value: "dev", label: "Development (Local)" },
        { value: "staging", label: "Staging (us-east-1)" },
        { value: "prod", label: "Production (Global)" },
      ],
    },
    snippet: '<component type="dropdown" label="Active Environment" value="prod" options=\'[{"value":"dev","label":"Dev"},{"value":"prod","label":"Prod"}]\' />',
    jsonSnippet: JSON.stringify({ type: "dropdown", label: "Active Environment", value: "prod", options: [{ value: "dev", label: "Dev" }, { value: "prod", label: "Prod" }] }, null, 2),
  },
  {
    id: "input",
    name: "Text / Number Field",
    type: "input",
    category: "interactive",
    description: "Clean input field for text, numerical parameters, or API tokens.",
    tags: ["input", "text", "field", "form", "entry"],
    defaultProps: { label: "API Base URL", placeholder: "https://api.gateway.internal/v1" },
    snippet: '<component type="input" label="API Base URL" placeholder="https://api.gateway.internal/v1" />',
    jsonSnippet: JSON.stringify({ type: "input", label: "API Base URL", placeholder: "https://api.gateway.internal/v1" }, null, 2),
  },
  {
    id: "stepper",
    name: "Numeric Stepper",
    type: "stepper",
    category: "interactive",
    description: "Compact numeric stepper with plus/minus buttons and unit label.",
    tags: ["stepper", "counter", "number", "increment", "quantity"],
    defaultProps: { label: "Compute Replicas", value: 4, min: 1, max: 32, unit: "nodes" },
    snippet: '<component type="stepper" label="Compute Replicas" value="4" min="1" max="32" unit="nodes" />',
    jsonSnippet: JSON.stringify({ type: "stepper", label: "Compute Replicas", value: 4, min: 1, max: 32, unit: "nodes" }, null, 2),
  },
  {
    id: "rating",
    name: "Interactive Star Rating",
    type: "rating",
    category: "interactive",
    description: "Star rating selector with hover animations and click selection feedback.",
    tags: ["rating", "stars", "feedback", "score", "review"],
    defaultProps: { label: "Model Quality Score", value: 4, max: 5 },
    snippet: '<component type="rating" label="Model Quality Score" value="4" max="5" />',
    jsonSnippet: JSON.stringify({ type: "rating", label: "Model Quality Score", value: 4, max: 5 }, null, 2),
  },
  {
    id: "progress",
    name: "Linear Progress Meter",
    type: "progress",
    category: "interactive",
    description: "Minimal progress bar with percentage readout and animated fill.",
    tags: ["progress", "meter", "loading", "percentage", "bar"],
    defaultProps: { label: "Task Execution", value: 78, max: 100, unit: "%" },
    snippet: '<component type="progress" label="Task Execution" value="78" max="100" unit="%" />',
    jsonSnippet: JSON.stringify({ type: "progress", label: "Task Execution", value: 78, max: 100, unit: "%" }, null, 2),
  },
  {
    id: "todo",
    name: "Interactive Task Checklist",
    type: "todo",
    category: "interactive",
    description: "Checklist with interactive task completion toggles and strike-through.",
    tags: ["todo", "tasks", "checklist", "items", "done"],
    defaultProps: {
      title: "Sprint Tasks",
      items: [
        { text: "Implement precision slider", done: true },
        { text: "Streamline component catalog", done: true },
        { text: "Test reactive widget updates", done: false },
      ],
    },
    snippet: '<component type="todo" title="Sprint Tasks" items=\'[{"text":"Task 1","done":true},{"text":"Task 2","done":false}]\' />',
    jsonSnippet: JSON.stringify({ type: "todo", title: "Sprint Tasks", items: [{ text: "Task 1", done: true }, { text: "Task 2", done: false }] }, null, 2),
  },

  /* =========================================================================
     MODULAR FORMS & REACTIVE WIDGETS
     ========================================================================= */
  {
    id: "form",
    name: "Modular Form Container",
    type: "form",
    category: "interactive",
    description: "Multi-field form grouping questions, inputs, sliders, and color swatches. Submitting sends structured JSON back to the AI with full question context.",
    tags: ["form", "submit", "survey", "inputs", "questions", "answers"],
    defaultProps: {
      title: "Deployment Configuration",
      description: "Select target environment parameters and submit to verify.",
      submitLabel: "Apply Configuration",
      fields: [
        { id: "env", label: "Environment", type: "dropdown", options: [{ value: "dev", label: "Development" }, { value: "prod", label: "Production" }] },
        { id: "replicas", label: "Instance Count", type: "slider", min: 1, max: 16, value: 4, unit: "nodes" },
        { id: "palette", label: "Theme Accent", type: "color-picker", value: "#7C3AED" },
        { id: "notify", label: "Send Slack Alerts", type: "checkbox", checked: true },
      ],
    },
    snippet: '<component type="form" title="Deployment Config" submitLabel="Submit" fields=\'[{"id":"env","label":"Env","type":"dropdown","options":["dev","prod"]},{"id":"nodes","label":"Nodes","type":"slider","value":4}]\' />',
    jsonSnippet: JSON.stringify({
      type: "form",
      title: "Deployment Configuration",
      submitLabel: "Apply Configuration",
      fields: [
        { id: "env", label: "Environment", type: "dropdown", options: ["Development", "Production"] },
        { id: "replicas", label: "Instance Count", type: "slider", min: 1, max: 16, value: 4 },
      ]
    }, null, 2),
  },
  {
    id: "question",
    name: "Interactive Question Card",
    type: "question",
    category: "interactive",
    description: "Question card with selectable options. Supports instant submit or linked Submit button to send structured feedback.",
    tags: ["question", "poll", "survey", "choice", "decision", "submit"],
    defaultProps: {
      question: "Which model checkpoint would you like to evaluate?",
      options: [
        { id: "v1", label: "v1.4 (Standard 7B)", description: "Faster inference, lower memory footprint" },
        { id: "v2", label: "v2.0 (MoE 8x7B)", description: "High reasoning capacity with tool support" },
      ],
      requireSubmit: true,
      submitLabel: "Confirm Choice",
    },
    snippet: '<component type="question" question="Which checkpoint?" options=\'[{"id":"v1","label":"v1.4"},{"id":"v2","label":"v2.0"}]\' requireSubmit="true" />',
    jsonSnippet: JSON.stringify({
      type: "question",
      question: "Which checkpoint?",
      options: [{ id: "v1", label: "v1.4" }, { id: "v2", label: "v2.0" }],
      requireSubmit: true
    }, null, 2),
  },
  {
    id: "reactive",
    name: "Reactive Calculator & Scenario Simulator",
    type: "reactive",
    category: "interactive",
    description: "Client-side interactive widget combining inputs (sliders, steppers, dropdowns) with real-time recalculating metrics and dynamic live charts.",
    tags: ["reactive", "calculator", "simulator", "dynamic", "pricing", "scenario", "interactive"],
    defaultProps: {
      title: "SaaS Revenue Simulator",
      description: "Adjust seat price and active subscriptions to recalculate ARR dynamically.",
      state: { price: 49, units: 150 },
      controls: [
        { id: "price", label: "Seat Price ($)", type: "slider", min: 10, max: 200, step: 5, value: 49, unit: "$" },
        { id: "units", label: "Active Subscriptions", type: "stepper", min: 10, max: 1000, step: 25, value: 150, unit: "seats" },
      ],
    },
    snippet: '<component type="reactive" title="Revenue Simulator" state=\'{"price":49,"units":150}\' controls=\'[{"id":"price","type":"slider","min":10,"max":200,"unit":"$"},{"id":"units","type":"stepper","min":10,"max":500}]\' />',
    jsonSnippet: JSON.stringify({
      type: "reactive",
      title: "Revenue Simulator",
      state: { price: 49, units: 150 },
      controls: [
        { id: "price", label: "Seat Price ($)", type: "slider", min: 10, max: 200, unit: "$" },
        { id: "units", label: "Active Subscriptions", type: "stepper", min: 10, max: 500, unit: "seats" },
      ]
    }, null, 2),
  },

  /* =========================================================================
     CHARTS (HIGH-FIDELITY & 100% REAL RENDERERS)
     ========================================================================= */
  {
    id: "chart-line",
    name: "Trend Line Chart",
    type: "chart",
    category: "chart",
    description: "Line chart with smooth hover dot tracking, interactive crosshairs, and multi-series support.",
    tags: ["line", "chart", "trend", "timeseries", "metrics"],
    defaultProps: { kind: "line", data: [{ label: "Mon", value: 120 }, { label: "Tue", value: 180 }, { label: "Wed", value: 150 }, { label: "Thu", value: 240 }, { label: "Fri", value: 310 }] },
    snippet: '<component type="chart" kind="line" data=\'[{"label":"Mon","value":120},{"label":"Tue","value":180},{"label":"Wed","value":240}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "line", data: [{ label: "Mon", value: 120 }, { label: "Tue", value: 180 }, { label: "Wed", value: 240 }] }, null, 2),
  },
  {
    id: "chart-area",
    name: "Area Gradient Chart",
    type: "chart",
    category: "chart",
    description: "Filled area chart with smooth gradient transitions and steady focal tracking.",
    tags: ["area", "chart", "volume", "bandwidth", "fill"],
    defaultProps: { kind: "area", data: [{ label: "Jan", value: 45 }, { label: "Feb", value: 72 }, { label: "Mar", value: 68 }, { label: "Apr", value: 95 }, { label: "May", value: 130 }] },
    snippet: '<component type="chart" kind="area" data=\'[{"label":"Jan","value":45},{"label":"Feb","value":72},{"label":"Mar","value":95}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "area", data: [{ label: "Jan", value: 45 }, { label: "Feb", value: 72 }, { label: "Mar", value: 95 }] }, null, 2),
  },
  {
    id: "chart-bar",
    name: "Vertical Bar Chart",
    type: "chart",
    category: "chart",
    description: "Vertical bar chart with Google-style entrance animation and value tooltips.",
    tags: ["bar", "chart", "comparison", "columns", "distribution"],
    defaultProps: { kind: "bar", data: [{ label: "Alpha", value: 64 }, { label: "Beta", value: 88 }, { label: "Gamma", value: 42 }, { label: "Delta", value: 95 }] },
    snippet: '<component type="chart" kind="bar" data=\'[{"label":"Alpha","value":64},{"label":"Beta","value":88},{"label":"Gamma","value":42}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "bar", data: [{ label: "Alpha", value: 64 }, { label: "Beta", value: 88 }, { label: "Gamma", value: 42 }] }, null, 2),
  },
  {
    id: "chart-hbar",
    name: "Horizontal Bar Chart",
    type: "chart",
    category: "chart",
    description: "Horizontal distribution chart with clean left-to-right wipe animations.",
    tags: ["hbar", "horizontal", "ranking", "breakdown"],
    defaultProps: { kind: "hbar", data: [{ label: "Search Queries", value: 4120 }, { label: "File Reads", value: 2850 }, { label: "Code Executions", value: 1640 }] },
    snippet: '<component type="chart" kind="hbar" data=\'[{"label":"Search","value":4120},{"label":"Files","value":2850}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "hbar", data: [{ label: "Search", value: 4120 }, { label: "Files", value: 2850 }] }, null, 2),
  },
  {
    id: "chart-donut",
    name: "Donut Proportion Chart",
    type: "chart",
    category: "chart",
    description: "Donut chart with center total readout and interactive slice segment inspection.",
    tags: ["donut", "pie", "proportion", "breakdown", "portfolio"],
    defaultProps: { kind: "donut", data: [{ label: "Compute", value: 45 }, { label: "Storage", value: 25 }, { label: "Network", value: 20 }, { label: "Other", value: 10 }] },
    snippet: '<component type="chart" kind="donut" data=\'[{"label":"Compute","value":45},{"label":"Storage","value":25},{"label":"Network","value":20}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "donut", data: [{ label: "Compute", value: 45 }, { label: "Storage", value: 25 }, { label: "Network", value: 20 }] }, null, 2),
  },
  {
    id: "chart-pie",
    name: "Proportional Pie Chart",
    type: "chart",
    category: "chart",
    description: "Circular pie chart with segmented arc percentages and hover inspection.",
    tags: ["pie", "chart", "share", "allocation", "segments"],
    defaultProps: { kind: "pie", data: [{ label: "Direct", value: 50 }, { label: "Referral", value: 30 }, { label: "Organic", value: 20 }] },
    snippet: '<component type="chart" kind="pie" data=\'[{"label":"Direct","value":50},{"label":"Referral","value":30}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "pie", data: [{ label: "Direct", value: 50 }, { label: "Referral", value: 30 }] }, null, 2),
  },
  {
    id: "chart-bubble",
    name: "3-Variable Bubble Chart",
    type: "chart",
    category: "chart",
    description: "Multi-dimensional bubble chart displaying X, Y, and Radius (Size) with translucent SVG circles.",
    tags: ["bubble", "scatter", "3d", "multivariable", "market", "size"],
    defaultProps: {
      kind: "bubble",
      title: "Market Opportunity (Size = Revenue)",
      data: [
        { label: "US Market", x: 25, y: 75, r: 32 },
        { label: "EU Region", x: 60, y: 55, r: 24 },
        { label: "APAC Sector", x: 80, y: 85, r: 28 },
        { label: "LATAM", x: 40, y: 30, r: 16 },
      ],
    },
    snippet: '<component type="chart" kind="bubble" title="Market Opportunity" data=\'[{"label":"US","x":25,"y":75,"r":32},{"label":"EU","x":60,"y":55,"r":24}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "bubble", title: "Market Opportunity", data: [{ label: "US", x: 25, y: 75, r: 32 }, { label: "EU", x: 60, y: 55, r: 24 }] }, null, 2),
  },
  {
    id: "chart-treemap",
    name: "Hierarchical Treemap",
    type: "chart",
    category: "chart",
    description: "Proportional nested rectangular blocks representing hierarchical shares and resource usage.",
    tags: ["treemap", "hierarchy", "storage", "disk", "share", "nested"],
    defaultProps: {
      kind: "treemap",
      title: "Disk Space by Directory",
      data: [
        { label: "node_modules", value: 420 },
        { label: "src", value: 85 },
        { label: "dist", value: 45 },
        { label: "public", value: 22 },
        { label: "assets", value: 18 },
      ],
    },
    snippet: '<component type="chart" kind="treemap" title="Disk Space" data=\'[{"label":"node_modules","value":420},{"label":"src","value":85}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "treemap", title: "Disk Space", data: [{ label: "node_modules", value: 420 }, { label: "src", value: 85 }] }, null, 2),
  },
  {
    id: "chart-waterfall",
    name: "Cumulative Waterfall Bridge",
    type: "chart",
    category: "chart",
    description: "Financial bridge chart showing starting capital, positive/negative delta events, and final ending balance.",
    tags: ["waterfall", "bridge", "financial", "arr", "delta", "cashflow"],
    defaultProps: {
      kind: "waterfall",
      title: "Net Revenue Bridge ($K)",
      data: [
        { label: "Starting", value: 120 },
        { label: "New ARR", value: 45 },
        { label: "Churn", value: -12 },
        { label: "Expansion", value: 28 },
        { label: "Ending", value: 181 },
      ],
    },
    snippet: '<component type="chart" kind="waterfall" title="Revenue Bridge" data=\'[{"label":"Start","value":120},{"label":"New","value":45},{"label":"Churn","value":-12},{"label":"End","value":153}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "waterfall", title: "Revenue Bridge", data: [{ label: "Start", value: 120 }, { label: "New", value: 45 }, { label: "Churn", value: -12 }, { label: "End", value: 153 }] }, null, 2),
  },
  {
    id: "chart-radar",
    name: "Multi-Axis Radar Spider Chart",
    type: "chart",
    category: "chart",
    description: "Spiderweb polygon chart visualizing balanced multidimensional scores across 5+ attributes.",
    tags: ["radar", "spider", "skills", "assessment", "multiaxis"],
    defaultProps: { kind: "radar", data: [{ label: "Throughput", value: 90 }, { label: "Latency", value: 85 }, { label: "Accuracy", value: 95 }, { label: "Reliability", value: 80 }, { label: "Cost", value: 70 }] },
    snippet: '<component type="chart" kind="radar" data=\'[{"label":"Speed","value":90},{"label":"Cost","value":70},{"label":"UX","value":85}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "radar", data: [{ label: "Speed", value: 90 }, { label: "Cost", value: 70 }, { label: "UX", value: 85 }] }, null, 2),
  },
  {
    id: "chart-gauge",
    name: "Speedometer Radial Gauge",
    type: "chart",
    category: "chart",
    description: "Radial arc gauge for tracking KPI thresholds, health meters, and capacity limits.",
    tags: ["gauge", "speedometer", "kpi", "meter", "health"],
    defaultProps: { kind: "gauge", title: "CPU Utilization", value: 74, min: 0, max: 100, unit: "%" },
    snippet: '<component type="chart" kind="gauge" title="CPU" value="74" min="0" max="100" unit="%" />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "gauge", title: "CPU Utilization", value: 74, min: 0, max: 100, unit: "%" }, null, 2),
  },
  {
    id: "chart-funnel",
    name: "Conversion Funnel Chart",
    type: "chart",
    category: "chart",
    description: "Step-by-step conversion funnel with left-aligned bars and drop-off percentages.",
    tags: ["funnel", "conversion", "stages", "pipeline", "dropoff"],
    defaultProps: { kind: "funnel", data: [{ label: "Impressions", value: 12500 }, { label: "Clicks", value: 4200 }, { label: "Signups", value: 1100 }, { label: "Purchases", value: 340 }] },
    snippet: '<component type="chart" kind="funnel" data=\'[{"label":"Leads","value":1000},{"label":"Deals","value":250}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "funnel", data: [{ label: "Leads", value: 1000 }, { label: "Deals", value: 250 }] }, null, 2),
  },
  {
    id: "chart-heatmap",
    name: "Matrix Activity Heatmap",
    type: "chart",
    category: "chart",
    description: "Grid heatmap with intensity shading for git commits, hourly traffic, or sensor telemetry.",
    tags: ["heatmap", "matrix", "density", "commits", "activity"],
    defaultProps: {
      kind: "heatmap",
      title: "Hourly Request Traffic",
      rows: ["Mon", "Wed", "Fri"],
      cols: ["00", "04", "08", "12", "16", "20"],
      matrix: [[2, 5, 25, 80, 65, 12], [4, 8, 30, 95, 70, 15], [1, 3, 20, 75, 55, 10]],
    },
    snippet: '<component type="chart" kind="heatmap" title="Traffic" rows=\'["Mon","Fri"]\' cols=\'["00","12"]\' matrix=\'[[10,80],[15,70]]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "heatmap", title: "Traffic", rows: ["Mon", "Fri"], cols: ["00", "12"], matrix: [[10, 80], [15, 70]] }, null, 2),
  },
  {
    id: "chart-candlestick",
    name: "Financial Candlestick Chart",
    type: "chart",
    category: "chart",
    description: "Candlestick chart displaying open, high, low, close with bullish/bearish color encoding.",
    tags: ["candlestick", "finance", "crypto", "stocks", "ohlc"],
    defaultProps: {
      kind: "candlestick",
      data: [
        { time: "09:30", open: 180, high: 185, low: 178, close: 183 },
        { time: "10:30", open: 183, high: 189, low: 182, close: 187 },
        { time: "11:30", open: 187, high: 188, low: 181, close: 182 },
        { time: "12:30", open: 182, high: 191, low: 180, close: 190 },
      ],
    },
    snippet: '<component type="chart" kind="candlestick" data=\'[{"time":"09:00","open":100,"high":105,"low":98,"close":104}]\' />',
    jsonSnippet: JSON.stringify({ type: "chart", kind: "candlestick", data: [{ time: "09:00", open: 100, high: 105, low: 98, close: 104 }] }, null, 2),
  },

  /* =========================================================================
     INTERACTIVE VISUALIZERS (MATH & SCIENCE)
     ========================================================================= */
  {
    id: "chemistry",
    name: "2D Molecular SMILES Visualizer",
    type: "chemistry",
    category: "visualizer",
    description: "Renders 2D organic molecular chemical structures via smiles-drawer with zoom, pan, and formula lookup.",
    tags: ["chemistry", "molecule", "smiles", "formula", "science", "biology"],
    defaultProps: { title: "Caffeine Molecule", molecule: "caffeine", smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C" },
    snippet: '<component type="chemistry" molecule="aspirin" />',
    jsonSnippet: JSON.stringify({ type: "chemistry", title: "Caffeine", molecule: "caffeine", smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C" }, null, 2),
  },
  {
    id: "math",
    name: "Interactive 2D Function Visualizer",
    type: "math",
    category: "visualizer",
    description: "Desmos-like 2D mathematical function grapher with interactive dragging, zooming, and crosshair coordinates.",
    tags: ["math", "plot", "function", "graph", "calculus", "trigonometry"],
    defaultProps: { title: "Damped Harmonic Oscillation", fn: "exp(-0.2*x)*sin(2*x)" },
    snippet: '<component type="math" fn="sin(x)*cos(2*x)" />',
    jsonSnippet: JSON.stringify({ type: "math", title: "Harmonic Oscillator", fn: "exp(-0.2*x)*sin(2*x)" }, null, 2),
  },

  /* =========================================================================
     PRESENTATION SLIDES
     ========================================================================= */
  {
    id: "slide-title",
    name: "Presentation Title Slide",
    type: "slide:title",
    category: "slides",
    description: "Slide deck cover title block with presenter attribution and subtitle.",
    tags: ["slide", "presentation", "title", "deck", "cover"],
    defaultProps: { presenter: "Q3 Strategy Review", title: "Next-Generation Autonomous Systems", subtitle: "Architecture, Model Distillation & Latency Milestones" },
    snippet: '<component type="slide:title" presenter="Keynote" title="Title Here" subtitle="Subtitle description" />',
    jsonSnippet: JSON.stringify({ type: "slide:title", presenter: "Keynote", title: "Title Here", subtitle: "Subtitle description" }, null, 2),
  },
  {
    id: "slide-hero",
    name: "Hero Headline Slide",
    type: "slide:hero",
    category: "slides",
    description: "High-impact presentation slide featuring an oversized bold statement and supporting thesis.",
    tags: ["slide", "hero", "statement", "headline"],
    defaultProps: { headline: "Inference Latency Reduced by 4.2x", lead: "By compiling model weights down to single-pass tensor kernels, production TTFT drops from 120ms to 28ms." },
    snippet: '<component type="slide:hero" headline="Major Milestone" lead="Details explaining the milestone." />',
    jsonSnippet: JSON.stringify({ type: "slide:hero", headline: "Major Milestone", lead: "Details explaining the milestone." }, null, 2),
  },
  {
    id: "slide-split",
    name: "Two-Column Comparison Slide",
    type: "slide:split",
    category: "slides",
    description: "Slide comparing two approaches or Before/After states in parallel cards.",
    tags: ["slide", "split", "comparison", "columns", "before-after"],
    defaultProps: {
      title: "Architectural Comparison",
      leftTitle: "Monolithic Dispatch",
      leftItems: ["Single-threaded pipeline", "High tail latency (p99 > 300ms)", "Difficult canary rollouts"],
      rightTitle: "Distributed Micro-Kernels",
      rightItems: ["Non-blocking async pipelines", "Uniform p99 under 45ms", "Instant zero-downtime cutover"],
    },
    snippet: '<component type="slide:split" title="Comparison" leftTitle="Option A" leftItems=\'["A1","A2"]\' rightTitle="Option B" rightItems=\'["B1","B2"]\' />',
    jsonSnippet: JSON.stringify({ type: "slide:split", title: "Comparison", leftTitle: "Option A", leftItems: ["A1", "A2"], rightTitle: "Option B", rightItems: ["B1", "B2"] }, null, 2),
  },
  {
    id: "slide-features",
    name: "Feature Grid Slide",
    type: "slide:features",
    category: "slides",
    description: "Presentation slide displaying 3 to 6 feature blocks with titles and descriptions.",
    tags: ["slide", "features", "grid", "benefits", "capabilities"],
    defaultProps: {
      title: "Core Platform Capabilities",
      items: [
        { title: "Deterministic Cache", description: "Sub-millisecond semantic retrieval across verified embeddings" },
        { title: "Resilient Sandboxing", description: "Fully isolated execution environments with zero host leakage" },
        { title: "Streaming UI", description: "Progressive token blur-to-focus animation without layout reflows" },
      ],
    },
    snippet: '<component type="slide:features" title="Capabilities" items=\'[{"title":"Feat 1","description":"Desc 1"}]\' />',
    jsonSnippet: JSON.stringify({ type: "slide:features", title: "Capabilities", items: [{ title: "Feat 1", description: "Desc 1" }] }, null, 2),
  },
  {
    id: "slide-stats",
    name: "Key Metrics Numbers Slide",
    type: "slide:stats",
    category: "slides",
    description: "Presentation slide highlighting 3 to 4 massive KPI stats with descriptive labels.",
    tags: ["slide", "stats", "kpi", "numbers", "metrics"],
    defaultProps: {
      title: "2026 Production Performance",
      stats: [
        { number: "99.99%", label: "Uptime Reliability" },
        { number: "28ms", label: "Median TTFT" },
        { number: "1.2M+", label: "Active Inference Streams" },
      ],
    },
    snippet: '<component type="slide:stats" title="Performance" stats=\'[{"number":"99.9%","label":"Uptime"},{"number":"28ms","label":"Latency"}]\' />',
    jsonSnippet: JSON.stringify({ type: "slide:stats", title: "Performance", stats: [{ number: "99.9%", label: "Uptime" }, { number: "28ms", label: "Latency" }] }, null, 2),
  },
  {
    id: "slide-roadmap",
    name: "Strategic Roadmap Slide",
    type: "slide:roadmap",
    category: "slides",
    description: "Timeline roadmap slide showcasing quarterly milestones and delivery phases.",
    tags: ["slide", "roadmap", "timeline", "phases", "milestones"],
    defaultProps: {
      title: "Engineering Roadmap",
      phases: [
        { phase: "Q1", title: "Kernel Optimization", items: ["Multi-provider routing", "SIMD vector ops"] },
        { phase: "Q2", title: "Generative UI v2", items: ["Live reactive formulas", "Modular form binding"] },
        { phase: "Q3", title: "Autonomous Agents", items: ["Self-healing syntax loops", "Zero-downtime scaling"] },
      ],
    },
    snippet: '<component type="slide:roadmap" title="Roadmap" phases=\'[{"phase":"Q1","title":"Phase 1","items":["Item A"]}]\' />',
    jsonSnippet: JSON.stringify({ type: "slide:roadmap", title: "Roadmap", phases: [{ phase: "Q1", title: "Phase 1", items: ["Item A"] }] }, null, 2),
  },
  {
    id: "slide-quote",
    name: "Executive Quote Slide",
    type: "slide:quote",
    category: "slides",
    description: "Presentation quote block emphasizing partner feedback or executive vision.",
    tags: ["slide", "quote", "testimonial", "callout"],
    defaultProps: {
      quote: "The combination of immediate streaming UI with zero-latency reactive widgets makes this workspace feel like an extension of thought.",
      author: "Elena Rostova",
      role: "VP of Engineering, Horizon Labs",
    },
    snippet: '<component type="slide:quote" quote="Inspiring quote here." author="Name" role="Title" />',
    jsonSnippet: JSON.stringify({ type: "slide:quote", quote: "Inspiring quote here.", author: "Name", role: "Title" }, null, 2),
  },
  {
    id: "slide-team",
    name: "Team & Leadership Slide",
    type: "slide:team",
    category: "slides",
    description: "Grid showcasing key team leads, their roles, and contributions.",
    tags: ["slide", "team", "people", "leadership", "organization"],
    defaultProps: {
      title: "Core Architecture Leads",
      members: [
        { name: "Maya Lin", role: "Principal Systems Architect", bio: "Compiler & runtime design" },
        { name: "David Chen", role: "Head of Generative UI", bio: "Reactive component SDK" },
        { name: "Sophia Alvarez", role: "Lead ML Infrastructure", bio: "Distributed tensor pipelines" },
      ],
    },
    snippet: '<component type="slide:team" title="Team" members=\'[{"name":"Maya Lin","role":"Lead"}]\' />',
    jsonSnippet: JSON.stringify({ type: "slide:team", title: "Team", members: [{ name: "Maya Lin", role: "Lead" }] }, null, 2),
  },
  {
    id: "slide-cta",
    name: "Call to Action Slide",
    type: "slide:cta",
    category: "slides",
    description: "Concluding presentation slide with an inspiring call to action and action button.",
    tags: ["slide", "cta", "conclusion", "finish", "next-steps"],
    defaultProps: {
      title: "Ready to Deploy to Production?",
      subtitle: "Join hundreds of engineering teams building with minimal generative intelligence today.",
      buttonText: "Get Started Now ↗",
    },
    snippet: '<component type="slide:cta" title="Ready to Begin?" subtitle="Start your journey" buttonText="Launch" />',
    jsonSnippet: JSON.stringify({ type: "slide:cta", title: "Ready to Begin?", subtitle: "Start your journey", buttonText: "Launch" }, null, 2),
  },

  /* =========================================================================
     DATA & CARDS
     ========================================================================= */
  {
    id: "metrics",
    name: "KPI Metrics Dashboard Grid",
    type: "metrics",
    category: "data",
    description: "Grid of key performance metrics with large tabular numbers, trend arrows, and hints.",
    tags: ["metrics", "kpi", "numbers", "stats", "dashboard"],
    defaultProps: {
      items: [
        { label: "Daily Active Users", value: "48,290", delta: "+14.2%", hint: "vs last 7 days" },
        { label: "Median Response", value: "32ms", delta: "-4.5ms", hint: "p50 latency" },
        { label: "Token Generation", value: "1.4B", delta: "+28%", hint: "tokens/mo" },
      ],
    },
    snippet: '<component type="metrics" items=\'[{"label":"Users","value":"48K","delta":"+14%"},{"label":"Latency","value":"32ms"}]\' />',
    jsonSnippet: JSON.stringify({ type: "metrics", items: [{ label: "Users", value: "48K", delta: "+14%" }, { label: "Latency", value: "32ms" }] }, null, 2),
  },
  {
    id: "table",
    name: "Interactive Data Table",
    type: "table",
    category: "data",
    description: "Sortable, searchable data table with clean hairline borders and numerical alignment.",
    tags: ["table", "grid", "data", "rows", "columns", "csv"],
    defaultProps: {
      headers: ["Cluster ID", "Region", "Nodes", "Status", "P99 (ms)"],
      rows: [
        ["cluster-east-01", "us-east-1", 16, "Healthy", 24],
        ["cluster-west-04", "us-west-2", 32, "Healthy", 28],
        ["cluster-eu-02", "eu-central-1", 12, "Degraded", 65],
        ["cluster-apac-01", "ap-northeast-1", 24, "Healthy", 31],
      ],
    },
    snippet: '<component type="table" headers=\'["Name","Status","Value"]\' rows=\'[["A","OK",10],["B","OK",20]]\' />',
    jsonSnippet: JSON.stringify({ type: "table", headers: ["Name", "Status", "Value"], rows: [["A", "OK", 10], ["B", "OK", 20]] }, null, 2),
  },
  {
    id: "switcher",
    name: "Segmented View Switcher",
    type: "switcher",
    category: "layout",
    description: "Concentric pill switcher that renders different content views dynamically.",
    tags: ["switcher", "tabs", "view", "toggle", "segments"],
    defaultProps: {
      tabs: [
        { label: "Overview", content: "Platform overview and key architectural milestones." },
        { label: "Telemetry", content: "Live cluster health and real-time inference statistics." },
        { label: "Settings", content: "Global workspace configuration and sandbox permissions." },
      ],
    },
    snippet: '<component type="switcher" tabs=\'[{"label":"Tab 1","content":"Text 1"},{"label":"Tab 2","content":"Text 2"}]\' />',
    jsonSnippet: JSON.stringify({ type: "switcher", tabs: [{ label: "Tab 1", content: "Text 1" }, { label: "Tab 2", content: "Text 2" }] }, null, 2),
  },
  {
    id: "accordion",
    name: "Collapsible Accordion",
    type: "accordion",
    category: "layout",
    description: "Vertical accordion sections for progressive disclosure of complex information.",
    tags: ["accordion", "collapse", "expand", "disclosure", "faq"],
    defaultProps: {
      items: [
        { title: "How does partial streaming JSON repair work?", content: "The streaming parser continuously balances unterminated braces and quotes so UI components render smoothly during token generation without flickering." },
        { title: "How are linked form submissions handled?", content: "All inputs in a form record state locally until the user clicks Submit, sending the entire structured JSON answers payload back to the conversation." },
      ],
    },
    snippet: '<component type="accordion" items=\'[{"title":"FAQ 1","content":"Details here"}]\' />',
    jsonSnippet: JSON.stringify({ type: "accordion", items: [{ title: "FAQ 1", content: "Details here" }] }, null, 2),
  },
  {
    id: "callout",
    name: "Status Notice Callout",
    type: "callout",
    category: "layout",
    description: "Minimalist alert, tip, or warning banner without garish colored stripes.",
    tags: ["callout", "alert", "notice", "info", "warning"],
    defaultProps: {
      kind: "info",
      title: "Model Checkpoint Verified",
      text: "Weights successfully calibrated. All unit tests passed with 0 precision divergence.",
    },
    snippet: '<component type="callout" kind="info" title="Notice" text="Information text" />',
    jsonSnippet: JSON.stringify({ type: "callout", kind: "info", title: "Notice", text: "Information text" }, null, 2),
  },
];

/**
 * Unified Component Search Engine
 * Searches across name, type, description, and tags with simple keywords.
 * If query is empty, "all", or "*", returns all available components.
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

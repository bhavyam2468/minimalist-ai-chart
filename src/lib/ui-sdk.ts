/**
 * UI Component SDK
 * Programmatic interface for constructing, searching, and serializing Generative UI components.
 */

import { COMPONENT_CATALOG, UIComponentDef, searchComponents, getComponentDef } from "./ui-library";

export interface ComponentBuilder<T = Record<string, any>> {
  type: string;
  props: T;
  toTag: () => string;
  toJson: () => string;
}

function createBuilder<T extends Record<string, any>>(type: string, props: T): ComponentBuilder<T> {
  return {
    type,
    props,
    toTag: () => {
      const attrs = Object.entries(props)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => {
          if (typeof v === "object") {
            return `${k}='${JSON.stringify(v)}'`;
          }
          return `${k}="${String(v)}"`;
        })
        .join(" ");
      return `<component type="${type}" ${attrs} />`;
    },
    toJson: () => JSON.stringify({ type, ...props }, null, 2),
  };
}

export const UI = {
  /**
   * Search component definitions by tag, query, or category.
   */
  search: searchComponents,

  /**
   * Get component metadata by type.
   */
  get: getComponentDef,

  /**
   * List all registered components.
   */
  list: () => COMPONENT_CATALOG,

  /**
   * Form Components (individual types)
   */
  slider: (props: {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    label?: string;
    icon?: string;
  }) => createBuilder("slider", { value: 50, min: 0, max: 100, unit: "%", ...props }),

  button: (props: {
    label: string;
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "pill";
    size?: "sm" | "md" | "lg";
    icon?: string;
    loading?: boolean;
    disabled?: boolean;
  }) => createBuilder("button", props),

  checkbox: (props: {
    label: string;
    description?: string;
    checked?: boolean;
    disabled?: boolean;
  }) => createBuilder("checkbox", props),

  radio: (props: {
    name?: string;
    value?: string;
    options: Array<{ id: string; label: string; description?: string }>;
  }) => createBuilder("radio", props),

  dropdown: (props: {
    label?: string;
    placeholder?: string;
    value?: string;
    options: Array<{ label: string; value: string }>;
    searchable?: boolean;
  }) => createBuilder("dropdown", props),

  switchToggle: (props: {
    label: string;
    description?: string;
    checked?: boolean;
  }) => createBuilder("switch", props),

  input: (props: {
    label?: string;
    placeholder?: string;
    value?: string;
    clearable?: boolean;
  }) => createBuilder("input", props),

  stepper: (props: {
    label?: string;
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
  }) => createBuilder("stepper", props),

  rating: (props: {
    value?: number;
    max?: number;
    label?: string;
  }) => createBuilder("rating", props),

  progress: (props: {
    value: number;
    max?: number;
    label?: string;
    unit?: string;
  }) => createBuilder("progress", props),

  /**
   * Data & Visualizations
   */
  chart: (props: {
    kind?: "line" | "area" | "bar" | "hbar" | "donut" | "pie" | "radar" | "gauge" | "funnel" | "heatmap" | "candlestick";
    title?: string;
    data: Array<{ label: string; value: number }>;
    unit?: string;
  }) => createBuilder("chart", props),

  math: (props: {
    fn?: string;
    title?: string;
    xmin?: number;
    xmax?: number;
    ymin?: number;
    ymax?: number;
    functions?: Array<{ expr: string; label?: string; color?: string }>;
    desmos?: string;
  }) => createBuilder("math", props),

  chemistry: (props: {
    smiles: string;
    title?: string;
    caption?: string;
  }) => createBuilder("chemistry", props),

  switcher: (props: {
    tabs: Array<{ label: string; content: any }>;
  }) => createBuilder("switcher", props),

  metrics: (props: {
    items: Array<{ label: string; value: string | number; delta?: string }>;
  }) => createBuilder("metrics", props),

  question: (props: {
    id: string;
    question: string;
    options: Array<{ id: string; label: string; description?: string }>;
    allowCustom?: boolean;
    skipButton?: boolean;
  }) => createBuilder("question", props),
};

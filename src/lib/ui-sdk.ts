/**
 * UI Component SDK
 * Programmatic interface for constructing, searching, and serializing
 * fundamental composable Generative UI blocks.
 */

import { COMPONENT_CATALOG, searchComponents, getComponentDef } from "./ui-library";

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
  search: searchComponents,
  get: getComponentDef,
  list: () => COMPONENT_CATALOG,

  /**
   * Layout & Containers (Gamma-inspired liquid cards and nestable grids)
   */
  card: (props: {
    title?: string;
    subtitle?: string;
    badge?: string;
    variant?: "default" | "outline" | "glass" | "tint";
    state?: Record<string, any>;
    tick?: number;
    onTick?: string;
    blocks?: any[];
  }) => createBuilder("card", props),

  grid: (props: {
    cols?: number;
    gap?: string | number;
    blocks?: any[];
  }) => createBuilder("grid", { cols: 2, ...props }),

  /**
   * Typography & Content
   */
  text: (props: {
    text: string;
    variant?: "title" | "sub" | "kicker" | "code" | "body";
    align?: "left" | "center" | "right";
  }) => createBuilder("text", props),

  badge: (props: {
    text: string;
    color?: "default" | "accent" | "ok" | "warn" | "danger" | "faint";
  }) => createBuilder("badge", props),

  divider: () => createBuilder("divider", {}),

  /**
   * Data & Visualizations
   */
  metric: (props: {
    label: string;
    value: string | number;
    delta?: string;
    sub?: string;
  }) => createBuilder("metric", props),

  chart: (props: {
    kind?: "line" | "area" | "bar" | "hbar" | "donut" | "pie" | "radar" | "gauge" | "candlestick";
    title?: string;
    data: Array<any>;
    unit?: string;
  }) => createBuilder("chart", props),

  table: (props: {
    headers: string[];
    rows: (string | number)[][];
  }) => createBuilder("table", props),

  math: (props: {
    fn: string;
    title?: string;
    xmin?: number;
    xmax?: number;
    ymin?: number;
    ymax?: number;
  }) => createBuilder("math", props),

  chemistry: (props: {
    smiles?: string;
    molecule?: string;
    title?: string;
  }) => createBuilder("chemistry", props),

  /**
   * Interactive Controls & Reactive Bindings
   */
  slider: (props: {
    label: string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    bind?: string;
    value?: number;
  }) => createBuilder("slider", { min: 0, max: 100, step: 1, ...props }),

  button: (props: {
    text: string;
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    onClick?: string;
    submitToChat?: string;
    action?: "copy" | "reset";
  }) => createBuilder("button", props),

  input: (props: {
    label?: string;
    placeholder?: string;
    type?: "text" | "number";
    bind?: string;
    value?: any;
  }) => createBuilder("input", props),

  dropdown: (props: {
    label?: string;
    options: Array<string | { label: string; value: any }>;
    bind?: string;
    value?: any;
  }) => createBuilder("dropdown", props),

  switchToggle: (props: {
    label: string;
    description?: string;
    bind?: string;
    checked?: boolean;
  }) => createBuilder("switch", props),

  checkbox: (props: {
    label: string;
    description?: string;
    bind?: string;
    checked?: boolean;
  }) => createBuilder("checkbox", props),

  progress: (props: {
    label?: string;
    value: number | string;
    max?: number;
    unit?: string;
  }) => createBuilder("progress", props),
};

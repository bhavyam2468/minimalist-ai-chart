import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  name?: string;
  silent?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!this.props.silent) {
      console.warn(`[ErrorBoundary:${this.props.name || "generic"}]`, error, errorInfo);
    }
  }

  public reset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error || new Error("Unknown error"), this.reset);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          className="error-boundary-fallback"
          style={{
            padding: "8px 12px",
            background: "var(--surface-2)",
            border: "1px solid var(--line-soft)",
            borderRadius: "var(--r-sm)",
            fontSize: "var(--fs-xs)",
            color: "var(--text-dim)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            maxWidth: "100%",
            margin: "4px 0",
          }}
        >
          <span style={{ color: "var(--warn)", display: "inline-flex", alignItems: "center" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <span>{this.props.name ? `${this.props.name} preview unavailable` : "Content unavailable"}</span>
          <button
            type="button"
            onClick={this.reset}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line-soft)",
              borderRadius: "var(--r-xs)",
              padding: "2px 7px",
              height: "20px",
              fontSize: "10px",
              cursor: "pointer",
              color: "var(--text)",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

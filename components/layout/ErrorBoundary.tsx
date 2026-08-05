"use client";
// ─────────────────────────────────────────────────────────────────────────────
// COSMOS-5H1 — Error Boundary Component
// Catches render errors in child components and shows a themed fallback.
// Usage: <ErrorBoundary><YourComponent /></ErrorBoundary>
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  label?: string; // optional label for the broken section
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="rounded-2xl flex flex-col items-center justify-center gap-3 p-8 text-center"
          style={{
            background: "rgba(10,0,20,0.7)",
            border: "1px solid rgba(239,68,68,0.25)",
            minHeight: 160,
          }}
        >
          <span className="text-3xl">⚠️</span>
          <p className="text-red-400/80 text-sm font-semibold">
            {this.props.label ?? "Module"} failed to render
          </p>
          <p className="text-white/30 text-xs max-w-xs">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleRetry}
            className="mt-1 px-4 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.4)",
              color: "#c4b5fd",
            }}
          >
            ↺ Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

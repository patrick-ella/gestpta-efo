import React, { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  tabName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[ErrorBoundary] Crash in "${this.props.tabName}":`,
      error,
      info.componentStack
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center rounded-lg border border-destructive/30 bg-destructive/5 m-4 space-y-3">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="text-sm font-bold text-destructive">
            Une erreur s'est produite
            {this.props.tabName ? ` dans l'onglet "${this.props.tabName}"` : ""}
          </h3>
          <p className="text-xs text-muted-foreground">
            {this.state.error?.message || "Erreur inattendue"}
          </p>
          <Button size="sm" variant="outline" onClick={this.handleReset}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Réessayer
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

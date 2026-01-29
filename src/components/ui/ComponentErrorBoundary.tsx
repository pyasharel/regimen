import React from 'react';

interface ComponentErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

interface ComponentErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Lightweight error boundary for wrapping individual components.
 * Prevents a single component crash from taking down the entire screen.
 */
export class ComponentErrorBoundary extends React.Component<
  ComponentErrorBoundaryProps,
  ComponentErrorBoundaryState
> {
  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ComponentErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const componentName = this.props.name || 'Unknown';
    console.error(`[ComponentErrorBoundary] ${componentName} crashed:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise render a minimal error message
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }
      
      return (
        <div className="text-muted-foreground text-sm p-4 text-center">
          Unable to load {this.props.name || 'component'}
        </div>
      );
    }

    return this.props.children;
  }
}

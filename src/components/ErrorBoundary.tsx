import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    // Clear potentially corrupt localStorage
    try {
      localStorage.clear();
      console.log('[ErrorBoundary] Cleared localStorage');
    } catch (e) {
      console.error('[ErrorBoundary] Failed to clear localStorage:', e);
    }
    
    // Reload the app
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-sm">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Something went wrong
              </h2>
              <p className="text-sm text-muted-foreground">
                We're sorry for the inconvenience. The app encountered an unexpected error.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={this.handleRetry}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                onClick={this.handleReset}
                variant="destructive"
                className="w-full"
              >
                Reset App
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Reset will clear your local data and refresh the app.
                Your account data is safely stored in the cloud.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

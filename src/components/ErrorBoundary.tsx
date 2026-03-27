import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center mb-8 animate-in zoom-in duration-500">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground mb-4">Something went wrong</h1>
          <p className="text-muted-foreground max-w-md mb-10 leading-relaxed">
            The application encountered an unexpected error. Don't worry, your data is safe in local storage.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <RefreshCw className="w-4 h-4" />
              Reload App
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 px-8 py-3 bg-muted text-foreground rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-muted/80 transition-all"
            >
              <Home className="w-4 h-4" />
              Back Home
            </button>
          </div>
          {this.state.error && (
            <div className="mt-12 p-4 bg-muted/30 rounded-xl border border-border max-w-2xl w-full overflow-hidden text-left">
              <p className="text-[10px] font-mono text-muted-foreground break-all">
                {this.state.error.toString()}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Settings, Home } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardContent } from './ui/Card';
import { errorHandler, MisinfoGuardError, ERROR_CODES } from '../utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Handle the error through our error handler
    const misinfoError = errorHandler.handle(error, 'ErrorBoundary');
    
    // Call the onError prop if provided
    this.props.onError?.(error, errorInfo);

    // Log additional context
    console.error('ErrorBoundary caught an error:', {
      error: misinfoError.toJSON(),
      errorInfo,
      componentStack: errorInfo.componentStack,
    });
  }

  handleRetry = () => {
    const { error, retryCount } = this.state;
    
    if (error && error instanceof MisinfoGuardError) {
      const isRecoverable = errorHandler.isRecoverable(error);
      
      if (isRecoverable && retryCount < 3) {
        const delay = errorHandler.getRetryDelay(error, retryCount + 1);
        
        this.setState({ retryCount: retryCount + 1 });
        
        this.retryTimeoutId = setTimeout(() => {
          this.setState({
            hasError: false,
            error: null,
            errorId: null,
          });
        }, delay);
        
        return;
      }
    }

    // Immediate retry for non-recoverable errors or when retry limit reached
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleOpenSettings = () => {
    // This would typically open the settings page
    // For now, we'll just retry
    this.handleRetry();
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId, retryCount } = this.state;
      const misinfoError = error instanceof MisinfoGuardError ? error : null;
      const isRecoverable = misinfoError ? errorHandler.isRecoverable(misinfoError) : false;
      const userMessage = error ? errorHandler.getUserFriendlyMessage(error) : 'An unexpected error occurred';

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-danger-100 dark:bg-danger-900/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-danger-600 dark:text-danger-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Oops! Something went wrong
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {userMessage}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error details for development */}
              {import.meta.env.DEV && error && (
                <details className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 font-mono">
                    <div><strong>Error:</strong> {error.message}</div>
                    {misinfoError && (
                      <>
                        <div><strong>Code:</strong> {misinfoError.code}</div>
                        <div><strong>Context:</strong> {misinfoError.context || 'Unknown'}</div>
                      </>
                    )}
                    <div><strong>Error ID:</strong> {errorId}</div>
                    {error.stack && (
                      <div className="mt-2">
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap text-xs">
                          {error.stack.split('\n').slice(0, 5).join('\n')}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Retry information */}
              {isRecoverable && retryCount > 0 && (
                <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 rounded-lg p-3">
                  <p className="text-sm text-warning-800 dark:text-warning-300">
                    Retry attempt {retryCount}/3. The error might be temporary.
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={this.handleRetry}
                  variant="primary"
                  className="w-full"
                  icon={<RefreshCw className="w-4 h-4" />}
                >
                  {isRecoverable && retryCount < 3 ? 'Retry' : 'Try Again'}
                </Button>

                {misinfoError?.code === ERROR_CODES.API_KEY_MISSING || 
                 misinfoError?.code === ERROR_CODES.API_KEY_INVALID ? (
                  <Button
                    onClick={this.handleOpenSettings}
                    variant="secondary"
                    className="w-full"
                    icon={<Settings className="w-4 h-4" />}
                  >
                    Configure Settings
                  </Button>
                ) : null}

                <Button
                  onClick={this.handleReload}
                  variant="ghost"
                  className="w-full"
                  icon={<Home className="w-4 h-4" />}
                >
                  Reload Extension
                </Button>
              </div>

              {/* Help text */}
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  If the problem persists, try reloading the extension or check your API configuration.
                </p>
                {errorId && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Error ID: {errorId}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: string) => {
    const misinfoError = errorHandler.handle(error, context);
    
    // In a real app, you might want to show a toast or modal here
    console.error('Handled error:', misinfoError.toJSON());
    
    return misinfoError;
  }, []);

  return { handleError };
}

import React, { Component, ErrorInfo } from 'react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: string; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
    window.electronAPI?.send('log:error', `UI Error: ${error.message}\n${info.componentStack}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <pre>{this.state.error}</pre>
          <button onClick={() => this.setState({ hasError: false, error: '' })}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-primary)',
          padding: '2rem'
        }}>
          <div style={{
            maxWidth: '600px',
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '2rem',
            border: '2px solid var(--accent-error)',
            textAlign: 'center'
          }}>
            <AlertTriangle 
              size={48} 
              color="var(--accent-error)" 
              style={{ marginBottom: '1rem' }}
            />
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            {this.state.error && (
              <details style={{ 
                marginBottom: '1.5rem', 
                textAlign: 'left',
                background: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: '6px'
              }}>
                <summary style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
                  Error details
                </summary>
                <pre style={{ 
                  color: 'var(--accent-error)', 
                  fontSize: '0.85rem',
                  marginTop: '0.5rem',
                  overflow: 'auto'
                }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button 
              className="btn btn-primary"
              onClick={this.handleReset}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={16} />
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


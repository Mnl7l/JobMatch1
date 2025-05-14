import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
    console.log('ErrorBoundary initialized');
  }

  static getDerivedStateFromError(error) {
    console.log('ErrorBoundary caught an error:', error.message);
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Optional: Log to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          border: '1px solid #f44336',
          borderRadius: '5px',
          backgroundColor: '#ffebee',
          maxWidth: '800px',
          margin: '40px auto'
        }}>
          <h2 style={{ color: '#d32f2f' }}>Something went wrong</h2>
          <p>We're sorry, but there was an error in the application.</p>
          
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '8px 16px',
              backgroundColor: '#1e6091',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '15px'
            }}
          >
            Reload Application
          </button>
          
          <details style={{ marginTop: '15px', cursor: 'pointer' }}>
            <summary>View error details</summary>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '10px', 
              overflow: 'auto',
              marginTop: '10px',
              borderRadius: '4px',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              {this.state.error && this.state.error.toString()}
            </pre>
            {this.state.errorInfo && (
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '10px', 
                overflow: 'auto',
                marginTop: '10px',
                borderRadius: '4px',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                {this.state.errorInfo.componentStack}
              </pre>
            )}
          </details>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
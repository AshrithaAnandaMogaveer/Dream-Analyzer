import React from 'react';
import { motion } from 'framer-motion';
import { FaExclamationTriangle, FaHome, FaSyncAlt } from 'react-icons/fa';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // You can integrate with error reporting services here
      console.error('Production error:', { error, errorInfo });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { retryCount } = this.state;
      const isMaxRetries = retryCount >= 3;

      return (
        <motion.div
          className="error-boundary"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="error-content">
            <motion.div
              className="error-icon"
              animate={{ 
                rotate: [0, -10, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3
              }}
            >
              <FaExclamationTriangle />
            </motion.div>
            
            <h2>Oops! Something went wrong</h2>
            <p className="error-message">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="error-actions">
              {!isMaxRetries && (
                <button onClick={this.handleRetry} className="retry-button">
                  <FaSyncAlt /> Try Again
                </button>
              )}
              
              <motion.button
                className="error-btn secondary"
                onClick={this.handleGoHome}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaHome />
                Go Home
              </motion.button>
              
              <motion.button
                className="error-btn secondary"
                onClick={() => window.location.reload()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaSyncAlt />
                Refresh Page
              </motion.button>
            </div>
            
            {isMaxRetries && (
              <p className="retry-limit">
                Maximum retry attempts reached. Please refresh the page or contact support.
              </p>
            )}
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
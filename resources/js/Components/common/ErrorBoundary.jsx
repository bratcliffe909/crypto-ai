/**
 * ErrorBoundary Component
 * React error boundary for catching and handling component errors gracefully
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Button } from 'react-bootstrap';
import { BsExclamationTriangleFill, BsArrowClockwise } from 'react-icons/bs';

/**
 * Default error fallback component
 */
const DefaultErrorFallback = ({ error, resetError, componentStack }) => (
  <Alert variant="danger" className="m-3">
    <div className="d-flex align-items-start">
      <BsExclamationTriangleFill className="text-danger me-2 mt-1" size={20} />
      <div className="flex-grow-1">
        <Alert.Heading className="h6 mb-2">Something went wrong</Alert.Heading>
        <p className="mb-3">
          An error occurred while rendering this component. Please try refreshing or contact support if the problem persists.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-3">
            <summary className="btn btn-sm btn-outline-secondary mb-2">
              Show Error Details
            </summary>
            <pre className="small text-muted bg-light p-2 rounded">
              <strong>Error:</strong> {error.message}
              {componentStack && (
                <>
                  <br />
                  <strong>Component Stack:</strong>
                  {componentStack}
                </>
              )}
            </pre>
          </details>
        )}
        
        <Button 
          variant="outline-danger" 
          size="sm" 
          onClick={resetError}
          className="d-flex align-items-center"
        >
          <BsArrowClockwise className="me-2" />
          Try Again
        </Button>
      </div>
    </div>
  </Alert>
);

DefaultErrorFallback.propTypes = {
  error: PropTypes.object.isRequired,
  resetError: PropTypes.func.isRequired,
  componentStack: PropTypes.string,
};

DefaultErrorFallback.defaultProps = {
  componentStack: null,
};

/**
 * React Error Boundary Class Component
 * Catches JavaScript errors anywhere in the child component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
    
    this.resetError = this.resetError.bind(this);
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    this.logError(error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    // If we recovered from an error, call onReset
    if (prevState.hasError && !this.state.hasError && this.props.onReset) {
      this.props.onReset();
    }
  }

  logError(error, errorInfo) {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.props.userId || 'anonymous',
      buildVersion: process.env.REACT_APP_VERSION || 'unknown',
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Full Report:', errorReport);
      console.groupEnd();
    }

    // Send to error reporting service if configured
    if (this.props.onLog) {
      try {
        this.props.onLog(errorReport);
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }

    // Log to browser's error reporting if available
    if (window.reportError) {
      window.reportError(error);
    }
  }

  resetError() {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });

    // Call onReset prop if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, isolate } = this.props;

    if (hasError) {
      // Custom fallback component
      if (typeof fallback === 'function') {
        return fallback(error, this.resetError, errorInfo?.componentStack);
      }

      // JSX fallback
      if (React.isValidElement(fallback)) {
        return React.cloneElement(fallback, {
          error,
          resetError: this.resetError,
          componentStack: errorInfo?.componentStack,
        });
      }

      // Default fallback
      return (
        <DefaultErrorFallback
          error={error}
          resetError={this.resetError}
          componentStack={errorInfo?.componentStack}
        />
      );
    }

    // Wrap children in isolation div if requested
    if (isolate) {
      return (
        <div 
          className="error-boundary-isolation"
          style={{ isolation: 'isolate' }}
        >
          {children}
        </div>
      );
    }

    return children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.element,
  ]),
  onError: PropTypes.func,
  onReset: PropTypes.func,
  onLog: PropTypes.func,
  userId: PropTypes.string,
  isolate: PropTypes.bool,
};

ErrorBoundary.defaultProps = {
  fallback: null,
  onError: null,
  onReset: null,
  onLog: null,
  userId: null,
  isolate: false,
};

/**
 * Higher-order component for wrapping components with error boundary
 * @param {React.Component} Component - Component to wrap
 * @param {Object} errorBoundaryProps - Props to pass to ErrorBoundary
 * @returns {React.Component} Wrapped component
 */
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = React.forwardRef((props, ref) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} ref={ref} />
    </ErrorBoundary>
  ));

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

/**
 * Hook for using error boundary functionality in functional components
 * Note: This doesn't provide the same error catching capabilities as the class-based ErrorBoundary
 * It's mainly for manual error handling and reporting
 */
export const useErrorHandler = (onError) => {
  const handleError = React.useCallback((error, errorInfo = {}) => {
    // Log error
    console.error('Manual error report:', error, errorInfo);
    
    // Call onError callback
    if (onError) {
      onError(error, errorInfo);
    }

    // Report to error service if available
    if (window.reportError) {
      window.reportError(error);
    }
  }, [onError]);

  return handleError;
};

export default ErrorBoundary;
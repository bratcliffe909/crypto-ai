/**
 * Toast notification system for crypto-graph application
 * Provides context-based toast notifications with Bootstrap styling
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { BsCheckCircleFill, BsExclamationTriangleFill, BsInfoCircleFill, BsXCircleFill } from 'react-icons/bs';

// Toast context
const ToastContext = createContext();

/**
 * Custom hook to use toast notifications
 * @returns {Object} Toast functions
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * Toast notification component
 */
const ToastNotification = React.memo(({ id, type, title, message, onClose, autoHide, delay }) => {
  const icons = {
    success: BsCheckCircleFill,
    error: BsXCircleFill,
    warning: BsExclamationTriangleFill,
    info: BsInfoCircleFill,
  };

  const variants = {
    success: 'success',
    error: 'danger',
    warning: 'warning',
    info: 'info',
  };

  const IconComponent = icons[type] || BsInfoCircleFill;

  return (
    <Toast
      onClose={() => onClose(id)}
      show={true}
      autohide={autoHide}
      delay={delay}
      bg={variants[type]}
      className="mb-2"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <Toast.Header closeButton={true} className="d-flex align-items-center">
        <IconComponent className="me-2" size={16} />
        <strong className="me-auto">{title}</strong>
      </Toast.Header>
      {message && (
        <Toast.Body className="text-white">
          {message}
        </Toast.Body>
      )}
    </Toast>
  );
});

ToastNotification.displayName = 'ToastNotification';

ToastNotification.propTypes = {
  id: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  autoHide: PropTypes.bool,
  delay: PropTypes.number,
};

ToastNotification.defaultProps = {
  message: '',
  autoHide: true,
  delay: 5000,
};

/**
 * Toast provider component that manages toast notifications
 */
const ToastProvider = ({ children, position = 'top-end', maxToasts = 5 }) => {
  const [toasts, setToasts] = useState([]);

  /**
   * Add a new toast notification
   * @param {Object} toast - Toast configuration
   */
  const addToast = useCallback(({
    type = 'info',
    title,
    message = '',
    autoHide = true,
    delay = 5000
  }) => {
    if (!title) {
      console.error('Toast title is required');
      return;
    }

    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast = { id, type, title, message, autoHide, delay };

    setToasts(prevToasts => {
      // Limit number of toasts
      const updatedToasts = [...prevToasts, newToast];
      return updatedToasts.slice(-maxToasts);
    });

    // Auto-remove toast after delay if not persistent
    if (autoHide) {
      setTimeout(() => {
        removeToast(id);
      }, delay);
    }

    return id;
  }, [maxToasts]);

  /**
   * Remove a toast notification
   * @param {string} id - Toast ID to remove
   */
  const removeToast = useCallback((id) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  /**
   * Clear all toast notifications
   */
  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  /**
   * Convenience methods for different toast types
   */
  const toastMethods = {
    success: useCallback((title, message, options = {}) => {
      return addToast({ type: 'success', title, message, ...options });
    }, [addToast]),

    error: useCallback((title, message, options = {}) => {
      return addToast({ 
        type: 'error', 
        title, 
        message, 
        autoHide: false, // Errors should be manually dismissed
        ...options 
      });
    }, [addToast]),

    warning: useCallback((title, message, options = {}) => {
      return addToast({ type: 'warning', title, message, delay: 7000, ...options });
    }, [addToast]),

    info: useCallback((title, message, options = {}) => {
      return addToast({ type: 'info', title, message, ...options });
    }, [addToast]),
  };

  const contextValue = {
    addToast,
    removeToast,
    clearAllToasts,
    ...toastMethods,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer 
        position={position}
        className="p-3"
        style={{ zIndex: 1060 }}
      >
        {toasts.map(toast => (
          <ToastNotification
            key={toast.id}
            {...toast}
            onClose={removeToast}
          />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
};

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
  position: PropTypes.oneOf([
    'top-start', 'top-center', 'top-end',
    'middle-start', 'middle-center', 'middle-end',
    'bottom-start', 'bottom-center', 'bottom-end'
  ]),
  maxToasts: PropTypes.number,
};

ToastProvider.defaultProps = {
  position: 'top-end',
  maxToasts: 5,
};

export default ToastProvider;
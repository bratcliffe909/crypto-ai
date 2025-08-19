import React from 'react';
import { Alert } from 'react-bootstrap';
import { BsExclamationTriangleFill } from 'react-icons/bs';

const ErrorAlert = ({ message, onRetry }) => {
  return (
    <Alert variant="warning" className="d-flex align-items-center mb-0">
      <BsExclamationTriangleFill className="me-2" />
      <span className="flex-grow-1">{message || 'Failed to load data'}</span>
      {onRetry && (
        <Alert.Link onClick={onRetry} className="ms-2">
          Retry
        </Alert.Link>
      )}
    </Alert>
  );
};

export default ErrorAlert;

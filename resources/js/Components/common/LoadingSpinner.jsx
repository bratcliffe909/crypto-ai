import React from 'react';
import { Spinner } from 'react-bootstrap';

const LoadingSpinner = ({ size = 'sm', className = '' }) => {
  return (
    <div className={`text-center py-4 ${className}`}>
      <Spinner animation="border" role="status" size={size}>
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
};

export default LoadingSpinner;

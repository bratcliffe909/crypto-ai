import React from 'react';
import { Spinner } from 'react-bootstrap';

const LoadingSpinner = ({ size = 'sm', className = '', fullScreen = false }) => {
  return (
    <div className={`text-center py-4 ${className} ${fullScreen ? 'fullScreen' : ''}`}>
      <Spinner animation="border" role="status" size={size}>
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
};

export default LoadingSpinner;

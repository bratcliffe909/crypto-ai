import React, { useEffect, useState } from 'react';
import { BsCircleFill } from 'react-icons/bs';
import { FaTrafficLight } from 'react-icons/fa';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

const SystemStatus = () => {
  const [status, setStatus] = useState({
    cache: 'unknown',
    api: 'unknown',
    details: {
      totalRequests: 0,
      cacheHits: 0,
      apiFailures: 0,
      rateLimits: 0,
      lastUpdated: null
    }
  });

  // Check system status every 30 seconds
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/crypto/system-status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch system status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return '#28a745'; // Green
      case 'degraded':
        return '#ffc107'; // Yellow
      case 'unhealthy':
        return '#dc3545'; // Red
      default:
        return '#6c757d'; // Gray
    }
  };

  const getStatusTooltip = () => {
    const { details } = status;
    const cacheRate = details.totalRequests > 0 
      ? Math.round((details.cacheHits / details.totalRequests) * 100) 
      : 0;
    
    return (
      <div>
        <strong>System Status</strong>
        <hr className="my-1" />
        <div>Cache: {status.cache}</div>
        <div>APIs: {status.api}</div>
        <hr className="my-1" />
        <div>Cache Hit Rate: {cacheRate}%</div>
        <div>API Failures: {details.apiFailures}</div>
        <div>Rate Limits: {details.rateLimits}</div>
        {details.lastUpdated && (
          <div className="mt-1">
            <small>Updated: {new Date(details.lastUpdated).toLocaleTimeString()}</small>
          </div>
        )}
      </div>
    );
  };

  const SingleLight = ({ status }) => {
    return (
      <BsCircleFill 
        size={12} 
        color={getStatusColor(status)}
        style={{ 
          filter: status === 'healthy' ? 'drop-shadow(0 0 3px rgba(40, 167, 69, 0.8))' : 
                  status === 'degraded' ? 'drop-shadow(0 0 3px rgba(255, 193, 7, 0.8))' : 
                  status === 'unhealthy' ? 'drop-shadow(0 0 3px rgba(220, 53, 69, 0.8))' : 'none'
        }}
      />
    );
  };

  return (
    <div className="d-flex align-items-center me-3">
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="system-status-tooltip">{getStatusTooltip()}</Tooltip>}
      >
        <div className="d-flex align-items-center gap-3" style={{ cursor: 'help' }}>
          <div className="d-flex align-items-center gap-1">
            <SingleLight status={status.cache} />
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>Cache</span>
          </div>
          <div className="d-flex align-items-center gap-1">
            <SingleLight status={status.api} />
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>API</span>
          </div>
        </div>
      </OverlayTrigger>
    </div>
  );
};

export default SystemStatus;
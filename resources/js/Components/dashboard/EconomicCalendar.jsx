import React, { useState } from 'react';
import { Card, Badge, Spinner, Alert, OverlayTrigger, Tooltip, ListGroup } from 'react-bootstrap';
import useApi from '../../hooks/useApi';

const EconomicCalendar = () => {
  const { data, loading, error, lastFetch } = useApi('/api/crypto/economic-calendar', 300000); // 5 minutes
  
  const getImpactBadge = (impact) => {
    switch (impact) {
      case 'high':
        return <Badge bg="danger">High</Badge>;
      case 'medium':
        return <Badge bg="warning">Medium</Badge>;
      case 'low':
        return <Badge bg="secondary">Low</Badge>;
      default:
        return null;
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    // Check if it's tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    // Otherwise return formatted date (e.g., "Jul 30")
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  const getDaysUntil = (dateString) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day';
    if (diffDays < 0) return 'Past';
    return `${diffDays} days`;
  };
  
  const getCountryFlag = (country) => {
    const flags = {
      'US': '🇺🇸',
      'EU': '🇪🇺',
      'UK': '🇬🇧',
      'JP': '🇯🇵',
      'CN': '🇨🇳',
      'Global': '🌍'
    };
    return flags[country] || '🏳️';
  };
  
  const timeSince = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            Economic Calendar
          </h5>
          {lastFetch && (
            <small className="text-muted">Updated {timeSince(lastFetch)}</small>
          )}
        </div>
      </Card.Header>
      <Card.Body>
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Loading events...</p>
          </div>
        )}
        
        {error && (
          <Alert variant="danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}
        
        {data && !loading && !error && (
          <>
            {data.events && data.events.length > 0 ? (
              <ListGroup variant="flush">
                {data.events.slice(0, 10).map((event, index) => (
                  <ListGroup.Item key={index} className="px-0 py-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center mb-1">
                          <strong>
                            {event.event}
                          </strong>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {event.impact && (
                            <span>
                              <small className="text-muted me-1">Impact:</small>
                              {getImpactBadge(event.impact)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-end ms-2">
                        <div className="text-muted">
                          <strong>{formatDate(event.date)}</strong>
                        </div>
                        <small className="text-muted">
                          {getDaysUntil(event.date)}
                        </small>
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            ) : (
              <div className="text-center text-muted py-4">
                <i className="bi bi-calendar-x me-2"></i>
                No upcoming events
              </div>
            )}
            
            {data.events && data.events.length > 10 && (
              <div className="text-center mt-3">
                <small className="text-muted">
                  Showing 10 of {data.count} events
                </small>
              </div>
            )}
            
            <div className="mt-3 text-center">
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                FOMC meetings and major economic events
              </small>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default EconomicCalendar;
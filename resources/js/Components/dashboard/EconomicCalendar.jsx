import React, { useState } from 'react';
import { Card, Badge, Spinner, Alert, OverlayTrigger, Tooltip, ListGroup } from 'react-bootstrap';
import { BsCalendar3, BsInfoCircleFill } from 'react-icons/bs';
import useApi from '../../hooks/useApi';
import TimeAgo from '../common/TimeAgo';
import TooltipComponent from '../common/Tooltip';
import { formatDateSpecial } from '../../utils/timeUtils';

const EconomicCalendar = () => {
  // Get date range from start of current year to end of next year
  const today = new Date();
  const startDate = new Date(today.getFullYear(), 0, 1); // January 1st of current year
  const endDate = new Date(today.getFullYear() + 1, 11, 31); // December 31st of next year
  
  const params = {
    from: startDate.toISOString().split('T')[0],
    to: endDate.toISOString().split('T')[0]
  };
  
  const { data, loading, error, lastFetch } = useApi('/api/crypto/economic-calendar', { 
    params,
    refetchInterval: 300000 // 5 minutes
  });
  
  const getImpactBadge = (impact) => {
    switch (impact) {
      case 'high':
        return <Badge bg="danger">High</Badge>;
      case 'medium':
        return <Badge bg="warning" text="dark">Medium</Badge>;
      case 'low':
        return <Badge bg="secondary">Low</Badge>;
      default:
        return null;
    }
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
  

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <h5 className="mb-0">Economic Calendar</h5>
            <TooltipComponent content="Shows upcoming economic events that may impact crypto markets. FOMC meetings and major economic announcements often trigger market volatility. High impact events (red) typically cause the most significant price movements.">
              <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
            </TooltipComponent>
          </div>
          {lastFetch && <TimeAgo date={lastFetch} />}
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
                {data.events
                  .filter(event => {
                    const eventDate = new Date(event.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return eventDate >= today;
                  })
                  .slice(0, 10)
                  .map((event, index) => (
                  <ListGroup.Item key={index} className="px-0 py-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="flex-grow-1">
                        <div className="mb-1">
                          <strong>
                            {event.event}
                          </strong>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <small className="text-muted d-flex align-items-center">
                            <BsCalendar3 size={12} className="me-1" />
                            {formatDateSpecial(event.date)}
                          </small>
                          <small className="text-muted">
                            • {getDaysUntil(event.date)}
                          </small>
                        </div>
                      </div>
                      <div className="ms-2">
                        {event.impact && getImpactBadge(event.impact)}
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
            
            {(() => {
              const futureEvents = data.events?.filter(event => {
                const eventDate = new Date(event.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return eventDate >= today;
              }) || [];
              
              return futureEvents.length > 10 && (
                <div className="text-center mt-3">
                  <small className="text-muted">
                    Showing 10 of {futureEvents.length} upcoming events
                  </small>
                </div>
              );
            })()}
            
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
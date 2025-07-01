import React, { useState } from 'react';
import { BsCalendar3, BsCircleFill } from 'react-icons/bs';
import useApi from '../../../hooks/useApi';
import LoadingSpinner from '../../common/LoadingSpinner';
import TimeAgo from '../../common/TimeAgo';

const MobileEconomicCalendar = () => {
  const { data, loading, error, lastUpdated } = useApi('/api/crypto/economic-calendar');
  const [expandedEvents, setExpandedEvents] = useState({});
  
  const events = data?.events || [];
  
  // Group events by date
  const groupedEvents = events.reduce((groups, event) => {
    const date = new Date(event.date).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
    
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {});
  
  const getImpactColor = (impact) => {
    switch (impact?.toLowerCase()) {
      case 'high': return 'var(--bs-danger)';
      case 'medium': return 'var(--bs-warning)';
      case 'low': return 'var(--bs-success)';
      default: return 'var(--bs-secondary)';
    }
  };
  
  const getImpactLabel = (impact) => {
    switch (impact?.toLowerCase()) {
      case 'high': return 'High Impact';
      case 'medium': return 'Medium Impact';
      case 'low': return 'Low Impact';
      default: return 'Impact Unknown';
    }
  };
  
  const toggleEvent = (eventId) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };
  
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <LoadingSpinner />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center text-danger p-4">
        <p>Failed to load economic calendar</p>
        <small>{error}</small>
      </div>
    );
  }
  
  return (
    <div className="mobile-economic-calendar">
      <div className="calendar-header">
        <h5 className="mb-0 d-flex align-items-center">
          <BsCalendar3 className="me-2" />
          Economic Calendar
        </h5>
        {lastUpdated && <TimeAgo date={lastUpdated} />}
      </div>
      
      <div className="calendar-content">
        {Object.entries(groupedEvents).map(([date, dateEvents]) => (
          <div key={date} className="date-group">
            <div className="date-header">{date}</div>
            
            {dateEvents.map((event, index) => {
              const eventId = `${date}-${index}`;
              const isExpanded = expandedEvents[eventId];
              
              return (
                <div 
                  key={eventId} 
                  className="event-item"
                  onClick={() => toggleEvent(eventId)}
                >
                  <div className="event-main">
                    <BsCircleFill 
                      size={8} 
                      color={getImpactColor(event.impact)}
                      className="impact-indicator"
                    />
                    
                    <div className="event-info">
                      <div className="event-title">{event.event}</div>
                      {event.country && (
                        <div className="event-meta">
                          <span className="event-country">{event.country}</span>
                          {event.time && (
                            <span className="event-time">{event.time}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="event-details">
                      <div className="detail-item">
                        <span className="detail-label">Impact:</span>
                        <span className="detail-value" style={{ color: getImpactColor(event.impact) }}>
                          {getImpactLabel(event.impact)}
                        </span>
                      </div>
                      
                      {event.forecast && (
                        <div className="detail-item">
                          <span className="detail-label">Forecast:</span>
                          <span className="detail-value">{event.forecast}</span>
                        </div>
                      )}
                      
                      {event.previous && (
                        <div className="detail-item">
                          <span className="detail-label">Previous:</span>
                          <span className="detail-value">{event.previous}</span>
                        </div>
                      )}
                      
                      {event.actual && (
                        <div className="detail-item">
                          <span className="detail-label">Actual:</span>
                          <span className="detail-value">{event.actual}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        
        {events.length === 0 && (
          <div className="text-center text-muted p-4">
            <p>No economic events scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileEconomicCalendar;
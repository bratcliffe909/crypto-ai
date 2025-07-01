import React, { useState } from 'react';
import { BsCalendar3, BsClock } from 'react-icons/bs';
import useApi from '../../../hooks/useApi';
import LoadingSpinner from '../../common/LoadingSpinner';
import TimeAgo from '../../common/TimeAgo';

const MobileEconomicCalendar = () => {
  const { data, loading, error, lastUpdated } = useApi('/api/crypto/economic-calendar');
  const [expandedEvents, setExpandedEvents] = useState({});
  
  const events = data?.events || [];
  
  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const getDaysFromNow = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return null;
    if (diffDays === 1) return 'tomorrow';
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    return `in ${diffDays} days`;
  };
  
  // Group events by date using the formatted date
  const groupedEvents = events.reduce((groups, event) => {
    const dateKey = formatEventDate(event.date);
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: event.date,
        events: []
      };
    }
    groups[dateKey].events.push(event);
    return groups;
  }, {});
  
  const getImpactColor = (impact) => {
    switch (impact?.toLowerCase()) {
      case 'high': return 'var(--bs-danger)';
      case 'medium': return 'var(--bs-warning)';
      case 'low': return 'var(--bs-gray-500)';
      default: return 'var(--bs-secondary)';
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
        {Object.entries(groupedEvents).map(([dateLabel, dateGroup]) => {
          const dateObj = new Date(dateGroup.date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
          const dayNumber = dateObj.getDate();
          const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
          
          const daysFromNow = getDaysFromNow(dateGroup.date);
          
          return (
            <div key={dateLabel} className="date-group">
              <div className="date-divider">
                <div className="date-info">
                  <div>
                    <span className="date-label">{dateLabel === 'Today' || dateLabel === 'Tomorrow' ? dateLabel : dayName}</span>
                    <span className="date-full">{dayNumber} {monthName}</span>
                  </div>
                  {daysFromNow && <span className="days-from-now">({daysFromNow})</span>}
                </div>
              </div>
              
              <div className="events-list">
                {dateGroup.events.map((event, index) => {
                  const eventId = `${dateLabel}-${index}`;
                  const isExpanded = expandedEvents[eventId];
                  
                  return (
                    <div 
                      key={eventId} 
                      className={`event-card ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleEvent(eventId)}
                    >
                      <div className="event-content">
                        <div className="event-header">
                          <h4 className="event-title">
                            {event.flagUrl && (
                              <img 
                                src={event.flagUrl} 
                                alt={`${event.country} flag`}
                                className="country-flag-img"
                              />
                            )}
                            {event.event}
                          </h4>
                          <span className={`impact-pill impact-${event.impact?.toLowerCase()}`}>
                            {event.impact}
                          </span>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="event-expanded">
                          <div className="event-description">
                            Market impact: {event.impact?.toLowerCase()} volatility expected
                          </div>
                          {(event.forecast || event.previous || event.actual) && (
                            <div className="event-values">
                              {event.forecast && (
                                <div className="value-item">
                                  <span className="value-label">Forecast</span>
                                  <span className="value-data">{event.forecast}</span>
                                </div>
                              )}
                              {event.previous && (
                                <div className="value-item">
                                  <span className="value-label">Previous</span>
                                  <span className="value-data">{event.previous}</span>
                                </div>
                              )}
                              {event.actual && (
                                <div className="value-item">
                                  <span className="value-label">Actual</span>
                                  <span className="value-data actual">{event.actual}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        
        {events.length === 0 && (
          <div className="empty-calendar">
            <BsCalendar3 size={48} className="text-muted mb-3" />
            <p className="text-muted">No economic events scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileEconomicCalendar;
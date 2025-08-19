import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { ReferenceLine, ReferenceDot } from 'recharts';
import { Badge } from 'react-bootstrap';

const EventMarkers = ({ 
  data = [], 
  yAxisId = "btc",
  showLabels = true,
  maxLabels = 5,
  eventTypes = ['major', 'policy', 'market'],
  opacity = 0.7 
}) => {
  // Default economic events if no data provided
  const defaultEvents = useMemo(() => [
    {
      date: '2020-03-11',
      title: 'WHO declares COVID-19 pandemic',
      type: 'major',
      impact: 'high',
      description: 'Market crash begins as pandemic declared',
      color: '#dc3545'
    },
    {
      date: '2020-03-15',
      title: 'Federal Reserve cuts rates to zero',
      type: 'policy',
      impact: 'high', 
      description: 'Emergency rate cut to support economy',
      color: '#fd7e14'
    },
    {
      date: '2020-03-27',
      title: 'CARES Act signed ($2T stimulus)',
      type: 'policy',
      impact: 'high',
      description: 'Massive fiscal stimulus package',
      color: '#198754'
    },
    {
      date: '2020-11-09',
      title: 'Pfizer vaccine news',
      type: 'major',
      impact: 'medium',
      description: '90% efficacy announcement',
      color: '#0d6efd'
    },
    {
      date: '2021-01-06',
      title: 'US Capitol attack',
      type: 'major',
      impact: 'medium',
      description: 'Political uncertainty spikes',
      color: '#6f42c1'
    },
    {
      date: '2021-03-11',
      title: 'American Rescue Plan Act ($1.9T)',
      type: 'policy',
      impact: 'high',
      description: 'Additional fiscal stimulus',
      color: '#198754'
    },
    {
      date: '2021-11-10',
      title: 'CPI hits 6.2% (30-year high)',
      type: 'market',
      impact: 'high',
      description: 'Inflation concerns intensify',
      color: '#dc3545'
    },
    {
      date: '2022-02-24',
      title: 'Russia invades Ukraine',
      type: 'major',
      impact: 'high',
      description: 'Geopolitical crisis begins',
      color: '#dc3545'
    },
    {
      date: '2022-03-16',
      title: 'Fed raises rates (first since 2018)',
      type: 'policy',
      impact: 'high',
      description: 'Rate hiking cycle begins',
      color: '#fd7e14'
    },
    {
      date: '2022-06-15',
      title: 'Fed raises rates by 0.75%',
      type: 'policy',
      impact: 'high',
      description: 'Largest hike since 1994',
      color: '#fd7e14'
    },
    {
      date: '2022-09-13',
      title: 'CPI shows 8.3% inflation',
      type: 'market',
      impact: 'high',
      description: 'Higher than expected inflation',
      color: '#dc3545'
    },
    {
      date: '2022-11-10',
      title: 'FTX collapse begins',
      type: 'market',
      impact: 'high',
      description: 'Major crypto exchange failure',
      color: '#dc3545'
    },
    {
      date: '2023-03-10',
      title: 'Silicon Valley Bank fails',
      type: 'major',
      impact: 'high',
      description: 'Banking sector contagion fears',
      color: '#dc3545'
    },
    {
      date: '2023-05-03',
      title: 'Fed raises rates to 5-5.25%',
      type: 'policy',
      impact: 'medium',
      description: 'Highest rates since 2007',
      color: '#fd7e14'
    },
    {
      date: '2024-01-11',
      title: 'Bitcoin ETF approval',
      type: 'market',
      impact: 'high',
      description: 'First spot Bitcoin ETFs approved',
      color: '#198754'
    }
  ], []);

  // Use provided data or defaults
  const events = useMemo(() => {
    const eventData = data && data.length > 0 ? data : defaultEvents;
    
    // Filter by event types
    return eventData
      .filter(event => eventTypes.includes(event.type))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [data, defaultEvents, eventTypes]);

  // Color mapping for event types
  const typeColors = useMemo(() => ({
    major: '#dc3545',      // Red for major events
    policy: '#fd7e14',     // Orange for policy changes
    market: '#6f42c1',     // Purple for market events
    crypto: '#198754',     // Green for crypto-specific events
    default: '#6c757d'     // Gray for others
  }), []);

  // Get event color
  const getEventColor = (event) => {
    return event.color || typeColors[event.type] || typeColors.default;
  };

  // Get events to show labels for (limit to most impactful)
  const labeledEvents = useMemo(() => {
    if (!showLabels) return [];
    
    return events
      .filter(event => event.impact === 'high')
      .slice(0, maxLabels);
  }, [events, showLabels, maxLabels]);

  // Custom label component for events
  const EventLabel = ({ viewBox, value, event }) => {
    if (!viewBox || !event) return null;
    
    const { x, y, width, height } = viewBox;
    const labelY = y - 10; // Position above the line
    
    return (
      <g>
        {/* Event marker dot */}
        <circle 
          cx={x} 
          cy={y + height / 2} 
          r={4} 
          fill={getEventColor(event)}
          stroke="#fff"
          strokeWidth={2}
          opacity={opacity}
        />
        
        {/* Event label */}
        <text
          x={x}
          y={labelY}
          textAnchor="middle"
          fill="#fff"
          fontSize="10"
          fontWeight="bold"
          style={{ 
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            pointerEvents: 'none'
          }}
        >
          {event.title.length > 20 ? `${event.title.substring(0, 17)}...` : event.title}
        </text>
        
        {/* Event type badge */}
        <rect
          x={x - 15}
          y={labelY + 12}
          width={30}
          height={12}
          fill={getEventColor(event)}
          opacity={0.8}
          rx={6}
        />
        <text
          x={x}
          y={labelY + 20}
          textAnchor="middle"
          fill="#fff"
          fontSize="8"
          fontWeight="bold"
        >
          {event.type.toUpperCase()}
        </text>
      </g>
    );
  };

  // Custom tooltip for event markers
  const EventTooltip = ({ event, x, y }) => (
    <div 
      className="position-absolute bg-dark border rounded p-2 shadow"
      style={{
        left: x + 10,
        top: y - 50,
        zIndex: 1000,
        minWidth: '200px'
      }}
    >
      <div className="text-light fw-bold mb-1">{event.title}</div>
      <div className="text-muted small mb-1">
        {new Date(event.date).toLocaleDateString()}
      </div>
      <div className="text-light small mb-2">{event.description}</div>
      <div className="d-flex gap-1">
        <Badge bg={event.type === 'major' ? 'danger' : event.type === 'policy' ? 'warning' : 'info'}>
          {event.type}
        </Badge>
        <Badge bg={event.impact === 'high' ? 'danger' : event.impact === 'medium' ? 'warning' : 'secondary'}>
          {event.impact} impact
        </Badge>
      </div>
    </div>
  );

  if (!events || events.length === 0) {
    return null;
  }

  return (
    <>
      {/* Render event lines */}
      {events.map((event, index) => (
        <ReferenceLine
          key={`event-${index}`}
          x={event.date}
          stroke={getEventColor(event)}
          strokeWidth={2}
          strokeDasharray="3 3"
          opacity={opacity}
        />
      ))}
      
      {/* Render labeled events */}
      {labeledEvents.map((event, index) => (
        <ReferenceLine
          key={`labeled-event-${index}`}
          x={event.date}
          stroke={getEventColor(event)}
          strokeWidth={3}
          opacity={opacity}
          label={<EventLabel event={event} />}
        />
      ))}
    </>
  );
};

EventMarkers.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['major', 'policy', 'market', 'crypto']).isRequired,
    impact: PropTypes.oneOf(['low', 'medium', 'high']).isRequired,
    description: PropTypes.string,
    color: PropTypes.string
  })),
  yAxisId: PropTypes.string,
  showLabels: PropTypes.bool,
  maxLabels: PropTypes.number,
  eventTypes: PropTypes.arrayOf(PropTypes.string),
  opacity: PropTypes.number
};

export default EventMarkers;
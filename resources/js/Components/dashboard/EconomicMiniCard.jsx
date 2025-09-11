import React from 'react';
import { Card, Badge, OverlayTrigger, Tooltip as BootstrapTooltip } from 'react-bootstrap';
import { BsInfoCircleFill } from 'react-icons/bs';
import TrendArrow from '../common/TrendArrow';
import { 
  calculateTrend, 
  getIndicatorColors, 
  getStrengthBadge 
} from '../../utils/trendCalculator';

/**
 * EconomicMiniCard Component
 * Displays a single economic indicator with trend arrow and current value
 */
const EconomicMiniCard = ({ 
  data, 
  indicatorKey, 
  indicatorConfig, 
  timeRange = '90',
  loading = false,
  error = false 
}) => {
  // Calculate trend from data
  const trend = React.useMemo(() => {
    if (!data || data.length === 0) return null;
    
    // Transform data for trend calculation
    const trendData = data.map(item => ({
      date: item.date,
      value: item[indicatorKey]
    }));
    
    return calculateTrend(trendData, 30);
  }, [data, indicatorKey]);

  // Get current value (most recent data point)
  const currentValue = React.useMemo(() => {
    if (!data || data.length === 0) return null;
    const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
    return sortedData[0]?.[indicatorKey];
  }, [data, indicatorKey]);

  // Get colors based on trend direction and indicator type
  const colors = trend ? getIndicatorColors(indicatorKey, trend.direction) : 
    { color: '#6c757d', backgroundColor: '#6c757d1a' };

  // Get strength badge properties
  const strengthBadge = trend ? getStrengthBadge(trend.strength) : 
    { text: 'N/A', variant: 'secondary', icon: '○' };

  // Format values for display
  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (indicatorConfig?.unit === '%') {
      return `${parseFloat(value).toFixed(2)}%`;
    }
    return parseFloat(value).toFixed(2);
  };

  // Format change for display
  const formatChange = (change) => {
    if (change === null || change === undefined) return '';
    const sign = change >= 0 ? '+' : '';
    if (indicatorConfig?.unit === '%') {
      return `${sign}${change.toFixed(2)}%`;
    }
    return `${sign}${change.toFixed(2)}`;
  };

  // Get time period label based on selected timeRange
  const getTimePeriodLabel = () => {
    const timeRangeMap = {
      '90': '3M',
      '180': '6M', 
      '365': '1Y'
    };
    return timeRangeMap[timeRange] || '3M';
  };

  // Create tooltip content
  const tooltipContent = (
    <div>
      <div className="fw-bold mb-1">{indicatorConfig?.name}</div>
      <div className="mb-2" style={{ fontSize: '0.875em' }}>
        {indicatorConfig?.description}
      </div>
      {trend && (
        <div className="mb-1" style={{ fontSize: '0.875em' }}>
          <strong>Current Value:</strong> {formatValue(currentValue)}
          <br />
          <strong>Trend:</strong> {trend.direction === 'up' ? 'Rising' : trend.direction === 'down' ? 'Falling' : 'Stable'} ({trend.strength})
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <Card className="economic-mini-card loading-card">
        <Card.Body className="d-flex flex-column align-items-center justify-content-center">
          <div className="spinner-border spinner-border-sm text-muted mb-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="text-muted small">Loading...</div>
        </Card.Body>
      </Card>
    );
  }

  if (error || !trend) {
    return (
      <Card className="economic-mini-card error-card">
        <Card.Body className="d-flex flex-column align-items-center justify-content-center">
          <BsInfoCircleFill className="text-warning mb-2" size={20} />
          <div className="text-muted small text-center">
            {indicatorConfig?.name || 'Indicator'}<br />
            Data unavailable
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card 
      className="economic-mini-card h-100"
      style={{ 
        borderColor: colors.color + '40',
        backgroundColor: colors.backgroundColor 
      }}
    >
      <Card.Body className="d-flex flex-column p-3">
        {/* Header with indicator name and info icon */}
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className="mb-0 fw-bold" style={{ 
            fontSize: '0.875rem',
            color: 'var(--bs-body-color)',
            lineHeight: 1.2
          }}>
            {indicatorConfig?.name}
          </h6>
          <OverlayTrigger
            placement="top"
            overlay={<BootstrapTooltip>{tooltipContent}</BootstrapTooltip>}
          >
            <BsInfoCircleFill 
              className="text-muted ms-1" 
              style={{ cursor: 'help', fontSize: '0.875rem' }} 
            />
          </OverlayTrigger>
        </div>

        {/* Main value display with prominent arrow */}
        <div className="flex-grow-1 d-flex align-items-center justify-content-center">
          {/* Trend Arrow - Prominent Left Position */}
          <div className="me-3">
            <TrendArrow
              angle={trend.angle}
              color={colors.color}
              size={40}
              strength={trend.strength}
              direction={trend.direction}
            />
          </div>
          
          {/* Value section */}
          <div className="text-center">
            {/* Current Value */}
            <div 
              className="fw-bold mb-1"
              style={{ 
                fontSize: '1.5rem',
                color: colors.color,
                lineHeight: 1
              }}
            >
              {formatValue(currentValue)}
            </div>
            
            {/* Previous value and change */}
            {trend?.previousValue && trend?.change && (
              <div>
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {getTimePeriodLabel()} ago: {formatValue(trend.previousValue)}
                </small>
                <br />
                <small 
                  style={{ 
                    fontSize: '0.75rem',
                    color: trend.change >= 0 ? '#198754' : '#dc3545'
                  }}
                >
                  {formatChange(trend.change)}
                </small>
              </div>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default EconomicMiniCard;
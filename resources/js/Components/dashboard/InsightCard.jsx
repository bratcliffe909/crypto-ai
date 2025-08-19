import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import { BsInfoCircleFill, BsTrendingUp, BsTrendingDown } from 'react-icons/bs';
import SimpleTooltip from './SimpleTooltip';
import TimeAgo from '../common/TimeAgo';

const InsightCard = ({ insight }) => {
  const {
    title,
    subtitle,
    value,
    change24h,
    status,
    cryptoImpact,
    description,
    explanation,
    lastUpdated
  } = insight;

  // Get status colors matching the existing theme
  const getStatusVariant = (status) => {
    switch (status) {
      case 'success': return 'success'; // Good for crypto
      case 'warning': return 'warning'; // Neutral for crypto
      case 'danger': return 'danger';   // Bad for crypto
      default: return 'secondary';
    }
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'Bullish': return 'success';
      case 'Bearish': return 'danger';
      case 'Neutral': return 'warning';
      default: return 'secondary';
    }
  };

  const formatValue = (val) => {
    if (typeof val !== 'number') return val;
    if (val >= 1000) return val.toLocaleString('en-US', { maximumFractionDigits: 1 });
    return val.toFixed(1);
  };

  const formatChange = (change) => {
    if (typeof change !== 'number') return '';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  return (
    <Card className="h-100 insight-card">
      <Card.Header className="d-flex justify-content-between align-items-start">
        <div className="flex-grow-1">
          <div className="d-flex align-items-center">
            <h6 className="mb-0 fw-bold">{title}</h6>
            <SimpleTooltip content={explanation}>
              <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
            </SimpleTooltip>
          </div>
          <small className="text-muted">{subtitle}</small>
        </div>
        {lastUpdated && (
          <TimeAgo date={lastUpdated} />
        )}
      </Card.Header>
      
      <Card.Body className="d-flex flex-column">
        {/* Main Value Display */}
        <div className="text-center mb-3">
          <div className="d-flex justify-content-center align-items-baseline">
            <h3 className="mb-0 fw-bold">{formatValue(value)}</h3>
            {change24h !== undefined && (
              <div className="ms-2 d-flex align-items-center">
                {change24h >= 0 ? (
                  <BsTrendingUp className={`text-${change24h >= 0 ? 'success' : 'danger'} me-1`} />
                ) : (
                  <BsTrendingDown className={`text-${change24h >= 0 ? 'success' : 'danger'} me-1`} />
                )}
                <small className={`text-${change24h >= 0 ? 'success' : 'danger'} fw-semibold`}>
                  {formatChange(change24h)}
                </small>
              </div>
            )}
          </div>
        </div>

        {/* Crypto Impact Badge */}
        <div className="text-center mb-3">
          <Badge 
            bg={getImpactColor(cryptoImpact)} 
            className="px-3 py-2 fs-7 fw-semibold"
          >
            {cryptoImpact} for Crypto
          </Badge>
        </div>

        {/* Description */}
        <div className="mt-auto">
          <p className="text-muted small mb-0 lh-sm">
            {description}
          </p>
        </div>
      </Card.Body>
    </Card>
  );
};

export default InsightCard;
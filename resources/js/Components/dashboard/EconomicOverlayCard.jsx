import React, { useState } from 'react';
import { Card, Row, Col, Badge, Spinner, Alert, Dropdown, ButtonGroup, Button } from 'react-bootstrap';
import { BsInfoCircleFill } from 'react-icons/bs';
import useApi from '../../hooks/useApi';
import Tooltip from '../common/Tooltip';
import TimeAgo from '../common/TimeAgo';

const EconomicOverlayCard = () => {
  const [selectedIndicator, setSelectedIndicator] = useState('federal_funds_rate');
  const [timeRange, setTimeRange] = useState('365');
  
  const { data, loading, error, lastFetch } = useApi(
    `/api/crypto/economic-overlay?indicator=${selectedIndicator}&days=${timeRange}`, 
    300000 // 5 minutes
  );

  const indicators = {
    federal_funds_rate: { name: 'Federal Funds Rate', unit: '%', color: '#FF6B6B' },
    inflation_cpi: { name: 'Inflation (CPI)', unit: '%', color: '#4ECDC4' },
    unemployment_rate: { name: 'Unemployment Rate', unit: '%', color: '#45B7D1' },
    dxy_dollar_index: { name: 'Dollar Index (DXY)', unit: '', color: '#96CEB4' }
  };

  const timeRanges = {
    '90': '3M',
    '180': '6M', 
    '365': '1Y',
    '730': '2Y'
  };

  const formatCorrelation = (correlation) => {
    if (!correlation && correlation !== 0) return 'N/A';
    const percentage = Math.abs(correlation * 100);
    const strength = percentage >= 60 ? 'Strong' : percentage >= 30 ? 'Moderate' : 'Weak';
    return `${percentage.toFixed(0)}% (${strength})`;
  };

  const getCorrelationColor = (correlation) => {
    if (!correlation && correlation !== 0) return 'secondary';
    const abs = Math.abs(correlation);
    return abs >= 0.6 ? 'success' : abs >= 0.3 ? 'warning' : 'secondary';
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const getCurrentData = () => {
    if (!data?.data?.data || data.data.data.length === 0) return null;
    return data.data.data[data.data.data.length - 1];
  };

  const currentData = getCurrentData();
  const indicatorInfo = indicators[selectedIndicator];
  const correlation = data?.data?.metadata?.correlation;

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <h5 className="mb-0">Economic Overlay Analysis</h5>
            <Tooltip content="Shows correlation between Bitcoin price and traditional economic indicators. High correlation means they move together, while negative correlation means they move in opposite directions.">
              <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
            </Tooltip>
          </div>
          {lastFetch && <TimeAgo date={lastFetch} />}
        </div>
      </Card.Header>
      <Card.Body>
        {/* Controls */}
        <Row className="mb-3">
          <Col xs={12} md={6}>
            <small className="text-muted">Economic Indicator</small>
            <Dropdown className="w-100">
              <Dropdown.Toggle variant="outline-secondary" size="sm" className="w-100 text-start">
                {indicatorInfo?.name || 'Select Indicator'}
              </Dropdown.Toggle>
              <Dropdown.Menu className="w-100">
                {Object.entries(indicators).map(([key, indicator]) => (
                  <Dropdown.Item 
                    key={key}
                    active={selectedIndicator === key}
                    onClick={() => setSelectedIndicator(key)}
                  >
                    {indicator.name}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </Col>
          <Col xs={12} md={6} className="mt-2 mt-md-0">
            <small className="text-muted">Time Range</small>
            <ButtonGroup size="sm" className="w-100">
              {Object.entries(timeRanges).map(([days, label]) => (
                <Button
                  key={days}
                  variant={timeRange === days ? 'primary' : 'outline-secondary'}
                  onClick={() => setTimeRange(days)}
                  className="flex-fill"
                >
                  {label}
                </Button>
              ))}
            </ButtonGroup>
          </Col>
        </Row>

        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" size="sm" />
          </div>
        )}
        
        {error && (
          <Alert variant="danger" className="mb-0">
            <BsInfoCircleFill className="me-2" />
            Unable to load economic data. Please try again later.
          </Alert>
        )}
        
        {currentData && !loading && !error && (
          <Row>
            <Col xs={6} className="mb-3">
              <div>
                <small className="text-muted d-block">Current Bitcoin Price</small>
                <h5 className="mb-0">{formatPrice(currentData.bitcoin_price)}</h5>
              </div>
            </Col>
            <Col xs={6} className="mb-3">
              <div>
                <small className="text-muted d-block">{indicatorInfo?.name}</small>
                <h5 className="mb-0" style={{ color: indicatorInfo?.color }}>
                  {currentData[selectedIndicator]?.toFixed(2)}{indicatorInfo?.unit}
                </h5>
              </div>
            </Col>
            <Col xs={6} className="mb-3">
              <div>
                <small className="text-muted d-block">Correlation Strength</small>
                <h5 className="mb-0">
                  <Badge bg={getCorrelationColor(correlation)}>
                    {formatCorrelation(correlation)}
                  </Badge>
                </h5>
              </div>
            </Col>
            <Col xs={6} className="mb-3">
              <div>
                <small className="text-muted d-block">Data Points</small>
                <h5 className="mb-0">{data?.data?.metadata?.data_points || 0}</h5>
              </div>
            </Col>
          </Row>
        )}

        {!currentData && !loading && !error && (
          <Alert variant="info" className="mb-0">
            <BsInfoCircleFill className="me-2" />
            No data available for the selected indicator and time range.
          </Alert>
        )}

        {/* Simple explanation */}
        {currentData && indicatorInfo && (
          <div className="mt-3 p-2 bg-light rounded">
            <small className="text-muted">
              <strong>What this means:</strong> {
                selectedIndicator === 'federal_funds_rate' ? 
                  'Higher interest rates typically create selling pressure on Bitcoin as investors move to safer, yield-bearing assets.' :
                selectedIndicator === 'inflation_cpi' ?
                  'Higher inflation often increases Bitcoin demand as investors seek protection from currency devaluation.' :
                selectedIndicator === 'unemployment_rate' ?
                  'High unemployment can lead to monetary policy changes that affect Bitcoin price movements.' :
                'Dollar strength often inversely affects Bitcoin, as a stronger dollar can reduce demand for alternative assets.'
              }
            </small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default EconomicOverlayCard;
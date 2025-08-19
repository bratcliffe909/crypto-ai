import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Badge, Spinner, Alert, Dropdown, ButtonGroup, Button } from 'react-bootstrap';
import { BsInfoCircleFill, BsBarChart } from 'react-icons/bs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import useApi from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import Tooltip from '../common/Tooltip';
import TimeAgo from '../common/TimeAgo';

const EconomicOverlay = () => {
  const [selectedIndicator, setSelectedIndicator] = useState('federal_funds_rate');
  const [timeRange, setTimeRange] = useState('365');
  
  const { data, loading, error, lastFetch } = useApi(
    `/api/crypto/economic-overlay?indicator=${selectedIndicator}&days=${timeRange}`, 
    30000 // 30 seconds for testing
  );

  const indicators = {
    federal_funds_rate: { 
      name: 'Federal Funds Rate', 
      unit: '%', 
      color: '#FF6B6B',
      description: 'Higher interest rates typically create selling pressure on Bitcoin as investors move to safer, yield-bearing assets.'
    },
    inflation_cpi: { 
      name: 'Consumer Price Index', 
      unit: '%', 
      color: '#4ECDC4',
      description: 'Higher inflation often increases Bitcoin demand as investors seek protection from currency devaluation.'
    },
    unemployment_rate: { 
      name: 'Unemployment Rate', 
      unit: '%', 
      color: '#45B7D1',
      description: 'High unemployment can lead to monetary policy changes that affect Bitcoin price movements.'
    },
    dxy_dollar_index: { 
      name: 'US Dollar Index (DXY)', 
      unit: '', 
      color: '#96CEB4',
      description: 'Dollar strength often inversely affects Bitcoin, as a stronger dollar can reduce demand for alternative assets.'
    }
  };

  const timeRanges = {
    '90': '3M',
    '180': '6M', 
    '365': '1Y'
  };

  // Process data for chart
  const chartData = useMemo(() => {
    if (!data?.data) {
      return [];
    }
    
    return data.data.map(item => ({
      ...item,
      // Format date for display
      displayDate: new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: item.date.includes('2024') ? '2-digit' : undefined
      }),
      // Keep full Bitcoin price for desktop
      bitcoin_price_k: Math.round(item.bitcoin_price / 1000) // Also provide K version for secondary display
    }));
  }, [data]);

  const correlation = data?.metadata?.correlation;
  const indicatorInfo = indicators[selectedIndicator];
  const dataPoints = data?.metadata?.data_points || 0;

  const formatCorrelation = (correlation) => {
    if (!correlation && correlation !== 0) return 'N/A';
    const percentage = Math.abs(correlation * 100);
    const direction = correlation >= 0 ? 'Positive' : 'Negative';
    const strength = percentage >= 60 ? 'Strong' : percentage >= 30 ? 'Moderate' : 'Weak';
    return `${direction} ${strength} (${percentage.toFixed(0)}%)`;
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
    if (!data?.data || data.data.length === 0) return null;
    return data.data[data.data.length - 1];
  };

  const currentData = getCurrentData();
  const currentBitcoinPrice = data?.metadata?.current_bitcoin_price;

  // Custom tooltip for desktop
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-date">{new Date(data.date).toLocaleDateString('en-US', { 
            weekday: 'short',
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}</p>
          <p className="tooltip-btc">
            <span style={{ color: '#f7931a' }}>Bitcoin: </span>
            {formatPrice(data.bitcoin_price)}
          </p>
          <p className="tooltip-indicator">
            <span style={{ color: indicatorInfo?.color }}>
              {indicatorInfo?.name}: 
            </span>
            {` ${data[selectedIndicator]?.toFixed(2) || 'N/A'}${indicatorInfo?.unit}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <BsBarChart className="me-2" />
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
        <Row className="mb-4">
          <Col md={6}>
            <label className="form-label text-muted small">Economic Indicator</label>
            <Dropdown className="w-100">
              <Dropdown.Toggle variant="outline-secondary" size="sm" className="w-100 text-start">
                {indicatorInfo?.name || 'Select Indicator'}
              </Dropdown.Toggle>
              <Dropdown.Menu className="w-100" style={{ minWidth: '300px' }}>
                {Object.entries(indicators).map(([key, indicator]) => (
                  <Dropdown.Item 
                    key={key}
                    active={selectedIndicator === key}
                    onClick={() => setSelectedIndicator(key)}
                    style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    <div>
                      <div className="fw-medium">{indicator.name}</div>
                      <small className="text-muted d-block" style={{ whiteSpace: 'normal' }}>
                        {indicator.description}
                      </small>
                    </div>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </Col>
          <Col md={6}>
            <label className="form-label text-muted small">Time Range</label>
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
            <LoadingSpinner />
            <p className="text-muted mt-2">Loading economic overlay data...</p>
          </div>
        )}
        
        {error && (
          <Alert variant="danger" className="mb-0">
            <BsInfoCircleFill className="me-2" />
            Unable to load economic overlay data. Please try again later.
          </Alert>
        )}
        
        {chartData.length > 0 && !loading && !error && (
          <>
            {/* Current Stats */}
            <Row className="mb-4">
              <Col sm={6} md={3}>
                <div className="text-center p-3 border rounded">
                  <small className="text-muted d-block">Current Bitcoin Price</small>
                  <h5 className="mb-0 text-warning">{formatPrice(currentBitcoinPrice || currentData?.bitcoin_price)}</h5>
                </div>
              </Col>
              <Col sm={6} md={3}>
                <div className="text-center p-3 border rounded">
                  <small className="text-muted d-block">{indicatorInfo?.name}</small>
                  <h5 className="mb-0" style={{ color: indicatorInfo?.color }}>
                    {currentData?.[selectedIndicator]?.toFixed(2) || 'N/A'}{indicatorInfo?.unit}
                  </h5>
                </div>
              </Col>
              <Col sm={6} md={3}>
                <div className="text-center p-3 border rounded">
                  <small className="text-muted d-block">Correlation Strength</small>
                  <Badge bg={getCorrelationColor(correlation)} className="fs-6">
                    {formatCorrelation(correlation)}
                  </Badge>
                </div>
              </Col>
              <Col sm={6} md={3}>
                <div className="text-center p-3 border rounded">
                  <small className="text-muted d-block">Data Points</small>
                  <h5 className="mb-0">{dataPoints}</h5>
                </div>
              </Col>
            </Row>

            {/* Chart */}
            <div style={{ height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bs-border-color)" />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    yAxisId="left"
                    orientation="left" 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                    domain={['dataMin', 'dataMax']}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right" 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `${value}${indicatorInfo?.unit || ''}`}
                    domain={['dataMin', 'dataMax']}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  
                  {/* Bitcoin Price Line */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="bitcoin_price"
                    stroke="#f7931a"
                    strokeWidth={2}
                    dot={false}
                    name="Bitcoin Price"
                  />
                  
                  {/* Economic Indicator Line */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey={selectedIndicator}
                    stroke={indicatorInfo?.color || '#666'}
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="8 4"
                    name={indicatorInfo?.name}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="d-flex justify-content-center gap-4 mt-3 pt-3 border-top">
              <div className="d-flex align-items-center gap-2">
                <div className="legend-line" style={{ width: 20, height: 2, backgroundColor: '#f7931a' }}></div>
                <small>Bitcoin Price (Left Axis)</small>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div 
                  className="legend-line-dashed" 
                  style={{ 
                    width: 20, 
                    height: 2, 
                    backgroundImage: `repeating-linear-gradient(to right, ${indicatorInfo?.color} 0px, ${indicatorInfo?.color} 8px, transparent 8px, transparent 12px)`
                  }}
                ></div>
                <small>{indicatorInfo?.name} (Right Axis)</small>
              </div>
            </div>
          </>
        )}

        {!chartData.length && !loading && !error && (
          <Alert variant="info" className="text-center mb-0">
            <BsInfoCircleFill className="me-2" />
            No data available for the selected indicator and time range.
          </Alert>
        )}

        {/* Explanation */}
        {indicatorInfo && chartData.length > 0 && (
          <div className="mt-4 p-3 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
            <small style={{ color: '#495057' }}>
              <strong>About {indicatorInfo.name}:</strong> {indicatorInfo.description}
              {correlation !== undefined && correlation !== null && (
                <span className="d-block mt-2">
                  <strong>Current Analysis:</strong> The {Math.abs(correlation * 100).toFixed(0)}% correlation suggests{' '}
                  {Math.abs(correlation) > 0.6 ? 'a strong' : Math.abs(correlation) > 0.3 ? 'a moderate' : 'a weak'}{' '}
                  {correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'neutral'} relationship between Bitcoin and this economic indicator over the selected timeframe.
                </span>
              )}
            </small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default EconomicOverlay;
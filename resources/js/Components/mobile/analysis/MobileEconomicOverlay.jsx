import React, { useState, useMemo } from 'react';
import { Card, Alert, ButtonGroup, Button, Dropdown } from 'react-bootstrap';
import { BsInfoCircleFill, BsGraphUp } from 'react-icons/bs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import useApi from '../../../hooks/useApi';
import LoadingSpinner from '../../common/LoadingSpinner';
import Tooltip from '../../common/Tooltip';
import TimeAgo from '../../common/TimeAgo';

const MobileEconomicOverlay = () => {
  const [selectedIndicator, setSelectedIndicator] = useState('federal_funds_rate');
  const [timeRange, setTimeRange] = useState('365');
  
  const { data, loading, error, lastFetch } = useApi(
    `/api/crypto/economic-overlay?indicator=${selectedIndicator}&days=${timeRange}`, 
    300000 // 5 minutes
  );

  const indicators = {
    federal_funds_rate: { 
      name: 'Federal Funds Rate', 
      unit: '%', 
      color: '#FF6B6B',
      description: 'US Central Bank interest rate'
    },
    inflation_cpi: { 
      name: 'Inflation (CPI)', 
      unit: '%', 
      color: '#4ECDC4',
      description: 'Consumer Price Index inflation'
    },
    unemployment_rate: { 
      name: 'Unemployment Rate', 
      unit: '%', 
      color: '#45B7D1',
      description: 'US unemployment percentage'
    },
    dxy_dollar_index: { 
      name: 'Dollar Index (DXY)', 
      unit: '', 
      color: '#96CEB4',
      description: 'US Dollar strength index'
    }
  };

  const timeRanges = {
    '90': '3M',
    '180': '6M', 
    '365': '1Y'
  };

  // Process data for chart
  const chartData = useMemo(() => {
    if (!data?.data) return [];
    
    return data.data.map(item => ({
      ...item,
      // Format date for display
      displayDate: new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      // Scale Bitcoin price to thousands for better mobile display
      btc_scaled: Math.round(item.bitcoin_price / 1000)
    }));
  }, [data]);

  const correlation = data?.metadata?.correlation;
  const indicatorInfo = indicators[selectedIndicator];

  const formatCorrelation = (correlation) => {
    if (!correlation && correlation !== 0) return 'N/A';
    const percentage = Math.abs(correlation * 100);
    const direction = correlation >= 0 ? 'Positive' : 'Negative';
    const strength = percentage >= 60 ? 'Strong' : percentage >= 30 ? 'Moderate' : 'Weak';
    return `${direction} ${strength} (${percentage.toFixed(0)}%)`;
  };

  const getCorrelationColor = (correlation) => {
    if (!correlation && correlation !== 0) return '#6c757d';
    const abs = Math.abs(correlation);
    return abs >= 0.6 ? '#198754' : abs >= 0.3 ? '#fd7e14' : '#6c757d';
  };

  // Custom tooltip for mobile
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="mobile-chart-tooltip">
          <p className="tooltip-date">{new Date(data.date).toLocaleDateString()}</p>
          <p className="tooltip-btc">
            <span style={{ color: '#f7931a' }}>Bitcoin: </span>
            ${(data.bitcoin_price || 0).toLocaleString()}
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

  if (loading) {
    return (
      <Card className="mobile-chart-card">
        <Card.Body className="text-center">
          <LoadingSpinner />
          <p className="text-muted mt-2">Loading economic data...</p>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mobile-chart-card">
        <Card.Body>
          <Alert variant="danger">
            <BsInfoCircleFill className="me-2" />
            Failed to load economic overlay data
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mobile-chart-card">
      <Card.Header className="mobile-card-header">
        <div className="d-flex align-items-center">
          <BsGraphUp className="me-2" />
          <h6 className="mb-0">Economic Overlay</h6>
          <Tooltip content="Shows correlation between Bitcoin price and traditional economic indicators">
            <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
          </Tooltip>
        </div>
        {lastFetch && <TimeAgo date={lastFetch} className="text-muted small" />}
      </Card.Header>

      <Card.Body className="mobile-card-body">
        {/* Mobile Controls */}
        <div className="mobile-controls mb-3">
          <div className="mb-2">
            <small className="text-muted d-block">Economic Indicator</small>
            <Dropdown className="w-100">
              <Dropdown.Toggle variant="outline-secondary" size="sm" className="w-100 text-start">
                {indicatorInfo?.name || 'Select Indicator'}
              </Dropdown.Toggle>
              <Dropdown.Menu className="w-100" style={{ minWidth: '280px' }}>
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
          </div>

          <div className="mb-3">
            <small className="text-muted d-block">Time Range</small>
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
          </div>

          {/* Correlation Info */}
          {correlation !== undefined && (
            <div className="correlation-info mb-3 p-2 rounded" style={{ backgroundColor: 'var(--bs-gray-100)' }}>
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">Correlation:</small>
                <span 
                  className="small fw-bold"
                  style={{ color: getCorrelationColor(correlation) }}
                >
                  {formatCorrelation(correlation)}
                </span>
              </div>
            </div>
          )}
        </div>

        {chartData.length > 0 ? (
          <div className="mobile-chart-container" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  orientation="left" 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `$${value}k`}
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right" 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `${value}${indicatorInfo?.unit || ''}`}
                  axisLine={false}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                
                {/* Bitcoin Price Line */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="btc_scaled"
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
                  strokeDasharray="5 5"
                  name={indicatorInfo?.name}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Alert variant="info" className="text-center">
            <BsInfoCircleFill className="me-2" />
            No data available for the selected indicator and time range.
          </Alert>
        )}

        {/* Legend */}
        {chartData.length > 0 && (
          <div className="chart-legend mt-3">
            <div className="d-flex justify-content-center gap-3">
              <div className="legend-item">
                <div className="legend-line" style={{ backgroundColor: '#f7931a' }}></div>
                <small>Bitcoin (k$)</small>
              </div>
              <div className="legend-item">
                <div className="legend-line legend-dashed" style={{ backgroundColor: indicatorInfo?.color }}></div>
                <small>{indicatorInfo?.name}</small>
              </div>
            </div>
          </div>
        )}

        {/* Explanation */}
        {indicatorInfo && (
          <div className="mt-3 p-2 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
            <small style={{ color: '#495057' }}>
              <strong>About {indicatorInfo.name}:</strong> {indicatorInfo.description}
              {correlation !== undefined && correlation !== null && (
                <span className="d-block mt-1">
                  Current correlation suggests {Math.abs(correlation) > 0.3 ? 'some relationship' : 'little relationship'} between Bitcoin and this indicator.
                </span>
              )}
            </small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default MobileEconomicOverlay;
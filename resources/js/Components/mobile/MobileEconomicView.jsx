import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Card, Alert, Button, Collapse, Row, Col, ButtonGroup, Badge } from 'react-bootstrap';
import { BsInfoCircleFill, BsChevronDown, BsChevronUp, BsBarChart, BsGraphUp } from 'react-icons/bs';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import useApi from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import Tooltip from '../common/Tooltip';
import TimeAgo from '../common/TimeAgo';

const MobileEconomicView = ({ 
  initialIndicator = 'UNRATE',
  initialTimeRange = '365' 
}) => {
  const [selectedIndicator, setSelectedIndicator] = useState(initialIndicator);
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [viewMode, setViewMode] = useState('overlay'); // 'overlay', 'separate', 'correlation'
  const [showIndicatorSelector, setShowIndicatorSelector] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // API call
  const { 
    data: rawData, 
    loading, 
    error, 
    lastFetch 
  } = useApi(
    `/api/crypto/economic-overlay?indicator=${selectedIndicator}&days=${timeRange}&normalize=true`, 
    { refetchInterval: 300000 }
  );

  // Process data for mobile display
  const processedData = useMemo(() => {
    if (!rawData || !rawData.data) return { chartData: [], correlation: null };
    
    const chartData = rawData.data.map(item => ({
      date: item.date,
      btcPrice: item.btc_price,
      economicValue: item.economic_value,
      // Normalize for mobile display (0-100 scale)
      btcNormalized: item.btc_normalized || null,
      economicNormalized: item.economic_normalized || null,
    }));

    // Calculate simple correlation
    const validData = chartData.filter(d => 
      d.btcPrice !== null && d.economicValue !== null
    );
    
    let correlation = null;
    if (validData.length > 10) {
      const btcValues = validData.map(d => d.btcPrice);
      const economicValues = validData.map(d => d.economicValue);
      correlation = calculateCorrelation(btcValues, economicValues);
    }

    return { chartData, correlation };
  }, [rawData]);

  const { chartData, correlation } = processedData;

  // Simple correlation calculation
  const calculateCorrelation = useCallback((x, y) => {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }, []);

  // Mobile-optimized indicators list
  const mobileIndicators = useMemo(() => [
    { key: 'UNRATE', name: 'Unemployment', icon: '📊', category: 'Employment' },
    { key: 'CPIAUCSL', name: 'Inflation (CPI)', icon: '💰', category: 'Inflation' },
    { key: 'DFEDTARU', name: 'Fed Rate', icon: '🏦', category: 'Policy' },
    { key: 'M2SL', name: 'Money Supply', icon: '💵', category: 'Monetary' },
    { key: 'GDP', name: 'GDP Growth', icon: '📈', category: 'Growth' },
    { key: 'VIXCLS', name: 'VIX (Fear)', icon: '😱', category: 'Market' },
    { key: 'DGS10', name: '10Y Treasury', icon: '📋', category: 'Rates' },
    { key: 'PAYEMS', name: 'Jobs Added', icon: '👥', category: 'Employment' }
  ], []);

  // Format functions optimized for mobile
  const formatPrice = useCallback((value) => {
    if (!value) return 'N/A';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${Math.round(value)}`;
  }, []);

  const formatEconomicValue = useCallback((value) => {
    if (!value) return 'N/A';
    const unit = rawData?.metadata?.unit || '';
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit.includes('Billions')) return `${value.toFixed(1)}B`;
    return value.toFixed(1);
  }, [rawData?.metadata]);

  const formatDateMobile = useCallback((dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: timeRange === '90' ? 'numeric' : undefined,
      year: timeRange === '365' ? undefined : '2-digit'
    });
  }, [timeRange]);

  // Mobile tooltip
  const MobileTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-dark p-2 rounded border" style={{ fontSize: '12px' }}>
        <div className="text-light fw-bold mb-1">{formatDateMobile(label)}</div>
        {payload.map((entry, index) => (
          <div key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.dataKey === 'btcPrice' ? formatPrice(entry.value) : formatEconomicValue(entry.value)}
          </div>
        ))}
        {correlation && (
          <div className="text-muted mt-1">
            Corr: {(correlation * 100).toFixed(0)}%
          </div>
        )}
      </div>
    );
  };

  // Get current indicator info
  const currentIndicatorInfo = mobileIndicators.find(ind => ind.key === selectedIndicator);

  if (loading && !rawData) {
    return (
      <Card className="mb-3">
        <Card.Body className="text-center py-4">
          <LoadingSpinner size="sm" />
          <div className="mt-2 text-muted small">Loading economic data...</div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="warning" className="mb-3">
        <div className="d-flex align-items-center">
          <BsInfoCircleFill className="me-2" />
          <div>
            <div className="fw-bold">Unable to load data</div>
            <small>{error}</small>
          </div>
        </div>
      </Alert>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Alert variant="info" className="mb-3">
        <BsInfoCircleFill className="me-2" />
        No data available for this indicator and time range.
      </Alert>
    );
  }

  return (
    <div className="mobile-economic-view">
      {/* Header */}
      <Card className="mb-3">
        <Card.Header className="pb-2">
          <div className="d-flex justify-content-between align-items-start">
            <div className="flex-grow-1">
              <div className="d-flex align-items-center">
                <h6 className="mb-1">Economic Overlay</h6>
                {lastFetch && <TimeAgo date={lastFetch} className="ms-2 small text-muted" />}
              </div>
              <div className="small text-muted">
                Bitcoin vs {currentIndicatorInfo?.name || selectedIndicator}
              </div>
            </div>
            <Tooltip content="Compare Bitcoin with economic indicators on mobile">
              <BsInfoCircleFill className="text-muted" style={{ cursor: 'help' }} />
            </Tooltip>
          </div>
        </Card.Header>

        <Card.Body className="py-2">
          {/* Quick Stats */}
          <Row className="g-2 mb-3">
            <Col xs={4} className="text-center">
              <div className="small text-muted">Correlation</div>
              <div className={`fw-bold ${Math.abs(correlation || 0) > 0.5 ? 'text-warning' : 'text-light'}`}>
                {correlation ? `${(correlation * 100).toFixed(0)}%` : 'N/A'}
              </div>
            </Col>
            <Col xs={4} className="text-center">
              <div className="small text-muted">Data Points</div>
              <div className="fw-bold text-light">{chartData.length}</div>
            </Col>
            <Col xs={4} className="text-center">
              <div className="small text-muted">Time Range</div>
              <div className="fw-bold text-light">
                {timeRange === '90' ? '3M' : timeRange === '365' ? '1Y' : timeRange === '1095' ? '3Y' : '5Y'}
              </div>
            </Col>
          </Row>

          {/* Time Range Selector */}
          <ButtonGroup size="sm" className="w-100 mb-3">
            {['90', '365', '1095', '1825'].map(range => (
              <Button
                key={range}
                variant={timeRange === range ? 'primary' : 'outline-secondary'}
                onClick={() => setTimeRange(range)}
                className="flex-fill"
              >
                {range === '90' ? '3M' : range === '365' ? '1Y' : range === '1095' ? '3Y' : '5Y'}
              </Button>
            ))}
          </ButtonGroup>

          {/* View Mode Toggle */}
          <ButtonGroup size="sm" className="w-100 mb-3">
            <Button
              variant={viewMode === 'overlay' ? 'primary' : 'outline-secondary'}
              onClick={() => setViewMode('overlay')}
              className="flex-fill"
            >
              <BsBarChart className="me-1" />
              Overlay
            </Button>
            <Button
              variant={viewMode === 'separate' ? 'primary' : 'outline-secondary'}
              onClick={() => setViewMode('separate')}
              className="flex-fill"
            >
              <BsGraphUp className="me-1" />
              Separate
            </Button>
          </ButtonGroup>
        </Card.Body>
      </Card>

      {/* Indicator Selector */}
      <Card className="mb-3">
        <Card.Header 
          className="py-2"
          onClick={() => setShowIndicatorSelector(!showIndicatorSelector)}
          style={{ cursor: 'pointer' }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <span className="me-2">{currentIndicatorInfo?.icon || '📊'}</span>
              <span className="fw-bold">{currentIndicatorInfo?.name || selectedIndicator}</span>
              <Badge bg="secondary" className="ms-2 small">{currentIndicatorInfo?.category}</Badge>
            </div>
            {showIndicatorSelector ? <BsChevronUp /> : <BsChevronDown />}
          </div>
        </Card.Header>
        
        <Collapse in={showIndicatorSelector}>
          <Card.Body className="py-2">
            <div className="row g-1">
              {mobileIndicators.map(indicator => (
                <div key={indicator.key} className="col-6">
                  <Button
                    variant={selectedIndicator === indicator.key ? 'primary' : 'outline-secondary'}
                    size="sm"
                    className="w-100 text-start"
                    onClick={() => {
                      setSelectedIndicator(indicator.key);
                      setShowIndicatorSelector(false);
                    }}
                  >
                    <div className="d-flex align-items-center">
                      <span className="me-2">{indicator.icon}</span>
                      <div>
                        <div className="fw-bold" style={{ fontSize: '11px' }}>{indicator.name}</div>
                        <div className="text-muted" style={{ fontSize: '9px' }}>{indicator.category}</div>
                      </div>
                    </div>
                  </Button>
                </div>
              ))}
            </div>
          </Card.Body>
        </Collapse>
      </Card>

      {/* Chart */}
      <Card className="mb-3">
        <Card.Body className="p-2">
          <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer>
              {viewMode === 'overlay' ? (
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#444" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDateMobile}
                    stroke="#666"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis hide />
                  <RechartsTooltip content={<MobileTooltip />} />
                  
                  {/* Normalized lines for overlay */}
                  <Line 
                    type="monotone" 
                    dataKey="btcNormalized" 
                    stroke="#FFA500" 
                    strokeWidth={2}
                    dot={false}
                    name="Bitcoin"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="economicNormalized" 
                    stroke="#00D4FF" 
                    strokeWidth={2}
                    dot={false}
                    name={currentIndicatorInfo?.name || selectedIndicator}
                  />
                </LineChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#444" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDateMobile}
                    stroke="#666"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis hide />
                  <RechartsTooltip content={<MobileTooltip />} />
                  
                  {/* Show only Bitcoin price for separate view */}
                  <Line 
                    type="monotone" 
                    dataKey="btcPrice" 
                    stroke="#FFA500" 
                    strokeWidth={2}
                    dot={false}
                    name="Bitcoin Price"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          
          {/* Mobile Legend */}
          <div className="d-flex justify-content-center mt-2 gap-3" style={{ fontSize: '11px' }}>
            <div className="d-flex align-items-center">
              <div className="me-1" style={{ 
                width: '12px', 
                height: '2px', 
                backgroundColor: '#FFA500' 
              }}></div>
              Bitcoin
            </div>
            {viewMode === 'overlay' && (
              <div className="d-flex align-items-center">
                <div className="me-1" style={{ 
                  width: '12px', 
                  height: '2px', 
                  backgroundColor: '#00D4FF' 
                }}></div>
                {currentIndicatorInfo?.name || selectedIndicator}
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Analysis Panel */}
      {correlation !== null && (
        <Card className="mb-3">
          <Card.Header 
            className="py-2"
            onClick={() => setShowAnalysis(!showAnalysis)}
            style={{ cursor: 'pointer' }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold">Quick Analysis</span>
              {showAnalysis ? <BsChevronUp /> : <BsChevronDown />}
            </div>
          </Card.Header>
          
          <Collapse in={showAnalysis}>
            <Card.Body className="py-2">
              <div className="text-center mb-2">
                <div className="display-6 fw-bold" style={{ 
                  color: Math.abs(correlation) > 0.6 ? '#fd7e14' : Math.abs(correlation) > 0.3 ? '#20c997' : '#6c757d' 
                }}>
                  {(correlation * 100).toFixed(1)}%
                </div>
                <div className="small text-muted">
                  {Math.abs(correlation) > 0.6 ? 'Strong' : Math.abs(correlation) > 0.3 ? 'Moderate' : 'Weak'} 
                  {correlation > 0 ? ' Positive' : ' Negative'} Correlation
                </div>
              </div>
              
              <div className="small text-muted text-center">
                {correlation > 0.6 
                  ? `${currentIndicatorInfo?.name || selectedIndicator} and Bitcoin tend to move strongly in the same direction.`
                  : correlation < -0.6
                  ? `${currentIndicatorInfo?.name || selectedIndicator} and Bitcoin tend to move strongly in opposite directions.`
                  : correlation > 0.3
                  ? `${currentIndicatorInfo?.name || selectedIndicator} and Bitcoin show some tendency to move together.`
                  : correlation < -0.3
                  ? `${currentIndicatorInfo?.name || selectedIndicator} and Bitcoin show some tendency to move oppositely.`
                  : `${currentIndicatorInfo?.name || selectedIndicator} and Bitcoin show little correlation.`
                }
              </div>
            </Card.Body>
          </Collapse>
        </Card>
      )}
    </div>
  );
};

MobileEconomicView.propTypes = {
  initialIndicator: PropTypes.string,
  initialTimeRange: PropTypes.string
};

export default MobileEconomicView;
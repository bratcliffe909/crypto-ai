import React, { useState } from 'react';
import { Card, Row, Col, Badge, Spinner, Alert, ProgressBar, Form } from 'react-bootstrap';
import { Line } from 'recharts';
import { LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import useApi from '../../hooks/useApi';

const TechnicalIndicators = () => {
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const { data, loading, error, lastFetch } = useApi(`/api/crypto/indicators/${selectedCoin}`, 30000);
  
  const coins = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'BNB', name: 'Binance Coin' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'XRP', name: 'Ripple' },
    { symbol: 'ADA', name: 'Cardano' }
  ];
  
  const getSignalBadgeVariant = (signal) => {
    switch (signal) {
      case 'Strong Buy':
        return 'success';
      case 'Buy':
        return 'success';
      case 'Neutral':
      case 'Hold':
        return 'secondary';
      case 'Sell':
        return 'warning';
      case 'Strong Sell':
        return 'danger';
      default:
        return 'secondary';
    }
  };
  
  const getRSIColor = (value) => {
    if (value >= 70) return 'danger';
    if (value >= 60) return 'warning';
    if (value <= 30) return 'success';
    if (value <= 40) return 'info';
    return 'secondary';
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  const timeSince = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-graph-up me-2"></i>
            Technical Indicators
          </h5>
          <div className="d-flex align-items-center gap-2">
            <Form.Select 
              size="sm" 
              value={selectedCoin} 
              onChange={(e) => setSelectedCoin(e.target.value)}
              style={{ width: 'auto' }}
            >
              {coins.map(coin => (
                <option key={coin.symbol} value={coin.symbol}>
                  {coin.name} ({coin.symbol})
                </option>
              ))}
            </Form.Select>
            {lastFetch && (
              <small className="text-muted">Updated {timeSince(lastFetch)}</small>
            )}
          </div>
        </div>
      </Card.Header>
      <Card.Body>
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Loading indicators...</p>
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
            {/* Current Price Section */}
            <Row className="mb-4">
              <Col>
                <div className="text-center">
                  <h6 className="text-muted mb-1">{data.symbol}/USD</h6>
                  <h3 className="mb-0">
                    ${data.currentPrice?.toLocaleString() || 'N/A'}
                  </h3>
                  {data.priceChange24h && (
                    <Badge bg={data.priceChange24h >= 0 ? 'success' : 'danger'}>
                      {data.priceChange24h >= 0 ? '+' : ''}{data.priceChange24h.toFixed(2)}%
                    </Badge>
                  )}
                </div>
              </Col>
            </Row>
            
            {/* RSI Section */}
            {data.indicators?.rsi && (
              <div className="mb-4">
                <h6 className="mb-3">RSI (14)</h6>
                <Row className="align-items-center mb-2">
                  <Col xs={8}>
                    <ProgressBar 
                      now={data.indicators.rsi.value} 
                      variant={getRSIColor(data.indicators.rsi.value)}
                      label={`${data.indicators.rsi.value}`}
                    />
                  </Col>
                  <Col xs={4} className="text-end">
                    <Badge bg={getSignalBadgeVariant(data.indicators.rsi.interpretation.signal)}>
                      {data.indicators.rsi.interpretation.signal}
                    </Badge>
                  </Col>
                </Row>
                <small className="text-muted">{data.indicators.rsi.interpretation.description}</small>
                
                {/* RSI Chart */}
                {data.history?.rsi && data.history.rsi.length > 0 && (
                  <div className="mt-3">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={data.history.rsi}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          interval="preserveStartEnd"
                        />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value) => [`${typeof value === 'number' ? value : '0'}`, 'RSI']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <ReferenceLine y={70} stroke="#dc3545" strokeDasharray="5 5" label="Overbought" />
                        <ReferenceLine y={30} stroke="#28a745" strokeDasharray="5 5" label="Oversold" />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#0d6efd" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
            
            {/* MACD Section */}
            {data.indicators?.macd && (
              <div className="mb-4">
                <h6 className="mb-3">MACD (12, 26, 9)</h6>
                <Row className="mb-2">
                  <Col>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-muted d-block">MACD Line</small>
                        <strong>{data.indicators.macd.macd}</strong>
                      </div>
                      <div>
                        <small className="text-muted d-block">Signal Line</small>
                        <strong>{data.indicators.macd.signal}</strong>
                      </div>
                      <div>
                        <small className="text-muted d-block">Histogram</small>
                        <strong className={data.indicators.macd.histogram >= 0 ? 'text-success' : 'text-danger'}>
                          {data.indicators.macd.histogram}
                        </strong>
                      </div>
                      <div>
                        <Badge bg={getSignalBadgeVariant(data.indicators.macd.interpretation.signal)}>
                          {data.indicators.macd.interpretation.signal}
                        </Badge>
                      </div>
                    </div>
                  </Col>
                </Row>
                <small className="text-muted">{data.indicators.macd.interpretation.description}</small>
                
                {/* MACD Chart */}
                {data.history?.macd && data.history.macd.length > 0 && (
                  <div className="mt-3">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={data.history.macd}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          interval="preserveStartEnd"
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [typeof value === 'number' ? value.toFixed(4) : value, name]}
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="macd" 
                          stroke="#0d6efd" 
                          strokeWidth={2}
                          dot={false}
                          name="MACD"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="signal" 
                          stroke="#dc3545" 
                          strokeWidth={2}
                          dot={false}
                          name="Signal"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
            
            {/* No data message */}
            {(!data.indicators?.rsi && !data.indicators?.macd) && (
              <div className="text-center text-muted py-4">
                <i className="bi bi-info-circle me-2"></i>
                <div>No indicator data available</div>
                <small className="d-block mt-2">
                  Technical indicators are temporarily unavailable due to API rate limits.
                  <br />
                  Please try again later or select a different cryptocurrency.
                </small>
              </div>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default TechnicalIndicators;
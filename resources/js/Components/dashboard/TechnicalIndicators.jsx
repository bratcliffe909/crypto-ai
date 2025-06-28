import React, { useState } from 'react';
import { Card, Row, Col, Badge, Spinner, Alert, ProgressBar, Form } from 'react-bootstrap';
import { Line, Area, ComposedChart } from 'recharts';
import { LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
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
            RSI
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
            
            {/* RSI Section */}
            {data.indicators?.rsi && (
              <div className="mb-4">
                <div className="text-center mb-3">
                  <div className="d-flex align-items-center justify-content-center gap-3">
                    <h6 className="mb-0">RSI (14-Period)</h6>
                    <span className="h4 mb-0">{data.indicators.rsi.value}</span>
                    <Badge bg={getSignalBadgeVariant(data.indicators.rsi.interpretation.signal)}>
                      {data.indicators.rsi.interpretation.signal}
                    </Badge>
                  </div>
                </div>
                
                {/* RSI Chart */}
                {data.history?.rsi && data.history.rsi.length > 0 && (
                  <div className="mt-3">
                    <ResponsiveContainer width="100%" height={250}>
                      <ComposedChart data={data.history.rsi} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="rsiGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#dc3545" stopOpacity={0.3} />
                            <stop offset="30%" stopColor="#dc3545" stopOpacity={0.1} />
                            <stop offset="40%" stopColor="#6c757d" stopOpacity={0.05} />
                            <stop offset="60%" stopColor="#6c757d" stopOpacity={0.05} />
                            <stop offset="70%" stopColor="#198754" stopOpacity={0.1} />
                            <stop offset="100%" stopColor="#198754" stopOpacity={0.3} />
                          </linearGradient>
                        </defs>
                        
                        {/* Colored zones */}
                        <ReferenceArea y1={70} y2={100} fill="#dc3545" fillOpacity={0.1} />
                        <ReferenceArea y1={30} y2={70} fill="#6c757d" fillOpacity={0.05} />
                        <ReferenceArea y1={0} y2={30} fill="#198754" fillOpacity={0.1} />
                        
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          interval="preserveStartEnd"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          ticks={[0, 30, 50, 70, 100]}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value) => [`${typeof value === 'number' ? value.toFixed(1) : '0'}`, 'RSI']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                          }}
                        />
                        
                        {/* Reference lines with labels */}
                        <ReferenceLine 
                          y={70} 
                          stroke="#dc3545" 
                          strokeDasharray="5 5" 
                          strokeWidth={2}
                        />
                        <ReferenceLine 
                          y={50} 
                          stroke="#6c757d" 
                          strokeDasharray="3 3" 
                          strokeWidth={1}
                        />
                        <ReferenceLine 
                          y={30} 
                          stroke="#198754" 
                          strokeDasharray="5 5" 
                          strokeWidth={2}
                        />
                        
                        {/* Area under the line for better visualization */}
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          fill="url(#rsiGradient)"
                          stroke="none"
                        />
                        
                        {/* Main RSI line */}
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#0d6efd" 
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                    
                    {/* Zone labels */}
                    <div className="d-flex justify-content-between mt-2 small">
                      <span className="text-danger">
                        <i className="bi bi-circle-fill me-1" style={{ fontSize: '8px' }}></i>
                        Overbought (70-100)
                      </span>
                      <span className="text-muted">
                        <i className="bi bi-circle-fill me-1" style={{ fontSize: '8px' }}></i>
                        Neutral (30-70)
                      </span>
                      <span className="text-success">
                        <i className="bi bi-circle-fill me-1" style={{ fontSize: '8px' }}></i>
                        Oversold (0-30)
                      </span>
                    </div>
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
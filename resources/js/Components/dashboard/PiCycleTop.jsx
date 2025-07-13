import React from 'react';
import { Card, Alert } from 'react-bootstrap';
import { BsInfoCircleFill } from 'react-icons/bs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Dot } from 'recharts';
import useApi from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import Tooltip from '../common/Tooltip';
import TimeAgo from '../common/TimeAgo';

const PiCycleTop = () => {
  const { data: rawData, loading, error, lastFetch } = useApi('/api/crypto/pi-cycle-top', 60000);
  const chartRef = React.useRef(null);

  // Process data for the chart
  const processedData = React.useMemo(() => {
    if (!rawData || !Array.isArray(rawData)) return [];
    
    // Only return data points that have at least one indicator
    return rawData.filter(d => d.ma111 !== null || d.ma350x2 !== null);
  }, [rawData]);

  // Find crossover points from the processed data
  const crossoverPoints = React.useMemo(() => {
    if (!processedData || processedData.length === 0) return [];
    
    const crossovers = processedData.filter(d => d.isCrossover === true);
    console.log('Pi Cycle Top - Found crossovers:', crossovers.length, crossovers);
    return crossovers;
  }, [processedData]);
  
  // Estimate next top
  const estimateNextTop = () => {
    if (!processedData || processedData.length === 0) return null;
    
    const latestData = processedData[processedData.length - 1];
    if (!latestData || !latestData.ma111 || !latestData.ma350x2) return null;
    
    const ma111 = latestData.ma111;
    const ma350x2 = latestData.ma350x2;
    const gap = ma350x2 - ma111;
    const gapPercentage = (gap / ma111) * 100;
    
    // Rough estimation based on gap percentage
    let daysUntilCross = null;
    let estimatedDate = null;
    
    if (gap > 0 && gapPercentage < 50) {
      // Very rough estimation - would need historical convergence rates
      daysUntilCross = Math.round(gap / (ma111 * 0.002)); // Assuming 0.2% daily convergence
      estimatedDate = new Date();
      estimatedDate.setDate(estimatedDate.getDate() + daysUntilCross);
    }
    
    return {
      gap,
      gapPercentage,
      daysUntilCross,
      estimatedDate,
      ma111,
      ma350x2
    };
  };

  const estimation = estimateNextTop();

  // Custom dot component for crossovers
  const CrossoverDot = (props) => {
    const { cx, cy, payload } = props;
    
    if (!payload || !payload.isCrossover) {
      return null;
    }
    
    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill="yellow" />
        <text 
          x={cx} 
          y={cy - 15} 
          textAnchor="middle" 
          fill="white" 
          fontSize="12"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px black' }}
        >
          {formatDate(payload.date)}
        </text>
        <text 
          x={cx} 
          y={cy - 30} 
          textAnchor="middle" 
          fill="white" 
          fontSize="12"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px black' }}
        >
          {formatPrice(payload.price)}
        </text>
      </g>
    );
  };

  const formatPrice = (value) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const isCrossover = payload[0]?.payload?.isCrossover;
      return (
        <div className="bg-dark p-2 rounded border">
          <p className="text-light mb-1">{formatDate(label)}</p>
          {isCrossover && (
            <p className="text-warning fw-bold mb-1">🔔 Pi Cycle Top Signal!</p>
          )}
          {payload.map((entry, index) => (
            <p key={index} className="mb-0" style={{ color: entry.color }}>
              {entry.name}: {formatPrice(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };


  if (loading && !rawData) {
    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Pi Cycle Top Indicator</h5>
        </Card.Header>
        <Card.Body>
          <LoadingSpinner />
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Pi Cycle Top Indicator</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Unable to load Pi Cycle Top data
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!processedData || processedData.length === 0) {
    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Pi Cycle Top Indicator</h5>
        </Card.Header>
        <Card.Body>
          <p className="text-muted">No data available</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <h5 className="mb-0">Pi Cycle Top Indicator</h5>
          <Tooltip content="The Pi Cycle Top Indicator uses the 111 day moving average (111DMA) and a newly created multiple of the 350 day moving average, the 350DMA x 2. When the 111DMA crosses above the 350DMA x 2, it has historically marked major Bitcoin price tops.">
            <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
          </Tooltip>
        </div>
        {lastFetch && <TimeAgo date={lastFetch} />}
      </Card.Header>
      <Card.Body>
        {/* Market Status */}
        {estimation && (
          <div className="text-center mb-3">
            <div className="d-flex justify-content-center align-items-center gap-3">
              <div>
                <small className="text-muted">Current Gap:</small> <strong>{estimation.gapPercentage.toFixed(1)}%</strong>
              </div>
              <div className="text-muted">•</div>
              <div>
                <small className="text-muted">111 DMA:</small> <strong>{formatPrice(estimation.ma111)}</strong>
              </div>
              <div className="text-muted">•</div>
              <div>
                <small className="text-muted">350 DMA x2:</small> <strong>{formatPrice(estimation.ma350x2)}</strong>
              </div>
              {estimation.estimatedDate && (
                <>
                  <div className="text-muted">•</div>
                  <div>
                    <small className="text-muted">Est. Cross:</small> <strong>{estimation.daysUntilCross} days</strong>
                  </div>
                </>
              )}
            </div>
          </div>
        )}


        {/* Data Range Info */}
        {processedData.length > 0 && (
          <div className="text-center mb-2">
            <small className="text-muted">
              Showing data from {formatDate(processedData[0].date)} to {formatDate(processedData[processedData.length - 1].date)}
              ({processedData.length} data points)
            </small>
          </div>
        )}

        {/* Chart */}
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#666"
                interval="preserveStartEnd"
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                tickFormatter={formatPrice}
                stroke="#666"
              />
              <RechartsTooltip content={<CustomTooltip />} />
              
              {/* Bitcoin Price line with crossover dots */}
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#FFA500" 
                strokeWidth={1.5}
                dot={<CrossoverDot />}
                name="BTC Price"
              />
              
              {/* 111 DMA */}
              <Line 
                type="monotone" 
                dataKey="ma111" 
                stroke="#00ff88" 
                strokeWidth={2}
                dot={false}
                name="111 DMA"
              />
              
              {/* 350 DMA x 2 */}
              <Line 
                type="monotone" 
                dataKey="ma350x2" 
                stroke="#ff3366" 
                strokeWidth={2}
                dot={false}
                name="350 DMA x2"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Compact Legend */}
        <div className="d-flex justify-content-center mt-2 gap-3" style={{ fontSize: '12px' }}>
          <span>
            <span style={{ display: 'inline-block', width: '15px', height: '2px', backgroundColor: '#FFA500', marginRight: '4px', verticalAlign: 'middle' }}></span>
            BTC Price
          </span>
          <span>
            <span style={{ display: 'inline-block', width: '15px', height: '2px', backgroundColor: '#00ff88', marginRight: '4px', verticalAlign: 'middle' }}></span>
            111 DMA
          </span>
          <span>
            <span style={{ display: 'inline-block', width: '15px', height: '2px', backgroundColor: '#ff3366', marginRight: '4px', verticalAlign: 'middle' }}></span>
            350 DMA x2
          </span>
          {crossoverPoints.length > 0 && (
            <span>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'yellow', border: '3px solid black', borderRadius: '50%', marginRight: '4px', verticalAlign: 'middle', position: 'relative' }}>
                <span style={{ position: 'absolute', top: '3px', left: '3px', width: '6px', height: '6px', backgroundColor: 'red', borderRadius: '50%' }}></span>
              </span>
              Top Signal
            </span>
          )}
        </div>

      </Card.Body>
    </Card>
  );
};

export default PiCycleTop;
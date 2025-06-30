import React, { useState, useMemo } from 'react';
import { Card, Alert, ButtonGroup, Button } from 'react-bootstrap';
import { BsInfoCircleFill } from 'react-icons/bs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import useApi from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import Tooltip from '../common/Tooltip';
import TimeAgo from '../common/TimeAgo';

const CycleLowMultiple = () => {
  const [timeRange, setTimeRange] = useState('max');
  const { data: rawData, loading, error, lastFetch } = useApi(`/api/crypto/cycle-low-multiple?days=${timeRange}`, 300000); // 5 minutes cache


  // Process data for the chart
  const chartData = useMemo(() => {
    if (!rawData?.data || !Array.isArray(rawData.data)) return [];
    
    // Filter data based on time range
    let filteredData = rawData.data;
    if (timeRange !== 'max') {
      const now = new Date();
      const daysToShow = parseInt(timeRange);
      const cutoffDate = new Date(now.getTime() - (daysToShow * 24 * 60 * 60 * 1000));
      
      filteredData = rawData.data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= cutoffDate;
      });
    }
    
    return filteredData;
  }, [rawData, timeRange]);

  const formatMultiple = (value) => {
    return `${value.toFixed(1)}x`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-dark p-3 rounded border">
          <p className="text-light mb-2">{new Date(label).toLocaleDateString()}</p>
          <p className="mb-1" style={{ color: '#FFA500' }}>
            Multiple: {formatMultiple(data.multiple)}
          </p>
          <p className="mb-1 text-muted small">
            Price: ${data.price.toLocaleString()}
          </p>
          <p className="mb-0 text-muted small">
            Era {data.era} • Day {Math.abs(data.daysSinceHalving)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Get current status
  const currentStatus = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    return chartData[chartData.length - 1];
  }, [chartData]);

  // Calculate notable thresholds
  const thresholds = useMemo(() => {
    if (!rawData?.metadata) return [];
    
    // Common psychological levels
    return [
      { value: 1, label: '1x - Previous Cycle Low', color: '#666' },
      { value: 5, label: '5x', color: '#888' },
      { value: 10, label: '10x', color: '#aaa' },
      { value: 20, label: '20x', color: '#ccc' },
    ];
  }, [rawData]);

  if (loading && !rawData) {
    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Bitcoin Cycle Low Multiple</h5>
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
          <h5 className="mb-0">Bitcoin Cycle Low Multiple</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Unable to load Cycle Low Multiple data
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  // Era colors for background shading
  const eraColors = {
    0: '#1a1a2e', // Pre-halving era (dark blue)
    1: '#16213e', // Era 1 (dark blue-gray)
    2: '#0f3460', // Era 2 (midnight blue)
    3: '#533483', // Era 3 (purple)
    4: '#c7417b', // Era 4 (pink/red)
    5: '#f37748', // Era 5 (orange)
  };

  // Get halving dates from metadata
  const halvingDates = rawData?.metadata?.halvingDates || {};
  
  // Create era regions for the chart
  const eraRegions = useMemo(() => {
    if (!chartData || chartData.length === 0 || !halvingDates) return [];
    
    const regions = [];
    const sortedData = [...chartData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstDate = sortedData[0].date;
    const lastDate = sortedData[sortedData.length - 1].date;
    
    // Add regions for each era visible in the chart
    Object.entries(halvingDates).forEach(([era, date]) => {
      const eraNum = parseInt(era);
      const halvingDate = new Date(date);
      
      // Find the next halving date
      const nextHalving = halvingDates[eraNum + 1];
      const nextDate = nextHalving ? new Date(nextHalving) : new Date(lastDate);
      
      // Only add regions that are visible in the current data
      if (halvingDate <= new Date(lastDate) && (eraNum === 0 || halvingDate >= new Date(firstDate))) {
        regions.push({
          era: eraNum,
          x1: halvingDate < new Date(firstDate) ? firstDate : date,
          x2: nextDate > new Date(lastDate) ? lastDate : nextHalving || lastDate,
          color: eraColors[eraNum] || '#333333'
        });
      }
    });
    
    // Add region for pre-halving era if needed
    const firstHalving = new Date(halvingDates[1]);
    if (new Date(firstDate) < firstHalving) {
      regions.unshift({
        era: 0,
        x1: firstDate,
        x2: halvingDates[1],
        color: eraColors[0]
      });
    }
    
    return regions;
  }, [chartData, halvingDates]);

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Bitcoin Cycle Low Multiple</h5>
        </Card.Header>
        <Card.Body>
          <p className="text-muted">No data available</p>
        </Card.Body>
      </Card>
    );
  }

  const minMultiple = Math.min(...chartData.map(d => d.multiple));
  const maxMultiple = Math.max(...chartData.map(d => d.multiple));

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <h5 className="mb-0">Bitcoin Cycle Low Multiple</h5>
          <Tooltip content="The Cycle Low Multiple shows how many times higher the current Bitcoin price is compared to the lowest price of the previous halving cycle. This helps identify where we are in the current market cycle.">
            <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
          </Tooltip>
        </div>
        {lastFetch && <TimeAgo date={lastFetch} />}
      </Card.Header>
      <Card.Body>
        {/* Current Status */}
        {currentStatus && (
          <div className="text-center mb-3">
            <div className="d-flex justify-content-center align-items-center gap-3">
              <div>
                <small className="text-muted">Current Multiple:</small>{' '}
                <strong style={{ fontSize: '1.2rem', color: '#FFA500' }}>
                  {formatMultiple(currentStatus.multiple)}
                </strong>
              </div>
              <div className="text-muted">•</div>
              <div>
                <small className="text-muted">Era {currentStatus.era}</small>{' '}
                <span className="text-muted small">
                  (Day {Math.abs(currentStatus.daysSinceHalving)})
                </span>
              </div>
            </div>
            <div className="mt-1">
              <small className="text-muted">
                Previous cycle low: ${currentStatus.previousEraLow?.toLocaleString() || 'N/A'}
              </small>
            </div>
          </div>
        )}

        {/* Time Range Selector */}
        <div className="text-center mb-3">
          <ButtonGroup size="sm">
            <Button 
              variant={timeRange === '365' ? 'primary' : 'outline-secondary'}
              onClick={() => setTimeRange('365')}
            >
              1Y
            </Button>
            <Button 
              variant={timeRange === '730' ? 'primary' : 'outline-secondary'}
              onClick={() => setTimeRange('730')}
            >
              2Y
            </Button>
            <Button 
              variant={timeRange === '1826' ? 'primary' : 'outline-secondary'}
              onClick={() => setTimeRange('1826')}
            >
              5Y
            </Button>
            <Button 
              variant={timeRange === 'max' ? 'primary' : 'outline-secondary'}
              onClick={() => setTimeRange('max')}
            >
              All
            </Button>
          </ButtonGroup>
        </div>

        {/* Chart */}
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#666"
                interval={timeRange === '365' ? 30 : timeRange === '730' ? 60 : timeRange === '1826' ? 120 : 'preserveStartEnd'}
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 11 }}
                minTickGap={50}
              />
              <YAxis 
                tickFormatter={formatMultiple}
                stroke="#666"
                domain={[0, Math.ceil(maxMultiple / 5) * 5]}
                ticks={Array.from({ length: Math.ceil(maxMultiple / 5) + 1 }, (_, i) => i * 5)}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              
              {/* Era background regions */}
              {eraRegions.map((region, index) => (
                <ReferenceArea
                  key={index}
                  x1={region.x1}
                  x2={region.x2}
                  fill={region.color}
                  fillOpacity={0.15}
                  label={{
                    value: `Era ${region.era}`,
                    position: 'insideTop',
                    fill: '#999',
                    fontSize: 12
                  }}
                />
              ))}
              
              {/* Halving date vertical lines */}
              {Object.entries(halvingDates).map(([era, date]) => {
                const eraNum = parseInt(era);
                if (eraNum === 0) return null; // Skip era 0 as it's not a halving
                
                // Only show if the date is within the visible range
                const dateObj = new Date(date);
                const firstDataDate = new Date(chartData[0].date);
                const lastDataDate = new Date(chartData[chartData.length - 1].date);
                
                if (dateObj >= firstDataDate && dateObj <= lastDataDate) {
                  return (
                    <ReferenceLine
                      key={era}
                      x={date}
                      stroke="#666"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      label={{
                        value: `Halving ${eraNum}`,
                        position: 'top',
                        fill: '#aaa',
                        fontSize: 10,
                        offset: 10
                      }}
                    />
                  );
                }
                return null;
              })}
              
              {/* Reference lines for key multiples */}
              {thresholds.map(threshold => (
                threshold.value <= maxMultiple && (
                  <ReferenceLine
                    key={threshold.value}
                    y={threshold.value}
                    stroke={threshold.color}
                    strokeDasharray="3 3"
                    label={{ value: threshold.label, position: 'right', style: { fontSize: 10, fill: threshold.color } }}
                  />
                )
              ))}
              
              {/* Cycle Low Multiple Line */}
              <Line 
                type="monotone" 
                dataKey="multiple" 
                stroke="#FFA500" 
                strokeWidth={2}
                dot={false}
                name="Cycle Low Multiple"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Era Information Legend */}
        <div className="mt-3">
          <div className="text-center mb-2">
            <small className="text-muted fw-bold">Bitcoin Halving Eras</small>
          </div>
          <div className="d-flex justify-content-center flex-wrap gap-2">
            {Object.entries(halvingDates).map(([era, date]) => {
              const eraNum = parseInt(era);
              if (eraNum === 0) return null;
              
              const blockRewards = {
                1: '50 BTC',
                2: '25 BTC', 
                3: '12.5 BTC',
                4: '6.25 BTC',
                5: '3.125 BTC'
              };
              
              return (
                <div key={era} className="d-flex align-items-center">
                  <div 
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      backgroundColor: eraColors[eraNum] || '#333',
                      opacity: 0.5,
                      marginRight: '4px',
                      borderRadius: '2px'
                    }} 
                  />
                  <small className="text-muted">
                    Era {eraNum} ({blockRewards[eraNum]}) - {new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </small>
                </div>
              );
            })}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default CycleLowMultiple;
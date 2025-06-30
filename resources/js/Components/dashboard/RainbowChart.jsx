import React, { useState, useMemo } from 'react';
import { Card, Alert, ButtonGroup, Button } from 'react-bootstrap';
import { BsClock, BsInfoCircleFill } from 'react-icons/bs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import useApi from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import Tooltip from '../common/Tooltip';

const RainbowChart = () => {
  const [timeRange, setTimeRange] = useState('max');
  const { data: rawData, loading, error, lastFetch } = useApi(`/api/crypto/rainbow-chart?days=${timeRange}`, 300000); // 5 minutes cache

  // Format time ago
  const getTimeAgo = (date) => {
    if (!date) return '';
    
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 120) return '1 minute ago';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 7200) return '1 hour ago';
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    
    return 'over a day ago';
  };

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

  const formatPrice = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
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
      return (
        <div className="bg-dark p-3 rounded border">
          <p className="text-light mb-0">{new Date(label).toLocaleDateString()}</p>
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

  if (loading && !rawData) {
    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Bitcoin Rainbow Chart</h5>
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
          <h5 className="mb-0">Bitcoin Rainbow Chart</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Unable to load Rainbow Chart data
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Bitcoin Rainbow Chart</h5>
        </Card.Header>
        <Card.Body>
          <p className="text-muted">No data available</p>
        </Card.Body>
      </Card>
    );
  }

  const bandColors = rawData?.metadata?.bandColors || {};
  const bandLabels = rawData?.metadata?.bandLabels || {};

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <h5 className="mb-0">Bitcoin Rainbow Chart</h5>
          <Tooltip content="The Rainbow Chart uses a logarithmic regression to predict Bitcoin's potential price movements. Each color band represents different market sentiment levels, from 'Fire Sale' (blue) to 'Maximum Bubble Territory' (red). This is for entertainment purposes only and should not be used as investment advice.">
            <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
          </Tooltip>
        </div>
        {lastFetch && (
          <small className="text-muted d-flex align-items-center">
            <BsClock size={12} className="me-1" />
            {getTimeAgo(lastFetch)}
          </small>
        )}
      </Card.Header>
      <Card.Body>

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
              <defs>
                {/* Create gradients between bands */}
                <linearGradient id="band9Fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={bandColors.band9} stopOpacity={0.3}/>
                  <stop offset="100%" stopColor={bandColors.band8} stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="band8Fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={bandColors.band8} stopOpacity={0.3}/>
                  <stop offset="100%" stopColor={bandColors.band7} stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="band7Fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={bandColors.band7} stopOpacity={0.3}/>
                  <stop offset="100%" stopColor={bandColors.band6} stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="band6Fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={bandColors.band6} stopOpacity={0.3}/>
                  <stop offset="100%" stopColor={bandColors.band5} stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="band5Fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={bandColors.band5} stopOpacity={0.3}/>
                  <stop offset="100%" stopColor={bandColors.band4} stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="band4Fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={bandColors.band4} stopOpacity={0.3}/>
                  <stop offset="100%" stopColor={bandColors.band3} stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="band3Fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={bandColors.band3} stopOpacity={0.3}/>
                  <stop offset="100%" stopColor={bandColors.band2} stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="band2Fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={bandColors.band2} stopOpacity={0.3}/>
                  <stop offset="100%" stopColor={bandColors.band1} stopOpacity={0.3}/>
                </linearGradient>
              </defs>
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
                tickFormatter={formatPrice}
                stroke="#666"
                scale="log"
                domain={['dataMin', 'dataMax']}
                ticks={[100, 1000, 10000, 100000, 1000000]}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              
              {/* Rainbow Band Lines */}
              <Line type="monotone" dataKey="bands.band9" stroke={bandColors.band9} strokeWidth={1} dot={false} opacity={0.7} />
              <Line type="monotone" dataKey="bands.band8" stroke={bandColors.band8} strokeWidth={1} dot={false} opacity={0.7} />
              <Line type="monotone" dataKey="bands.band7" stroke={bandColors.band7} strokeWidth={1} dot={false} opacity={0.7} />
              <Line type="monotone" dataKey="bands.band6" stroke={bandColors.band6} strokeWidth={1} dot={false} opacity={0.7} />
              <Line type="monotone" dataKey="bands.band5" stroke={bandColors.band5} strokeWidth={1} dot={false} opacity={0.7} />
              <Line type="monotone" dataKey="bands.band4" stroke={bandColors.band4} strokeWidth={1} dot={false} opacity={0.7} />
              <Line type="monotone" dataKey="bands.band3" stroke={bandColors.band3} strokeWidth={1} dot={false} opacity={0.7} />
              <Line type="monotone" dataKey="bands.band2" stroke={bandColors.band2} strokeWidth={1} dot={false} opacity={0.7} />
              <Line type="monotone" dataKey="bands.band1" stroke={bandColors.band1} strokeWidth={1} dot={false} opacity={0.7} />
              
              {/* Bitcoin Price Line */}
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#FFFFFF" 
                strokeWidth={1.5}
                dot={false}
                name="BTC Price"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  );
};

export default RainbowChart;
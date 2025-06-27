import React, { useEffect, useState } from 'react';
import { Card } from 'react-bootstrap';
import { BsExclamationTriangle, BsInfoCircleFill } from 'react-icons/bs';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import LoadingSpinner from '../common/LoadingSpinner';
import Tooltip from '../common/Tooltip';
import coingeckoApi from '../../services/api/coingecko';
import { formatPrice } from '../../utils/formatters';
import useInterval from '../../hooks/useInterval';

const BullMarketBand = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch current price
      let btcPrice = null;
      try {
        const priceData = await coingeckoApi.getSimplePrice('bitcoin', 'usd');
        btcPrice = priceData.bitcoin.usd;
        setCurrentPrice(btcPrice);
      } catch (priceErr) {
        console.error('Error fetching current price:', priceErr);
        // Continue without current price
        setCurrentPrice(null);
      }

      // Fetch 365 days of OHLC data from CoinGecko (1 year)
      const ohlcResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=365`
      );
      
      if (!ohlcResponse.ok) {
        if (ohlcResponse.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment.');
        }
        throw new Error(`API error: ${ohlcResponse.status}`);
      }
      
      const ohlcData = await ohlcResponse.json();

      if (Array.isArray(ohlcData) && ohlcData.length > 0) {
        // Process OHLC data into weekly candles
        const weeklyCandles = processWeeklyCandles(ohlcData);
        
        // Add current week's incomplete candle if needed
        const completedCandles = addCurrentWeekCandle(weeklyCandles, btcPrice);
        
        // Calculate SMA and EMA
        const chartData = calculateMovingAverages(completedCandles);
        
        setData(chartData);
      } else {
        throw new Error('No OHLC data available');
      }
    } catch (err) {
      console.error('Error fetching Bull Market Band data:', err);
      // More specific error messages
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        setError('Network error: Unable to connect to CoinGecko API');
      } else {
        setError(err.message || 'Failed to load chart data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Process OHLC data into weekly candles
  const processWeeklyCandles = (ohlcData) => {
    const weeklyData = {};
    
    // Group candles by week
    ohlcData.forEach(candle => {
      const date = new Date(candle[0]);
      const weekKey = getWeekKey(date);
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          timestamp: candle[0],
          date: date,
          candles: []
        };
      }
      
      weeklyData[weekKey].candles.push({
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4]
      });
    });

    // Aggregate weekly data
    const sortedWeeks = Object.keys(weeklyData).sort();
    return sortedWeeks.map(weekKey => {
      const week = weeklyData[weekKey];
      const candles = week.candles;
      
      return {
        timestamp: week.timestamp,
        date: new Date(week.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: new Date(week.date).getFullYear() !== new Date().getFullYear() ? '2-digit' : undefined
        }),
        open: candles[0].open,
        high: Math.max(...candles.map(c => c.high)),
        low: Math.min(...candles.map(c => c.low)),
        close: candles[candles.length - 1].close
      };
    });
  };

  const getWeekKey = (date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  };

  // Add current week's candle if it's not complete
  const addCurrentWeekCandle = (weeklyCandles, currentPrice) => {
    if (!weeklyCandles.length || !currentPrice) return weeklyCandles;
    
    const now = new Date();
    const currentWeekKey = getWeekKey(now);
    const lastCandle = weeklyCandles[weeklyCandles.length - 1];
    
    // Check if we already have data for the current week
    const lastCandleDate = new Date(lastCandle.timestamp);
    const lastCandleWeekKey = getWeekKey(lastCandleDate);
    
    if (lastCandleWeekKey === currentWeekKey) {
      // Update the last candle with current price
      lastCandle.close = currentPrice;
      lastCandle.high = Math.max(lastCandle.high, currentPrice);
      lastCandle.low = Math.min(lastCandle.low, currentPrice);
    } else {
      // Add a new candle for the current week
      weeklyCandles.push({
        timestamp: now.getTime(),
        date: now.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric'
        }),
        open: currentPrice,
        high: currentPrice,
        low: currentPrice,
        close: currentPrice,
        isCurrentWeek: true
      });
    }
    
    return weeklyCandles;
  };

  // Calculate moving averages
  const calculateMovingAverages = (weeklyCandles) => {
    return weeklyCandles.map((candle, index) => {
      const sma20 = calculateSMA(weeklyCandles, index, 20);
      const ema21 = calculateEMA(weeklyCandles, index, 21);
      
      return {
        ...candle,
        sma20: sma20,
        ema21: ema21
      };
    });
  };

  // Calculate Simple Moving Average
  const calculateSMA = (data, index, period) => {
    if (index < period - 1) return null;
    
    let sum = 0;
    for (let i = index - period + 1; i <= index; i++) {
      sum += data[i].close;
    }
    return sum / period;
  };

  // Calculate Exponential Moving Average
  const calculateEMA = (data, index, period) => {
    if (index === 0) return data[0].close;
    if (index < period - 1) return null;
    
    const multiplier = 2 / (period + 1);
    
    // Calculate initial SMA for first EMA value
    if (index === period - 1) {
      return calculateSMA(data, index, period);
    }
    
    // Get previous EMA from calculated data
    const prevEMA = data[index - 1].ema21 || calculateSMA(data, index - 1, period);
    
    // Calculate current EMA
    return (data[index].close - prevEMA) * multiplier + prevEMA;
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh every 30 seconds
  useInterval(() => {
    fetchData();
  }, 30000);

  const formatYAxis = (value) => {
    return `$${(value / 1000).toFixed(0)}k`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const candleData = payload[0]?.payload;
      return (
        <div className="bg-dark p-3 rounded border border-secondary">
          <p className="text-light mb-2 fw-bold">{label}</p>
          {candleData && (
            <>
              <div className="mb-2">
                <p className="mb-0 small">Open: {formatPrice(candleData.open)}</p>
                <p className="mb-0 small">High: {formatPrice(candleData.high)}</p>
                <p className="mb-0 small">Low: {formatPrice(candleData.low)}</p>
                <p className="mb-0 small" style={{ 
                  color: candleData.close >= candleData.open ? '#52C41A' : '#FF4757' 
                }}>
                  Close: {formatPrice(candleData.close)}
                </p>
              </div>
              {(candleData.sma20 || candleData.ema21) && (
                <div className="border-top pt-2 mt-2">
                  {candleData.sma20 && (
                    <p className="mb-0 small" style={{ color: '#52C41A' }}>
                      20W SMA: {formatPrice(candleData.sma20)}
                    </p>
                  )}
                  {candleData.ema21 && (
                    <p className="mb-0 small" style={{ color: '#FF4757' }}>
                      21W EMA: {formatPrice(candleData.ema21)}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Candlestick renderer - removed since it was causing scaling issues

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <h5 className="mb-0">Bitcoin Bull Market Support Band</h5>
          <Tooltip content="The 20-week SMA (green) and 21-week EMA (red) form the Bull Market Support Band. During bull markets, Bitcoin tends to bounce off this band. The band acts as support in uptrends and resistance in downtrends.">
            <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
          </Tooltip>
        </div>
        {error && (
          <BsExclamationTriangle className="text-warning" title={error} />
        )}
      </Card.Header>
      <Card.Body style={{ height: '400px' }}>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="text-center text-muted py-5">
            <BsExclamationTriangle size={48} className="mb-3" />
            <p>{error}</p>
          </div>
        ) : (
          <>
            {currentPrice && (
              <div className="text-center mb-3">
                <span className="text-muted">Current Price: </span>
                <span className="h5 mb-0">{formatPrice(currentPrice)}</span>
                {data.length > 0 && data[data.length - 1].sma20 && (
                  <>
                    <span className="text-muted ms-3">Band: </span>
                    <span className="text-success">{formatPrice(data[data.length - 1].sma20)}</span>
                    <span className="text-muted"> - </span>
                    <span className="text-danger">{formatPrice(data[data.length - 1].ema21)}</span>
                  </>
                )}
              </div>
            )}
            <ResponsiveContainer width="100%" height="90%">
              <ComposedChart 
                data={data} 
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="date" 
                  stroke="#666"
                  tick={{ fill: '#999', fontSize: 10 }}
                  interval={Math.floor(data.length / 12)}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#666"
                  tick={{ fill: '#999' }}
                  tickFormatter={formatYAxis}
                  domain={['auto', 'auto']}
                  scale="linear"
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ color: '#999' }}
                  iconType="line"
                />
                
                {/* Price line */}
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="#8884d8"
                  strokeWidth={1}
                  dot={false}
                  name="Price"
                  opacity={0.7}
                />
                
                {/* 20-week SMA (Green line) */}
                <Line
                  type="monotone"
                  dataKey="sma20"
                  stroke="#52C41A"
                  strokeWidth={1.5}
                  dot={false}
                  name="20W SMA"
                  connectNulls
                />
                
                {/* 21-week EMA (Red line) */}
                <Line
                  type="monotone"
                  dataKey="ema21"
                  stroke="#FF4757"
                  strokeWidth={1.5}
                  dot={false}
                  name="21W EMA"
                  connectNulls
                />
                
                {/* Current price reference line */}
                {currentPrice && (
                  <ReferenceLine 
                    y={currentPrice} 
                    stroke="#FFA940"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    label={{ 
                      value: "Current", 
                      position: "right", 
                      fill: "#FFA940",
                      fontSize: 12 
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default BullMarketBand;
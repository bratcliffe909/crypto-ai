import React from 'react';
import { format } from 'd3-format';
import { timeFormat } from 'd3-time-format';
import { BsClock, BsInfoCircleFill } from 'react-icons/bs';
import Tooltip from '../common/Tooltip';
import {
  ema,
  sma,
  ChartCanvas,
  Chart,
  CandlestickSeries,
  LineSeries,
  XAxis,
  YAxis,
  CrossHairCursor,
  EdgeIndicator,
  MouseCoordinateX,
  MouseCoordinateY,
  OHLCTooltip,
  MovingAverageTooltip,
  discontinuousTimeScaleProviderBuilder,
  lastVisibleItemBasedZoomAnchor,
} from 'react-financial-charts';
import useApi from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';

const BullMarketBand = () => {
  // Refresh every 5 minutes to avoid rate limits
  const { data: rawData, loading, error, lastFetch } = useApi('/api/crypto/bull-market-band', 300000);

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

  // Configure SMA(20)
  const sma20 = sma()
    .id('sma20')
    .options({ windowSize: 20 })
    .merge((d, c) => { d.sma20 = c; })
    .accessor(d => d.sma20);

  // Configure EMA(21)
  const ema21 = ema()
    .id('ema21')
    .options({ windowSize: 21 })
    .merge((d, c) => { d.ema21 = c; })
    .accessor(d => d.ema21);

  // Process data
  const processData = () => {
    if (!rawData || rawData.length === 0) return { data: [], xScale: null, xAccessor: null, displayXAccessor: null, xExtents: null };

    // Transform data to the format expected by react-financial-charts
    const transformedData = rawData.map((item, index) => ({
      date: new Date(item.date),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: 0, // Required field, set to 0 for weekly data
      idx: index,
      // Include pre-calculated indicators from backend
      sma20: item.sma20,
      ema21: item.ema21,
    }));

    // Apply indicators (they will merge with existing values if present)
    const dataWithIndicators = ema21(sma20(transformedData));

    // Configure time scale
    const xScaleProvider = discontinuousTimeScaleProviderBuilder()
      .inputDateAccessor(d => d.date);

    const { data, xScale, xAccessor, displayXAccessor } = xScaleProvider(dataWithIndicators);

    // Calculate view extents - focus on the last 26 weeks (half a year) but allow panning to see all data
    let xExtents = null;
    if (data.length > 0) {
      const endIndex = data.length - 1;
      const startIndex = Math.max(0, endIndex - 25); // Show last 26 weeks
      xExtents = [xAccessor(data[startIndex]), xAccessor(data[endIndex])];
    }

    return { data, xScale, xAccessor, displayXAccessor, xExtents };
  };

  const { data, xScale, xAccessor, displayXAccessor, xExtents } = processData();

  if (error) {
    return (
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Bitcoin Bull Market Support Band</h5>
        </div>
        <div className="card-body text-center text-muted py-5">
          <p className="mb-2">Unable to load Bull Market Band data</p>
          <small>{error && error.includes('rate limit') 
            ? 'API rate limit reached. Data will refresh automatically in a few minutes.' 
            : error}</small>
          <p className="mt-3 small">This is usually due to API rate limits. Please wait a few minutes for the data to refresh.</p>
        </div>
      </div>
    );
  }

  if (loading && !rawData) {
    return (
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Bitcoin Bull Market Support Band</h5>
        </div>
        <div className="card-body p-3" style={{ backgroundColor: '#1a1a1a', height: '446px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Bitcoin Bull Market Support Band</h5>
        </div>
        <div className="card-body text-center text-muted py-5">
          <p className="mb-2">No Bull Market Band data available</p>
          <small>Please check your connection and try again</small>
        </div>
      </div>
    );
  }

  // Chart configuration
  const margin = { left: 60, right: 110, top: 20, bottom: 30 };
  const pricesDisplayFormat = format(",.0f");
  const dateTimeFormat = "%b %d";
  const timeDisplayFormat = timeFormat(dateTimeFormat);

  // Calculate chart dimensions
  const chartHeight = 380 - margin.top - margin.bottom;
  const chartWidth = 820; // Will be responsive

  // Y extent function
  const yExtents = (data) => {
    return [data.high, data.low, data.sma20, data.ema21];
  };

  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <h5 className="mb-0">Bitcoin Bull Market Support Band</h5>
          <Tooltip content="Shows Bitcoin's weekly price candlesticks with two key moving averages that historically act as support during bull markets. The 20-week Simple Moving Average (green) and 21-week Exponential Moving Average (red) often provide buying opportunities when Bitcoin's price touches these lines during uptrends.">
            <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
          </Tooltip>
        </div>
        {lastFetch && (
          <small className="text-muted d-flex align-items-center">
            <BsClock size={12} className="me-1" />
            {getTimeAgo(lastFetch)}
          </small>
        )}
      </div>
      <div className="card-body p-3" style={{ backgroundColor: '#1a1a1a' }}>
        <div style={{ width: '100%', height: '400px', padding: '0 20px', overflow: 'hidden' }}>
          <ChartCanvas
            height={380}
            ratio={1}
            width={chartWidth}
            margin={margin}
            data={data}
            displayXAccessor={displayXAccessor}
            xScale={xScale}
            xAccessor={xAccessor}
            xExtents={xExtents}
            zoomAnchor={lastVisibleItemBasedZoomAnchor}
            clamp={false}
            maintainPointsPerPixelOnResize={false}
            mouseMoveEvent={true}
            panEvent={true}
            zoomEvent={true}
            onLoadMore={(start, end) => console.log("Load more data", start, end)}
          >
            <Chart id={1} yExtents={yExtents} height={chartHeight}>
              <XAxis
                axisAt="bottom"
                orient="bottom"
                stroke="#666"
                tickStroke="#666"
                fontFamily="monospace"
                fontSize={10}
                tickLabelFill="#999"
              />
              <YAxis
                axisAt="right"
                orient="right"
                ticks={8}
                stroke="#666"
                tickStroke="#666"
                fontFamily="monospace"
                fontSize={10}
                tickLabelFill="#999"
                tickFormat={pricesDisplayFormat}
              />
              <YAxis
                axisAt="left"
                orient="left"
                ticks={8}
                stroke="#666"
                tickStroke="#666"
                fontFamily="monospace"
                fontSize={10}
                tickLabelFill="#999"
                tickFormat={pricesDisplayFormat}
              />

              <MouseCoordinateX
                at="bottom"
                orient="bottom"
                displayFormat={timeDisplayFormat}
                stroke="#666"
                strokeWidth={1}
                fill="#1a1a1a"
                fontFamily="monospace"
                fontSize={10}
                rectWidth={80}
                rectHeight={20}
              />
              <MouseCoordinateY
                at="right"
                orient="right"
                displayFormat={pricesDisplayFormat}
                stroke="#666"
                strokeWidth={1}
                fill="#1a1a1a"
                fontFamily="monospace"
                fontSize={10}
                rectWidth={70}
                rectHeight={20}
              />
              <MouseCoordinateY
                at="left"
                orient="left"
                displayFormat={pricesDisplayFormat}
                stroke="#666"
                strokeWidth={1}
                fill="#1a1a1a"
                fontFamily="monospace"
                fontSize={10}
                rectWidth={70}
                rectHeight={20}
              />

              <CandlestickSeries
                stroke={d => d.close > d.open ? "#26A69A" : "#EF5350"}
                wickStroke={d => d.close > d.open ? "#26A69A" : "#EF5350"}
                fill={d => d.close > d.open ? "#26A69A" : "#EF5350"}
                candleStrokeWidth={1}
                wickStrokeWidth={1}
                opacity={1}
              />

              <LineSeries
                yAccessor={sma20.accessor()}
                strokeStyle="#52C41A"
                strokeWidth={2}
              />
              <LineSeries
                yAccessor={ema21.accessor()}
                strokeStyle="#FF4757"
                strokeWidth={2}
              />

              <EdgeIndicator
                itemType="last"
                orient="right"
                edgeAt="right"
                yAccessor={d => d.close}
                fill={d => d.close > d.open ? "#26A69A" : "#EF5350"}
                stroke={d => d.close > d.open ? "#26A69A" : "#EF5350"}
                fontFamily="monospace"
                fontSize={10}
                displayFormat={pricesDisplayFormat}
              />
              <EdgeIndicator
                itemType="last"
                orient="right"
                edgeAt="right"
                yAccessor={sma20.accessor()}
                fill="#52C41A"
                stroke="#52C41A"
                fontFamily="monospace"
                fontSize={10}
                displayFormat={pricesDisplayFormat}
              />
              <EdgeIndicator
                itemType="last"
                orient="right"
                edgeAt="right"
                yAccessor={ema21.accessor()}
                fill="#FF4757"
                stroke="#FF4757"
                fontFamily="monospace"
                fontSize={10}
                displayFormat={pricesDisplayFormat}
              />

              <OHLCTooltip
                origin={[10, 10]}
                textFill="#DDD"
                labelFill="#666"
                fontSize={12}
                fontFamily="monospace"
              />
              <MovingAverageTooltip
                origin={[10, 35]}
                options={[
                  {
                    yAccessor: sma20.accessor(),
                    type: "SMA",
                    stroke: "#52C41A",
                    windowSize: 20,
                  },
                  {
                    yAccessor: ema21.accessor(),
                    type: "EMA",
                    stroke: "#FF4757",
                    windowSize: 21,
                  },
                ]}
                textFill="#DDD"
                labelFill="#666"
                fontSize={12}
                fontFamily="monospace"
              />
            </Chart>
            <CrossHairCursor strokeStyle="#666" />
          </ChartCanvas>
        </div>
      </div>
      <div className="card-footer text-muted small">
        <div>
          <span className="text-success">● 20W SMA</span>
          <span className="text-danger ms-3">● 21W EMA</span>
        </div>
      </div>
    </div>
  );
};

export default BullMarketBand;
import React from 'react';
import { Card, Spinner, Alert } from 'react-bootstrap';
import { BsClock, BsInfoCircleFill } from 'react-icons/bs';
import { format } from 'd3-format';
import { timeFormat } from 'd3-time-format';
import {
  ChartCanvas,
  Chart,
  LineSeries,
  ScatterSeries,
  CircleMarker,
  XAxis,
  YAxis,
  CrossHairCursor,
  MouseCoordinateX,
  MouseCoordinateY,
  CurrentCoordinate,
  EdgeIndicator,
  discontinuousTimeScaleProviderBuilder,
  lastVisibleItemBasedZoomAnchor,
} from 'react-financial-charts';
import useApi from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import Tooltip from '../common/Tooltip';

const PiCycleTop = () => {
  const { data: rawData, loading, error, lastFetch } = useApi('/api/crypto/pi-cycle-top', 60000);

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
  const processedData = React.useMemo(() => {
    if (!rawData || !Array.isArray(rawData)) return { data: [], xScale: null, displayData: [] };

    // Convert date strings to Date objects and ensure all values are numbers
    const dataWithDates = rawData.map(d => ({
      ...d,
      date: new Date(d.date),
      price: +d.price,
      ma111: d.ma111 ? +d.ma111 : null,
      ma350x2: d.ma350x2 ? +d.ma350x2 : null,
      isCrossover: d.isCrossover || false
    }));

    const xScaleProvider = discontinuousTimeScaleProviderBuilder()
      .inputDateAccessor(d => d.date)
      .indexCalculator(d => d);

    const { data, xScale, xAccessor, displayXAccessor } = xScaleProvider(dataWithDates);

    return {
      data,
      xScale,
      xAccessor,
      displayXAccessor,
      displayData: data
    };
  }, [rawData]);

  const formatPrice = format(",.0f");
  const dateFormat = timeFormat("%b %Y");

  // Find crossover points
  const crossoverPoints = processedData.data ? processedData.data.filter(d => d.isCrossover) : [];
  
  // Estimate next top (simplified - would need more sophisticated analysis)
  const estimateNextTop = () => {
    if (!processedData.data || processedData.data.length < 100) return null;
    
    const latestData = processedData.data[processedData.data.length - 1];
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
          <Alert variant="danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!processedData || !processedData.data || processedData.data.length === 0) {
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
        {lastFetch && (
          <small className="text-muted d-flex align-items-center">
            <BsClock size={12} className="me-1" />
            {getTimeAgo(lastFetch)}
          </small>
        )}
      </Card.Header>
      <Card.Body>
        {/* Market Top Estimation */}
        {estimation && (
          <div className="alert alert-info mb-3">
            <h6 className="alert-heading mb-2">Market Top Estimation</h6>
            <div className="row">
              <div className="col-md-6">
                <small className="text-muted d-block">Current Gap</small>
                <strong>{estimation.gapPercentage.toFixed(1)}%</strong>
              </div>
              <div className="col-md-6">
                {estimation.estimatedDate ? (
                  <>
                    <small className="text-muted d-block">Estimated Crossover</small>
                    <strong>{estimation.estimatedDate.toLocaleDateString()} ({estimation.daysUntilCross} days)</strong>
                  </>
                ) : (
                  <>
                    <small className="text-muted d-block">Status</small>
                    <strong>Gap too wide for estimation</strong>
                  </>
                )}
              </div>
            </div>
            <div className="row mt-2">
              <div className="col-md-6">
                <small className="text-muted">111 DMA: ${formatPrice(estimation.ma111)}</small>
              </div>
              <div className="col-md-6">
                <small className="text-muted">350 DMA x2: ${formatPrice(estimation.ma350x2)}</small>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        {processedData && processedData.data && processedData.data.length > 0 && processedData.xScale && (
        <div style={{ height: '400px' }}>
          <ChartCanvas
            height={400}
            ratio={1}
            width={800}
            margin={{ left: 70, right: 70, top: 20, bottom: 30 }}
            seriesName="PiCycleTop"
            data={processedData.data}
            xScale={processedData.xScale}
            xAccessor={processedData.xAccessor}
            displayXAccessor={processedData.displayXAccessor}
            xExtents={[
              processedData.xAccessor(processedData.data[0]),
              processedData.xAccessor(processedData.data[processedData.data.length - 1])
            ]}
          >
            <Chart id={1} yExtents={d => {
              const values = [];
              if (d.price !== null) values.push(d.price);
              if (d.ma111 !== null) values.push(d.ma111);
              if (d.ma350x2 !== null) values.push(d.ma350x2);
              return values.length > 0 ? values : [0];
            }}>
              <XAxis 
                axisAt="bottom" 
                orient="bottom" 
                ticks={6}
                stroke="#666"
                tickStroke="#666"
              />
              <YAxis 
                axisAt="left" 
                orient="left" 
                ticks={5}
                stroke="#666"
                tickStroke="#666"
                tickFormat={formatPrice}
              />
              <YAxis 
                axisAt="right" 
                orient="right" 
                ticks={5}
                stroke="#666"
                tickStroke="#666"
                tickFormat={formatPrice}
              />

              <MouseCoordinateX
                at="bottom"
                orient="bottom"
                displayFormat={dateFormat}
              />
              <MouseCoordinateY
                at="left"
                orient="left"
                displayFormat={formatPrice}
              />
              <MouseCoordinateY
                at="right"
                orient="right"
                displayFormat={formatPrice}
              />

              {/* Price line */}
              <LineSeries
                yAccessor={d => d.price}
                stroke="#666"
                strokeWidth={1}
                strokeDasharray="2,2"
              />

              {/* 111 DMA */}
              <LineSeries
                yAccessor={d => d.ma111}
                stroke="#00ff88"
                strokeWidth={2}
                defined={d => d.ma111 !== null}
              />
              
              {/* 350 DMA x 2 */}
              <LineSeries
                yAccessor={d => d.ma350x2}
                stroke="#ff3366"
                strokeWidth={2}
                defined={d => d.ma350x2 !== null}
              />

              {/* Crossover points */}
              <ScatterSeries
                yAccessor={d => d.isCrossover ? d.price : null}
                marker={CircleMarker}
                markerProps={{ r: 6, fill: "#ffff00", stroke: "#ffff00" }}
              />

              {/* Current values edge indicators */}
              {processedData.data[processedData.data.length - 1]?.ma111 && (
                <EdgeIndicator
                  itemType="last"
                  orient="right"
                  edgeAt="right"
                  yAccessor={d => d.ma111}
                  displayFormat={formatPrice}
                  fill="#00ff88"
                />
              )}
              {processedData.data[processedData.data.length - 1]?.ma350x2 && (
                <EdgeIndicator
                  itemType="last"
                  orient="right"
                  edgeAt="right"
                  yAccessor={d => d.ma350x2}
                  displayFormat={formatPrice}
                  fill="#ff3366"
                />
              )}

              <CrossHairCursor strokeDasharray="3,3" />
            </Chart>
          </ChartCanvas>
        </div>
        )}

        {/* Legend */}
        <div className="d-flex justify-content-center mt-3 gap-4">
          <div className="d-flex align-items-center">
            <div style={{ width: '20px', height: '2px', backgroundColor: '#00ff88', marginRight: '8px' }}></div>
            <small>111 DMA</small>
          </div>
          <div className="d-flex align-items-center">
            <div style={{ width: '20px', height: '2px', backgroundColor: '#ff3366', marginRight: '8px' }}></div>
            <small>350 DMA x2</small>
          </div>
          <div className="d-flex align-items-center">
            <div style={{ width: '10px', height: '10px', backgroundColor: '#ffff00', borderRadius: '50%', marginRight: '8px' }}></div>
            <small>Top Signal</small>
          </div>
        </div>

        {/* Historical crossovers */}
        {crossoverPoints.length > 0 && (
          <div className="mt-3">
            <h6>Historical Top Signals</h6>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {crossoverPoints.slice(-5).reverse().map((point, index) => (
                    <tr key={index}>
                      <td>{new Date(point.date).toLocaleDateString()}</td>
                      <td>${formatPrice(point.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default PiCycleTop;
import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Alert, ButtonGroup, Button } from 'react-bootstrap';
import { BsBarChart, BsInfoCircleFill } from 'react-icons/bs';
import useApi from '../../hooks/useApi';
import EconomicMiniCard from './EconomicMiniCard';
import LoadingSpinner from '../common/LoadingSpinner';
import TimeAgo from '../common/TimeAgo';
import Tooltip from '../common/Tooltip';

/**
 * EconomicOverlayMiniDashboard Component
 * Container for economic indicator mini-cards with responsive grid layout
 */
const EconomicOverlayMiniDashboard = () => {
  const [timeRange, setTimeRange] = useState('90');

  // Fetch available indicators
  const { data: indicatorsData } = useApi('/api/crypto/economic-indicators', 300000); // 5 minutes

  // Get list of available indicators
  const availableIndicators = useMemo(() => {
    return indicatorsData?.available || ['federal_funds_rate', 'inflation_cpi', 'unemployment_rate', 'dxy_dollar_index'];
  }, [indicatorsData]);

  // Fetch data for all indicators
  const indicatorQueries = availableIndicators.map(indicator => {
    const { data, loading, error, lastFetch } = useApi(
      `/api/crypto/economic-overlay?indicator=${indicator}&days=${timeRange}`,
      60000 // 1 minute refresh
    );
    return { indicator, data, loading, error, lastFetch };
  });

  // Determine overall loading state
  const isLoading = indicatorQueries.some(query => query.loading);
  const hasErrors = indicatorQueries.every(query => query.error);
  const lastFetch = indicatorQueries.reduce((latest, query) => {
    if (!query.lastFetch) return latest;
    if (!latest) return query.lastFetch;
    return new Date(query.lastFetch) > new Date(latest) ? query.lastFetch : latest;
  }, null);

  const timeRanges = {
    '90': '3M',
    '180': '6M',
    '365': '1Y'
  };

  // Get indicator configurations
  const getIndicatorConfig = (indicatorKey) => {
    return indicatorsData?.indicators?.[indicatorKey] || {
      name: indicatorKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      unit: '',
      description: 'Economic indicator'
    };
  };

  if (hasErrors && !isLoading) {
    return (
      <Card className="mb-4">
        <Card.Header>
          <div className="d-flex align-items-center">
            <BsBarChart className="me-2" />
            <h5 className="mb-0">Economic Indicators</h5>
          </div>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger" className="mb-0">
            <BsInfoCircleFill className="me-2" />
            Unable to load economic indicator data. Please try again later.
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center">
            <BsBarChart className="me-2" />
            <h5 className="mb-0">Economic Indicators</h5>
            <Tooltip content="Shows current values and trends for key economic indicators that influence Bitcoin price movements. Arrow direction and steepness indicate trend strength.">
              <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
            </Tooltip>
          </div>
          <div className="d-flex align-items-center gap-3">
            {lastFetch && <TimeAgo date={lastFetch} />}
          </div>
        </div>
      </Card.Header>
      
      <Card.Body>
        {/* Time Range Controls */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <label className="form-label text-muted small mb-0">Analysis Period</label>
            <ButtonGroup size="sm">
              {Object.entries(timeRanges).map(([days, label]) => (
                <Button
                  key={days}
                  variant={timeRange === days ? 'primary' : 'outline-secondary'}
                  onClick={() => setTimeRange(days)}
                >
                  {label}
                </Button>
              ))}
            </ButtonGroup>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-4">
            <LoadingSpinner />
            <p className="text-muted mt-2">Loading economic indicators...</p>
          </div>
        )}

        {/* Mini Cards Grid */}
        {!isLoading && (
          <Row className="g-3">
            {indicatorQueries.map(({ indicator, data, loading, error }) => (
              <Col key={indicator} xs={12} sm={6} lg={3}>
                <EconomicMiniCard
                  data={data?.data}
                  indicatorKey={indicator}
                  indicatorConfig={getIndicatorConfig(indicator)}
                  timeRange={timeRange}
                  loading={loading}
                  error={error}
                />
              </Col>
            ))}
          </Row>
        )}

      </Card.Body>
    </Card>
  );
};

export default EconomicOverlayMiniDashboard;
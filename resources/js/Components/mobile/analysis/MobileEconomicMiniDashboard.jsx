import React, { useState, useMemo } from 'react';
import { Card, Alert, ButtonGroup, Button, Row, Col } from 'react-bootstrap';
import { BsBarChart, BsInfoCircleFill } from 'react-icons/bs';
import useApi from '../../../hooks/useApi';
import EconomicMiniCard from '../../dashboard/EconomicMiniCard';
import LoadingSpinner from '../../common/LoadingSpinner';
import TimeAgo from '../../common/TimeAgo';
import Tooltip from '../../common/Tooltip';

/**
 * MobileEconomicMiniDashboard Component
 * Mobile-optimized version of economic indicators mini-card dashboard
 */
const MobileEconomicMiniDashboard = () => {
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
      <Card className="mobile-chart-card">
        <Card.Header className="mobile-card-header">
          <div className="d-flex align-items-center">
            <BsBarChart className="me-2" />
            <h6 className="mb-0">Economic Indicators</h6>
          </div>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger" className="mb-0">
            <BsInfoCircleFill className="me-2" />
            Unable to load economic data.
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mobile-chart-card">
      <Card.Header className="mobile-card-header">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <BsBarChart className="me-2" />
            <h6 className="mb-0">Economic Indicators</h6>
            <Tooltip content="Key economic indicators that influence Bitcoin price movements">
              <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
            </Tooltip>
          </div>
          {lastFetch && <TimeAgo date={lastFetch} className="text-muted small" />}
        </div>
      </Card.Header>
      
      <Card.Body className="mobile-card-body">
        {/* Mobile Time Range Controls */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="text-muted">Analysis Period</small>
          </div>
          <ButtonGroup size="sm" className="w-100">
            {Object.entries(timeRanges).map(([days, label]) => (
              <Button
                key={days}
                variant={timeRange === days ? 'primary' : 'outline-secondary'}
                onClick={() => setTimeRange(days)}
                className="flex-fill"
              >
                {label}
              </Button>
            ))}
          </ButtonGroup>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-4">
            <LoadingSpinner />
            <p className="text-muted mt-2 small">Loading indicators...</p>
          </div>
        )}

        {/* Mobile Mini Cards Grid - 2x2 layout */}
        {!isLoading && (
          <Row className="g-2">
            {indicatorQueries.map(({ indicator, data, loading, error }) => (
              <Col key={indicator} xs={6}>
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

export default MobileEconomicMiniDashboard;
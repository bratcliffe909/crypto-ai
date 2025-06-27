import React from 'react';
import { Card, ProgressBar } from 'react-bootstrap';
import { BsExclamationTriangle, BsInfoCircleFill } from 'react-icons/bs';
import useApi from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import Tooltip from '../common/Tooltip';

const FearGreedIndex = () => {
  const { data, loading, error } = useApi('/api/crypto/fear-greed');

  const value = data?.data?.[0]?.value || 0;
  const classification = data?.data?.[0]?.value_classification || 'Unknown';

  const getColorClass = (val) => {
    if (val < 25) return 'danger';
    if (val < 45) return 'warning';
    if (val < 55) return 'secondary';
    if (val < 75) return 'info';
    return 'success';
  };

  const getDescription = (val) => {
    if (val < 25) return 'The market is experiencing extreme fear. This could be a buying opportunity.';
    if (val < 45) return 'Fear is present in the market. Investors are cautious.';
    if (val < 55) return 'The market sentiment is neutral.';
    if (val < 75) return 'Greed is starting to take over. Be cautious of overvaluation.';
    return 'Extreme greed in the market. Consider taking profits.';
  };

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <h5 className="mb-0">Fear & Greed Index</h5>
          <Tooltip content={getDescription(value)}>
            <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
          </Tooltip>
        </div>
        {error && (
          <BsExclamationTriangle className="text-warning" title="Failed to update" />
        )}
      </Card.Header>
      <Card.Body>
        {loading && !data ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="text-center mb-3">
              <h2 className="display-4 mb-0">{value}</h2>
              <p className={`text-${getColorClass(value)} mb-0 fw-bold`}>
                {classification}
              </p>
            </div>
            <ProgressBar 
              now={value} 
              variant={getColorClass(value)}
              className="mb-2"
              style={{ height: '10px' }}
            />
            <div className="d-flex justify-content-between small text-muted">
              <span>Extreme Fear</span>
              <span>Neutral</span>
              <span>Extreme Greed</span>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default FearGreedIndex;

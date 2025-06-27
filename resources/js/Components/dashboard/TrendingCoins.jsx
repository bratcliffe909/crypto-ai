import React from 'react';
import { Card, ListGroup, Badge } from 'react-bootstrap';
import { BsExclamationTriangle, BsFire } from 'react-icons/bs';
import useApi from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';

const TrendingCoins = () => {
  const { data, loading, error } = useApi('/api/crypto/trending');

  const trendingCoins = data?.coins || [];

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <h5 className="mb-0">Trending</h5>
          <BsFire className="ms-2 text-warning" />
        </div>
        {error && (
          <BsExclamationTriangle className="text-warning" title="Failed to update" />
        )}
      </Card.Header>
      <Card.Body className="p-0">
        {loading && !data ? (
          <div className="p-3">
            <LoadingSpinner />
          </div>
        ) : trendingCoins.length > 0 ? (
          <ListGroup variant="flush">
            {trendingCoins.slice(0, 7).map((coin, index) => (
              <ListGroup.Item key={coin.item.id} className="d-flex align-items-center">
                <Badge bg="secondary" className="me-2">{index + 1}</Badge>
                <img 
                  src={coin.item.thumb} 
                  alt={coin.item.name}
                  width="20"
                  height="20"
                  className="me-2"
                />
                <div className="flex-grow-1">
                  <div className="fw-medium">{coin.item.name}</div>
                  <small className="text-muted">{coin.item.symbol}</small>
                </div>
                <Badge bg="primary" pill>
                  #{coin.item.market_cap_rank || 'N/A'}
                </Badge>
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : (
          <p className="text-muted text-center p-3 mb-0">
            No trending coins available
          </p>
        )}
      </Card.Body>
    </Card>
  );
};

export default TrendingCoins;

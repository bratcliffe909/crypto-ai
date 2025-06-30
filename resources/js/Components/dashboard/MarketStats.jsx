import React from 'react';
import { Card, Row, Col, Badge, Spinner, Alert } from 'react-bootstrap';
import { BsInfoCircleFill } from 'react-icons/bs';
import useApi from '../../hooks/useApi';
import Tooltip from '../common/Tooltip';
import TimeAgo from '../common/TimeAgo';

const MarketStats = () => {
  const { data, loading, error, lastFetch } = useApi('/api/crypto/market-metrics/global', 60000); // 1 minute
  
  const formatMarketCap = (value) => {
    if (!value) return 'N/A';
    if (!value || typeof value !== 'number') return '$0';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };
  
  const formatNumber = (value) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat().format(Math.round(value));
  };
  

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <h5 className="mb-0">Global Market Stats</h5>
            <Tooltip content="Real-time overview of the entire cryptocurrency market. Shows total market capitalization (the combined value of all cryptocurrencies), daily trading volume, Bitcoin's market dominance percentage, and the number of actively traded cryptocurrencies.">
              <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
            </Tooltip>
          </div>
          {lastFetch && <TimeAgo date={lastFetch} />}
        </div>
      </Card.Header>
      <Card.Body>
        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" size="sm" />
          </div>
        )}
        
        {error && (
          <Alert variant="danger" className="mb-0">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}
        
        {data && !loading && !error && (
          <Row>
            <Col xs={6} className="mb-3">
              <div>
                <small className="text-muted d-block">Total Market Cap</small>
                <h5 className="mb-0">{formatMarketCap(data.totalMarketCap)}</h5>
                <Badge 
                  bg={data.totalMarketCapChange24h >= 0 ? 'success' : 'danger'}
                  className="small"
                >
                  {data.totalMarketCapChange24h >= 0 ? '+' : ''}{(data.totalMarketCapChange24h || 0).toFixed(2)}%
                </Badge>
              </div>
            </Col>
            
            <Col xs={6} className="mb-3">
              <div>
                <small className="text-muted d-block">24h Volume</small>
                <h5 className="mb-0">{formatMarketCap(data.totalVolume)}</h5>
              </div>
            </Col>
            
            <Col xs={6} className="mb-3">
              <div>
                <small className="text-muted d-block">BTC Dominance</small>
                <h5 className="mb-0">{(data.marketCapPercentage?.btc || 0).toFixed(1)}%</h5>
              </div>
            </Col>
            
            <Col xs={6} className="mb-3">
              <div>
                <small className="text-muted d-block">Active Cryptos</small>
                <h5 className="mb-0">{formatNumber(data.activeCryptocurrencies)}</h5>
              </div>
            </Col>
            
            {data.defiMarketCap && (
              <Col xs={12}>
                <hr className="my-2" />
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">DeFi Market Cap</small>
                  <strong>{formatMarketCap(data.defiMarketCap)}</strong>
                </div>
              </Col>
            )}
          </Row>
        )}
      </Card.Body>
    </Card>
  );
};

export default MarketStats;
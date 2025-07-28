import React, { useState, useMemo, useEffect } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import { BsSearch } from 'react-icons/bs';
import useApi from '../../../hooks/useApi';
import LoadingSpinner from '../../common/LoadingSpinner';
import { formatPrice, formatPercentage, formatMarketCap } from '../../../utils/formatters';

const MobileMarketOverview = ({ onDataLoad }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, loading, error, lastUpdated } = useApi('/api/crypto/markets?per_page=250');
  const coins = data || [];

  // Notify parent of data updates
  useEffect(() => {
    if (onDataLoad) {
      onDataLoad(lastUpdated, error);
    }
  }, [lastUpdated, error, onDataLoad]);

  const filteredCoins = useMemo(() => {
    if (!coins || !Array.isArray(coins)) return [];
    if (!searchTerm) return coins;
    
    const term = searchTerm.toLowerCase();
    return coins.filter(coin =>
      coin.name.toLowerCase().includes(term) ||
      coin.symbol.toLowerCase().includes(term)
    );
  }, [coins, searchTerm]);

  if (loading && (!coins || coins.length === 0)) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-danger p-4">
        <p>Failed to load market data</p>
        <small>{error}</small>
      </div>
    );
  }

  return (
    <div className="mobile-market-overview">
      <div className="search-container">
        <InputGroup>
          <InputGroup.Text className="border-0 bg-transparent">
            <BsSearch />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search coins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-0 bg-transparent"
          />
        </InputGroup>
      </div>

      <div className="coin-list">
        {filteredCoins.map((coin) => (
          <div key={coin.id} className="coin-row">
            <div className="coin-rank">{coin.market_cap_rank}</div>
            
            <img 
              src={coin.image} 
              alt={coin.name} 
              className="coin-logo"
              loading="lazy"
            />
            
            <div className="coin-info">
              <div className="coin-header">
                <div className="coin-name-wrapper">
                  <span className="coin-name">{coin.name}</span>
                  <span className="coin-symbol">{coin.symbol.toUpperCase()}</span>
                </div>
                <div className="coin-price-wrapper">
                  <span className="coin-price">{formatPrice(coin.current_price)}</span>
                  <span className={`coin-change ${coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`}>
                    {formatPercentage(coin.price_change_percentage_24h)}
                  </span>
                </div>
              </div>
              <div className="coin-stats">
                <span>MCap: {formatMarketCap(coin.market_cap)}</span>
                <span>Vol: {formatMarketCap(coin.total_volume)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileMarketOverview;
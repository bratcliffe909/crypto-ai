import React from 'react';
import { BsFire, BsExclamationTriangle } from 'react-icons/bs';
import useApi from '../../../hooks/useApi';
import LoadingSpinner from '../../common/LoadingSpinner';
import TimeAgo from '../../common/TimeAgo';
import MobileSectionHeader from '../common/MobileSectionHeader';
import { formatPercentage } from '../../../utils/formatters';

const MobileTrendingCoins = () => {
  const { data, loading, error, lastUpdated } = useApi('/api/crypto/trending');
  const trendingCoins = data?.coins || [];

  return (
    <div className="mobile-section mobile-trending">
      <MobileSectionHeader
        title="Trending"
        icon={BsFire}
        lastUpdated={lastUpdated}
        error={error}
      />

      <div className="trending-content">
        {loading && !data ? (
          <div className="loading-container">
            <LoadingSpinner />
          </div>
        ) : trendingCoins.length > 0 ? (
          <div className="trending-list">
            {trendingCoins.map((coin, index) => (
              <div key={coin.item.id} className="trending-item">
                <div className="rank-badge">{index + 1}</div>
                
                <img 
                  src={coin.item.thumb} 
                  alt={coin.item.name}
                  className="coin-image"
                  loading="lazy"
                />
                
                <div className="coin-info">
                  <div className="coin-name">{coin.item.name}</div>
                  <div className="coin-symbol">{coin.item.symbol}</div>
                </div>
                
                <div className="coin-stats">
                  {coin.item.data?.price_change_percentage_24h?.usd !== undefined && (
                    <div className={`price-change ${
                      coin.item.data.price_change_percentage_24h.usd >= 0 ? 'positive' : 'negative'
                    }`}>
                      {formatPercentage(coin.item.data.price_change_percentage_24h.usd)}
                    </div>
                  )}
                  <div className="market-rank">
                    Rank #{coin.item.market_cap_rank || 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <BsFire size={48} className="text-muted mb-3" />
            <p className="text-muted">No trending coins available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileTrendingCoins;
import React from 'react';
import { BsCurrencyDollar, BsGraphUp, BsCurrencyBitcoin, BsGlobe2, BsArrowUpShort, BsArrowDownShort } from 'react-icons/bs';
import useApi from '../../../hooks/useApi';
import LoadingSpinner from '../../common/LoadingSpinner';
import TimeAgo from '../../common/TimeAgo';

const MobileMarketStats = () => {
  const { data, loading, error, lastFetch } = useApi('/api/crypto/market-metrics/global', 60000);
  
  const formatMarketCap = (value) => {
    if (!value || typeof value !== 'number') return '$0';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };
  
  const formatNumber = (value) => {
    if (!value) return '0';
    return new Intl.NumberFormat().format(Math.round(value));
  };

  if (loading && !data) {
    return (
      <div className="mobile-market-stats-container">
        <div className="d-flex justify-content-center align-items-center py-4">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-market-stats-container">
        <div className="text-center text-danger py-3">
          <small>Failed to load market data</small>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      icon: BsCurrencyDollar,
      label: 'Market Cap',
      value: formatMarketCap(data.totalMarketCap),
      change: data.totalMarketCapChange24h,
      color: 'primary'
    },
    {
      icon: BsGraphUp,
      label: '24h Volume',
      value: formatMarketCap(data.totalVolume),
      color: 'info'
    },
    {
      icon: BsCurrencyBitcoin,
      label: 'BTC Dom',
      value: `${(data.marketCapPercentage?.btc || 0).toFixed(1)}%`,
      color: 'warning'
    },
    {
      icon: BsGlobe2,
      label: 'Cryptos',
      value: formatNumber(data.activeCryptocurrencies),
      color: 'success'
    }
  ];

  return (
    <div className="mobile-market-stats-container">
      
      <div className="stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-card">
              <div className={`stat-icon bg-${stat.color} bg-opacity-10`}>
                <Icon className={`text-${stat.color}`} size={20} />
              </div>
              <div className="stat-content">
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
                {stat.change !== undefined && (
                  <div className={`stat-change ${stat.change >= 0 ? 'positive' : 'negative'}`}>
                    {stat.change >= 0 ? <BsArrowUpShort /> : <BsArrowDownShort />}
                    {Math.abs(stat.change).toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobileMarketStats;
import React, { useState, useEffect } from 'react';
import { BsWallet2, BsPlus, BsX, BsExclamationTriangle } from 'react-icons/bs';
import useLocalStorage from '../../../hooks/useLocalStorage';
import useApi from '../../../hooks/useApi';
import LoadingSpinner from '../../common/LoadingSpinner';
import TimeAgo from '../../common/TimeAgo';
import AddCoinModal from '../../dashboard/AddCoinModal';
import { formatPrice, formatPercentage } from '../../../utils/formatters';
import useInterval from '../../../hooks/useInterval';
import axios from 'axios';

const MobileWallet = () => {
  const [favorites, setFavorites] = useState([]);
  const [portfolio, setPortfolio] = useLocalStorage('portfolio', {});
  const [walletData, setWalletData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalValue, setTotalValue] = useState(0);
  const [totalChange, setTotalChange] = useState(0);
  const [btcPrice, setBtcPrice] = useState(0);
  const [gbpRate, setGbpRate] = useState(0.79);
  const [selectedCurrency, setSelectedCurrency] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showAddCoinModal, setShowAddCoinModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Listen for changes to favorites
  useEffect(() => {
    const handleStorageChange = () => {
      const savedFavorites = localStorage.getItem('favorites');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    };

    const handleFavoritesUpdate = (event) => {
      if (event.detail && event.detail.favorites) {
        setFavorites(event.detail.favorites);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
    };
  }, []);

  // Fetch exchange rate
  const fetchExchangeRate = async () => {
    try {
      const response = await axios.get('/api/crypto/exchange-rates?base=USD&symbols=GBP');
      if (response.data && response.data.rates && response.data.rates.GBP) {
        setGbpRate(response.data.rates.GBP);
      }
    } catch (err) {
      console.error('Failed to fetch exchange rate:', err);
    }
  };

  // Fetch wallet data
  const fetchWalletData = async () => {
    if (!favorites.length) {
      setWalletData([]);
      setTotalValue(0);
      setTotalChange(0);
      return;
    }

    try {
      if (walletData.length === 0) {
        setLoading(true);
      }
      setError(null);
      
      const csrfResponse = await axios.get('/api/csrf-token');
      axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfResponse.data.csrf_token;
      
      const requestIds = favorites.includes('bitcoin') ? favorites : [...favorites, 'bitcoin'];
      const response = await axios.get(`/api/crypto/wallet-coins?ids=${requestIds.join(',')}`);
      const data = response.data;
      
      const lastUpdatedHeader = response.headers['x-last-updated'];
      if (lastUpdatedHeader) {
        setLastUpdated(new Date(lastUpdatedHeader));
      }
      
      const bitcoinData = data.find(coin => coin.id === 'bitcoin');
      if (bitcoinData) {
        setBtcPrice(bitcoinData.current_price);
      }
      
      let total = 0;
      let totalPrevious = 0;
      
      const enrichedData = data
        .filter(coin => favorites.includes(coin.id))
        .map(coin => {
          const balance = portfolio[coin.id]?.balance || 0;
          const value = balance * coin.current_price;
          const previousPrice = coin.current_price / (1 + coin.price_change_percentage_24h / 100);
          const previousValue = balance * previousPrice;
          
          total += value;
          totalPrevious += previousValue;
          
          return {
            ...coin,
            balance,
            value,
            previousValue
          };
        });
      
      setWalletData(enrichedData);
      setTotalValue(total);
      setTotalChange(total - totalPrevious);
      
      if (!response.headers['x-last-updated']) {
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
      setError('Failed to update wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRate();
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [favorites, portfolio]);

  useInterval(() => {
    if (favorites.length > 0) {
      fetchWalletData();
      fetchExchangeRate();
    }
  }, 30000);

  const updateBalance = (coinId, balance) => {
    const newPortfolio = { ...portfolio };
    if (balance > 0) {
      newPortfolio[coinId] = {
        balance: parseFloat(balance),
        addedAt: portfolio[coinId]?.addedAt || new Date().toISOString()
      };
    } else {
      delete newPortfolio[coinId];
    }
    setPortfolio(newPortfolio);
  };
  
  const addCoinToWallet = (coin) => {
    const newFavorites = [...favorites, coin.id];
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    
    window.dispatchEvent(new CustomEvent('favoritesUpdated', { 
      detail: { favorites: newFavorites } 
    }));
    
    setShowAddCoinModal(false);
  };

  const removeFromWallet = (coinId) => {
    const newFavorites = favorites.filter(id => id !== coinId);
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    
    window.dispatchEvent(new CustomEvent('favoritesUpdated', { 
      detail: { favorites: newFavorites } 
    }));
    
    const newPortfolio = { ...portfolio };
    delete newPortfolio[coinId];
    setPortfolio(newPortfolio);
  };

  const getCurrencyDisplay = () => {
    switch (selectedCurrency) {
      case 0: // USD
        return {
          value: formatPrice(totalValue),
          change: totalChange,
          symbol: '$',
          label: 'USD'
        };
      case 1: // GBP
        return {
          value: `£${(totalValue * gbpRate).toFixed(2)}`,
          change: totalChange * gbpRate,
          symbol: '£',
          label: 'GBP'
        };
      case 2: // BTC
        const btcValue = btcPrice > 0 ? totalValue / btcPrice : 0;
        return {
          value: `${btcValue.toFixed(6)} BTC`,
          change: btcPrice > 0 ? totalChange / btcPrice : 0,
          symbol: '₿',
          label: 'BTC',
          isBTC: true
        };
    }
  };

  const currency = getCurrencyDisplay();
  const changePercent = totalValue > totalChange ? ((totalChange / (totalValue - totalChange)) * 100) : 0;

  return (
    <div className="mobile-section mobile-wallet">
      <div className="wallet-header">
        <div className="header-top">
          <div className="d-flex align-items-center">
            <h5 className="mb-0">Wallet</h5>
            <BsWallet2 className="ms-2 text-primary" size={20} />
          </div>
          <div className="d-flex align-items-center gap-2">
            {lastUpdated && <TimeAgo date={lastUpdated} />}
            {error && <BsExclamationTriangle className="text-warning" size={16} />}
          </div>
        </div>

        {totalValue > 0 && (
          <div className="wallet-summary">
            <div className="total-value">{currency.value}</div>
            <div className={`value-change ${totalChange >= 0 ? 'positive' : 'negative'}`}>
              {currency.isBTC ? (
                <>
                  {totalChange >= 0 ? '+' : ''}{currency.change.toFixed(6)} BTC
                  <span className="change-percent">({formatPercentage(changePercent).replace('%', '')}%)</span>
                </>
              ) : (
                <>
                  {totalChange >= 0 ? '+' : '-'}{currency.symbol}{Math.abs(currency.change).toFixed(2)}
                  <span className="change-percent">({formatPercentage(changePercent).replace('%', '')}%)</span>
                </>
              )}
            </div>
            <div className="currency-selector">
              {['USD', 'GBP', 'BTC'].map((curr, index) => (
                <button
                  key={curr}
                  className={`currency-btn ${selectedCurrency === index ? 'active' : ''}`}
                  onClick={() => setSelectedCurrency(index)}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="wallet-content">
        {loading && favorites.length > 0 && walletData.length === 0 ? (
          <div className="loading-container">
            <LoadingSpinner />
          </div>
        ) : walletData.length > 0 ? (
          <div className="coin-list">
            {walletData.map(coin => (
              <div key={coin.id} className="coin-item">
                <div className="coin-header">
                  <div className="coin-identity">
                    <img 
                      src={coin.image} 
                      alt={coin.name}
                      className="coin-image"
                      loading="lazy"
                    />
                    <div className="coin-names">
                      <div className="coin-name">{coin.name}</div>
                      <div className="coin-symbol">{coin.symbol.toUpperCase()}</div>
                    </div>
                  </div>
                  {editMode && (
                    <button
                      className="remove-btn"
                      onClick={() => removeFromWallet(coin.id)}
                    >
                      <BsX size={20} />
                    </button>
                  )}
                </div>
                
                <div className="coin-details">
                  <div className="detail-group">
                    <label>Amount</label>
                    <input
                      type="number"
                      className="amount-input"
                      placeholder="0.00"
                      value={coin.balance || ''}
                      onChange={(e) => updateBalance(coin.id, e.target.value)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  
                  <div className="detail-group">
                    <label>Price</label>
                    <div className="price-info">
                      <div className="current-price">{formatPrice(coin.current_price)}</div>
                      <div className={`price-change ${coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`}>
                        {formatPercentage(coin.price_change_percentage_24h)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="detail-group">
                    <label>Value</label>
                    <div className="value-info">
                      <div className="current-value">{formatPrice(coin.value)}</div>
                      <div className={`value-change ${coin.value > coin.previousValue ? 'positive' : 'negative'}`}>
                        {coin.value > coin.previousValue ? '+' : '-'}${Math.abs(coin.value - coin.previousValue).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="empty-state">
            <BsWallet2 size={48} className="text-muted mb-3" />
            <div className="empty-title">Your wallet is empty</div>
            <p className="empty-text">Add coins to start tracking your portfolio</p>
          </div>
        ) : null}
      </div>

      <div className="wallet-footer">
        <button 
          className="add-coin-btn"
          onClick={() => setShowAddCoinModal(true)}
        >
          <BsPlus size={24} />
          Add Coin
        </button>
        {walletData.length > 0 && (
          <button 
            className={`edit-btn ${editMode ? 'active' : ''}`}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
        )}
      </div>
      
      <AddCoinModal 
        show={showAddCoinModal}
        onHide={() => setShowAddCoinModal(false)}
        onAddCoin={addCoinToWallet}
        existingCoins={favorites}
      />
    </div>
  );
};

export default MobileWallet;
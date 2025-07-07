import React, { useState, useEffect } from 'react';
import { BsWallet2, BsPlus, BsX, BsExclamationTriangle, BsPencil, BsTrash } from 'react-icons/bs';
import useLocalStorage from '../../../hooks/useLocalStorage';
import useApi from '../../../hooks/useApi';
import LoadingSpinner from '../../common/LoadingSpinner';
import TimeAgo from '../../common/TimeAgo';
import MobileSectionHeader from '../common/MobileSectionHeader';
import AddCoinModal from '../../dashboard/AddCoinModal';
import EditBalanceModal from '../../dashboard/EditBalanceModal';
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
  const [showEditBalanceModal, setShowEditBalanceModal] = useState(false);
  const [editingCoin, setEditingCoin] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [cachedWalletData, setCachedWalletData] = useLocalStorage('cachedWalletData', {}); // Share cache with desktop
  
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
      if (walletData.length === 0 && !Object.keys(cachedWalletData).length) {
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
            previousValue,
            isLoaded: true
          };
        });
      
      setWalletData(enrichedData);
      setTotalValue(total);
      setTotalChange(total - totalPrevious);
      setInitialLoadComplete(true);
      
      // Cache the enriched data by coin ID
      const newCachedData = {};
      enrichedData.forEach(coin => {
        newCachedData[coin.id] = {
          ...coin,
          cachedAt: new Date().toISOString()
        };
      });
      setCachedWalletData(prev => ({ ...prev, ...newCachedData }));
      
      if (!response.headers['x-last-updated']) {
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
      setError('Failed to update wallet');
      
      // Load from cache if available
      if (Object.keys(cachedWalletData).length > 0) {
        const cachedEnrichedData = favorites
          .filter(id => cachedWalletData[id])
          .map(id => {
            const cached = cachedWalletData[id];
            const balance = portfolio[id]?.balance || 0;
            const value = balance * (cached.current_price || 0);
            const previousPrice = cached.current_price / (1 + (cached.price_change_percentage_24h || 0) / 100);
            const previousValue = balance * previousPrice;
            
            return {
              ...cached,
              balance,
              value,
              previousValue,
              isLoaded: true,
              isStale: true // Mark as stale data
            };
          });
        
        // Calculate totals from cached data
        let cachedTotal = 0;
        let cachedTotalPrevious = 0;
        cachedEnrichedData.forEach(coin => {
          cachedTotal += coin.value;
          cachedTotalPrevious += coin.previousValue;
        });
        
        setWalletData(cachedEnrichedData);
        setTotalValue(cachedTotal);
        setTotalChange(cachedTotal - cachedTotalPrevious);
        
        // Find Bitcoin price from cache
        const cachedBitcoin = cachedWalletData['bitcoin'];
        if (cachedBitcoin) {
          setBtcPrice(cachedBitcoin.current_price);
        }
      }
      
      setInitialLoadComplete(true);
    } finally {
      setLoading(false);
    }
  };

  // Load cached data on mount if available
  useEffect(() => {
    if (favorites.length > 0 && Object.keys(cachedWalletData).length > 0) {
      const cachedEnrichedData = favorites
        .filter(id => cachedWalletData[id])
        .map(id => {
          const cached = cachedWalletData[id];
          const balance = portfolio[id]?.balance || 0;
          const value = balance * (cached.current_price || 0);
          const previousPrice = cached.current_price / (1 + (cached.price_change_percentage_24h || 0) / 100);
          const previousValue = balance * previousPrice;
          
          return {
            ...cached,
            balance,
            value,
            previousValue,
            isLoaded: true,
            isStale: true // Mark as stale data until fresh data loads
          };
        });
      
      if (cachedEnrichedData.length > 0) {
        // Calculate totals from cached data
        let cachedTotal = 0;
        let cachedTotalPrevious = 0;
        cachedEnrichedData.forEach(coin => {
          cachedTotal += coin.value;
          cachedTotalPrevious += coin.previousValue;
        });
        
        setWalletData(cachedEnrichedData);
        setTotalValue(cachedTotal);
        setTotalChange(cachedTotal - cachedTotalPrevious);
        
        // Find Bitcoin price from cache
        const cachedBitcoin = cachedWalletData['bitcoin'];
        if (cachedBitcoin) {
          setBtcPrice(cachedBitcoin.current_price);
        }
      }
    }
    
    fetchExchangeRate();
  }, []); // Only run on mount

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
    
    // If coin has initial balance, set it
    if (coin.initialBalance > 0) {
      updateBalance(coin.id, coin.initialBalance);
    }
    
    // Add placeholder data immediately while waiting for API
    const placeholderCoin = {
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      image: coin.thumb || coin.image,
      current_price: 0,
      price_change_percentage_24h: 0,
      balance: coin.initialBalance || 0,
      value: 0,
      previousValue: 0,
      isLoaded: false
    };
    
    // Check if coin already exists in wallet data
    setWalletData(prevData => {
      const exists = prevData.find(c => c.id === coin.id);
      if (exists) {
        return prevData;
      }
      return [...prevData, placeholderCoin];
    });
    
    setShowAddCoinModal(false);
    
    // Immediately fetch fresh data from API
    setTimeout(() => {
      fetchWalletData();
    }, 100);
  };

  const removeFromWallet = (coinId) => {
    if (window.confirm('Are you sure you want to remove this coin from your wallet?')) {
      const newFavorites = favorites.filter(id => id !== coinId);
      setFavorites(newFavorites);
      localStorage.setItem('favorites', JSON.stringify(newFavorites));
      
      window.dispatchEvent(new CustomEvent('favoritesUpdated', { 
        detail: { favorites: newFavorites } 
      }));
      
      const newPortfolio = { ...portfolio };
      delete newPortfolio[coinId];
      setPortfolio(newPortfolio);
      
      // Remove from cache
      setCachedWalletData(prev => {
        const newCache = { ...prev };
        delete newCache[coinId];
        return newCache;
      });
    }
  };
  
  const openEditBalance = (coin) => {
    setEditingCoin(coin);
    setShowEditBalanceModal(true);
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
        <MobileSectionHeader
          title="Wallet"
          icon={BsWallet2}
          lastUpdated={lastUpdated}
          error={error}
        />

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
          <div className="wallet-table">
            <div className="table-header">
              <div className="header-asset">Asset</div>
              <div className="header-price">Price</div>
              <div className="header-holdings">Holdings</div>
            </div>
            <div className="table-body">
              {walletData.map(coin => (
                <div key={coin.id} className="table-row">
                  <div className="col-asset">
                    <img 
                      src={coin.image} 
                      alt={coin.symbol}
                      className="coin-image"
                      loading="lazy"
                    />
                    <span className="coin-symbol">{coin.symbol.toUpperCase()}</span>
                  </div>
                  
                  <div className="col-price">
                    {coin.isStale && (
                      <BsExclamationTriangle 
                        className="text-warning me-1" 
                        size={12} 
                        title="Using cached data"
                      />
                    )}
                    {(!initialLoadComplete || (coin.current_price === 0 && !coin.isLoaded)) ? (
                      <div className="price-loading">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="current-price">{formatPrice(coin.current_price)}</div>
                        <div className={`price-change ${coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`}>
                          {formatPercentage(coin.price_change_percentage_24h)}
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="col-holdings">
                    <div className="holdings-value">{formatPrice(coin.value)}</div>
                    <div className="holdings-amount">
                      {coin.balance || 0} {coin.symbol.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="col-actions">
                    <button
                      className="action-btn edit"
                      onClick={() => openEditBalance(coin)}
                      title="Edit balance"
                    >
                      <BsPencil size={14} />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => removeFromWallet(coin.id)}
                      title="Remove from wallet"
                    >
                      <BsTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
      </div>
      
      <AddCoinModal 
        show={showAddCoinModal}
        onHide={() => setShowAddCoinModal(false)}
        onAddCoin={addCoinToWallet}
        existingCoins={favorites}
      />
      
      <EditBalanceModal
        show={showEditBalanceModal}
        onHide={() => {
          setShowEditBalanceModal(false);
          setEditingCoin(null);
        }}
        coin={editingCoin}
        currentBalance={editingCoin ? portfolio[editingCoin.id]?.balance || 0 : 0}
        onSave={updateBalance}
      />
    </div>
  );
};

export default MobileWallet;
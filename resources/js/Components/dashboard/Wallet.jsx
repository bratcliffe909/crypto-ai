import React, { useState, useEffect } from 'react';
import { Card, Form, Button, ListGroup, InputGroup, Badge } from 'react-bootstrap';
import { BsX, BsExclamationTriangle, BsWallet2, BsCurrencyDollar, BsInfoCircleFill, BsPlus, BsPencil, BsTrash } from 'react-icons/bs';
import useLocalStorage from '../../hooks/useLocalStorage';
import LoadingSpinner from '../common/LoadingSpinner';
import Tooltip from '../common/Tooltip';
import TimeAgo from '../common/TimeAgo';
import AddCoinModal from './AddCoinModal';
import EditBalanceModal from './EditBalanceModal';
import { formatPrice, formatPercentage } from '../../utils/formatters';
import useInterval from '../../hooks/useInterval';
import axios from 'axios';

const Wallet = () => {
  const [favorites, setFavorites] = useState([]);
  const [portfolio, setPortfolio] = useLocalStorage('portfolio', {});
  const [walletData, setWalletData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalValue, setTotalValue] = useState(0);
  const [totalChange, setTotalChange] = useState(0);
  const [btcPrice, setBtcPrice] = useState(0);
  const [gbpRate, setGbpRate] = useState(0.79); // Default fallback rate
  const [selectedCurrency, setSelectedCurrency] = useState(0); // 0=USD, 1=GBP, 2=BTC
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showAddCoinModal, setShowAddCoinModal] = useState(false);
  const [showEditBalanceModal, setShowEditBalanceModal] = useState(false);
  const [editingCoin, setEditingCoin] = useState(null);
  
  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Listen for changes to favorites
  useEffect(() => {
    // Handle storage changes from other tabs
    const handleStorageChange = () => {
      const savedFavorites = localStorage.getItem('favorites');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    };

    // Handle custom event from same tab
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
      // Keep default rate on error
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
      // Only show loading if we don't have any data yet
      if (walletData.length === 0) {
        setLoading(true);
      }
      setError(null);
      
      // Get CSRF token
      const csrfResponse = await axios.get('/api/csrf-token');
      axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfResponse.data.csrf_token;
      
      // Always include bitcoin in the request to get BTC price
      const requestIds = favorites.includes('bitcoin') ? favorites : [...favorites, 'bitcoin'];
      
      // Use the wallet-coins endpoint which can fetch any coins by ID
      const response = await axios.get(`/api/crypto/wallet-coins?ids=${requestIds.join(',')}`);
      const data = response.data;
      
      // Update last fetch time from headers if available
      const lastUpdatedHeader = response.headers['x-last-updated'];
      if (lastUpdatedHeader) {
        setLastUpdated(new Date(lastUpdatedHeader));
      }
      
      // Find Bitcoin price
      const bitcoinData = data.find(coin => coin.id === 'bitcoin');
      if (bitcoinData) {
        setBtcPrice(bitcoinData.current_price);
      }
      
      // Calculate portfolio values
      let total = 0;
      let totalPrevious = 0;
      
      const enrichedData = data
        .filter(coin => favorites.includes(coin.id)) // Only show coins that are actually in favorites
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
      
      // Only update last updated if we didn't get it from headers
      if (!response.headers['x-last-updated']) {
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
      setError('Failed to update wallet');
      // Don't clear existing data on error - keep showing stale data
    } finally {
      setLoading(false);
    }
  };

  // Fetch exchange rate on mount
  useEffect(() => {
    fetchExchangeRate();
  }, []);

  // Fetch data on mount and when favorites or portfolio changes
  useEffect(() => {
    fetchWalletData();
  }, [favorites, portfolio]);

  // Auto-refresh every 30 seconds
  useInterval(() => {
    if (favorites.length > 0) {
      fetchWalletData();
      fetchExchangeRate(); // Also refresh exchange rate
    }
  }, 30000);

  // Auto-slide currency display every 10 seconds
  useInterval(() => {
    if (totalValue > 0) {
      setSelectedCurrency(prev => (prev + 1) % 3);
    }
  }, 10000);
  
  // Update coin balance
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
  
  // Add coin to wallet
  const addCoinToWallet = (coin) => {
    const newFavorites = [...favorites, coin.id];
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('favoritesUpdated', { 
      detail: { favorites: newFavorites } 
    }));
    
    // If coin has initial balance, set it
    if (coin.initialBalance > 0) {
      updateBalance(coin.id, coin.initialBalance);
    }
    
    // Close modal
    setShowAddCoinModal(false);
  };

  // Remove from wallet
  const removeFromWallet = (coinId) => {
    if (window.confirm('Are you sure you want to remove this coin from your wallet?')) {
      const newFavorites = favorites.filter(id => id !== coinId);
      setFavorites(newFavorites);
      localStorage.setItem('favorites', JSON.stringify(newFavorites));
      
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new CustomEvent('favoritesUpdated', { 
        detail: { favorites: newFavorites } 
      }));
      
      // Also remove from portfolio
      const newPortfolio = { ...portfolio };
      delete newPortfolio[coinId];
      setPortfolio(newPortfolio);
    }
  };
  
  // Open edit balance modal
  const openEditBalance = (coin) => {
    setEditingCoin(coin);
    setShowEditBalanceModal(true);
  };


  // Get display values based on selected currency
  const getDisplayValue = () => {
    switch (selectedCurrency) {
      case 0: // USD
        return {
          value: `$${totalValue.toFixed(2)}`,
          change: `${totalChange >= 0 ? '+' : ''}$${Math.abs(totalChange).toFixed(2)}`,
          changePercent: `(${totalChange >= 0 ? '+' : ''}${((totalChange / (totalValue - totalChange)) * 100).toFixed(2)}%)`,
          symbol: '$'
        };
      case 1: // GBP
        const gbpValue = totalValue * gbpRate;
        const gbpChange = totalChange * gbpRate;
        return {
          value: `£${gbpValue.toFixed(2)}`,
          change: `${gbpChange >= 0 ? '+' : ''}£${Math.abs(gbpChange).toFixed(2)}`,
          changePercent: `(${totalChange >= 0 ? '+' : ''}${((totalChange / (totalValue - totalChange)) * 100).toFixed(2)}%)`,
          symbol: '£'
        };
      case 2: // BTC
        const btcValue = btcPrice > 0 ? totalValue / btcPrice : 0;
        const btcChange = btcPrice > 0 ? totalChange / btcPrice : 0;
        return {
          value: `${btcValue.toFixed(6)} BTC`,
          change: `${btcChange >= 0 ? '+' : ''}${Math.abs(btcChange).toFixed(6)} BTC`,
          changePercent: `(${totalChange >= 0 ? '+' : ''}${((totalChange / (totalValue - totalChange)) * 100).toFixed(2)}%)`,
          symbol: '₿'
        };
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header className="pb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="d-flex align-items-center">
            <h5 className="mb-0 d-flex align-items-center">
              <BsWallet2 className="me-2" />
              Wallet
            </h5>
            <Tooltip content="Track your cryptocurrency portfolio. Enter the amount you own for each coin to see your total portfolio value in USD, GBP, or Bitcoin. Values automatically update every 30 seconds.">
              <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
            </Tooltip>
          </div>
          <div className="d-flex align-items-center gap-2">
            {lastUpdated && <TimeAgo date={lastUpdated} />}
            {error && (
              <BsExclamationTriangle className="text-warning" title={error} />
            )}
          </div>
        </div>
        {totalValue > 0 && (
          <div className="text-center mt-2" style={{ overflow: 'hidden', position: 'relative', height: '60px' }}>
            <div style={{ 
              position: 'absolute',
              width: '100%',
              transform: `translateY(${selectedCurrency === 0 ? '0' : '-100%'})`,
              transition: 'transform 0.5s ease-in-out',
              opacity: selectedCurrency === 0 ? 1 : 0,
              transitionProperty: 'transform, opacity'
            }}>
              <div className="h4 mb-0">${totalValue.toFixed(2)}</div>
              <div className={`small ${totalChange >= 0 ? 'text-success' : 'text-danger'}`}>
                {totalChange >= 0 ? '+' : ''}${Math.abs(totalChange).toFixed(2)} ({totalChange >= 0 ? '+' : ''}{((totalChange / (totalValue - totalChange)) * 100).toFixed(2)}%)
              </div>
            </div>
            <div style={{ 
              position: 'absolute',
              width: '100%',
              transform: `translateY(${selectedCurrency === 1 ? '0' : selectedCurrency === 0 ? '100%' : '-100%'})`,
              transition: 'transform 0.5s ease-in-out',
              opacity: selectedCurrency === 1 ? 1 : 0,
              transitionProperty: 'transform, opacity'
            }}>
              <div className="h4 mb-0">£{(totalValue * gbpRate).toFixed(2)}</div>
              <div className={`small ${totalChange >= 0 ? 'text-success' : 'text-danger'}`}>
                {totalChange >= 0 ? '+' : ''}£{Math.abs(totalChange * gbpRate).toFixed(2)} ({totalChange >= 0 ? '+' : ''}{((totalChange / (totalValue - totalChange)) * 100).toFixed(2)}%)
              </div>
            </div>
            <div style={{ 
              position: 'absolute',
              width: '100%',
              transform: `translateY(${selectedCurrency === 2 ? '0' : '100%'})`,
              transition: 'transform 0.5s ease-in-out',
              opacity: selectedCurrency === 2 ? 1 : 0,
              transitionProperty: 'transform, opacity'
            }}>
              <div className="h4 mb-0">{btcPrice > 0 ? (totalValue / btcPrice).toFixed(6) : '0.000000'} BTC</div>
              <div className={`small ${totalChange >= 0 ? 'text-success' : 'text-danger'}`}>
                {totalChange >= 0 ? '+' : ''}{Math.abs(btcPrice > 0 ? totalChange / btcPrice : 0).toFixed(6)} BTC ({totalChange >= 0 ? '+' : ''}{((totalChange / (totalValue - totalChange)) * 100).toFixed(2)}%)
              </div>
            </div>
          </div>
        )}
        {totalValue > 0 && (
          <div className="d-flex justify-content-center gap-2 mt-2">
              <button 
                className={`btn btn-sm rounded-circle p-0 ${selectedCurrency === 0 ? 'btn-primary' : 'btn-outline-secondary'}`}
                style={{ width: '8px', height: '8px', minWidth: '8px' }}
                onClick={() => setSelectedCurrency(0)}
                title="USD"
              />
              <button 
                className={`btn btn-sm rounded-circle p-0 ${selectedCurrency === 1 ? 'btn-primary' : 'btn-outline-secondary'}`}
                style={{ width: '8px', height: '8px', minWidth: '8px' }}
                onClick={() => setSelectedCurrency(1)}
                title="GBP"
              />
              <button 
                className={`btn btn-sm rounded-circle p-0 ${selectedCurrency === 2 ? 'btn-primary' : 'btn-outline-secondary'}`}
                style={{ width: '8px', height: '8px', minWidth: '8px' }}
                onClick={() => setSelectedCurrency(2)}
                title="BTC"
              />
          </div>
        )}
      </Card.Header>
      <Card.Body className="p-0">
        {loading && favorites.length > 0 && walletData.length === 0 ? (
          <div className="text-center py-3">
            <LoadingSpinner />
          </div>
        ) : walletData.length > 0 ? (
          <>
            <div className="px-2 py-1 border-bottom small text-muted d-flex align-items-center">
              <div className="flex-fill ps-5">Amount</div>
              <div className="text-center" style={{ minWidth: '90px' }}>Price</div>
              <div className="text-end" style={{ minWidth: '90px' }}>Value</div>
            </div>
            <ListGroup variant="flush">
            {walletData.map(coin => (
              <ListGroup.Item key={coin.id} className="px-2 py-1">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="d-flex align-items-center flex-grow-1">
                    <img 
                      src={coin.image} 
                      alt={coin.name} 
                      width="24" 
                      height="24" 
                      className="me-2" 
                    />
                    <div className="flex-grow-1">
                      <span className="fw-medium small">{coin.name}</span>
                      <span className="text-muted small ms-1">{coin.symbol.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="d-flex gap-1">
                    <Button
                      variant="link"
                      size="sm"
                      className="p-1 text-primary"
                      onClick={() => openEditBalance(coin)}
                      title="Edit balance"
                    >
                      <BsPencil size={14} />
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-1 text-danger"
                      onClick={() => removeFromWallet(coin.id)}
                      title="Remove from wallet"
                    >
                      <BsTrash size={14} />
                    </Button>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <div className="flex-fill">
                    <div className="font-monospace small text-center">
                      {coin.balance || 0} {coin.symbol.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-center" style={{ minWidth: '90px' }}>
                    <div className="font-monospace small">
                      ${coin.current_price >= 10000 ? 
                        (coin.current_price / 1000).toFixed(1) + 'K' : 
                        coin.current_price >= 1 ? 
                          coin.current_price.toFixed(2) : 
                          coin.current_price.toFixed(4)}
                    </div>
                    <small className={coin.price_change_percentage_24h >= 0 ? 'text-success' : 'text-danger'}>
                      {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                    </small>
                  </div>
                  <div className="text-end" style={{ minWidth: '90px' }}>
                    <div className="fw-medium small">${(coin.value || 0).toFixed(2)}</div>
                    <small className={coin.value > coin.previousValue ? 'text-success' : 'text-danger'}>
                      {coin.value > coin.previousValue ? '+' : ''}${Math.abs((coin.value || 0) - (coin.previousValue || 0)).toFixed(2)}
                    </small>
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
          </>
        ) : favorites.length === 0 ? (
          <div className="text-center text-muted py-5">
            <BsWallet2 size={48} className="mb-3" />
            <div className="h5">Your wallet is empty</div>
            <small>Click "Add Coin" to start tracking your portfolio</small>
          </div>
        ) : null}
      </Card.Body>
      
      <Card.Footer className="p-2">
        <Button 
          variant="outline-light" 
          className="w-100"
          onClick={() => setShowAddCoinModal(true)}
        >
          <BsPlus size={20} className="me-1" />
          Add Coin
        </Button>
      </Card.Footer>
      
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
    </Card>
  );
};

export default Wallet;
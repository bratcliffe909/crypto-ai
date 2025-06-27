import React, { useState, useEffect } from 'react';
import { Card, Form, Button, ListGroup, InputGroup, Badge } from 'react-bootstrap';
import { BsX, BsExclamationTriangle, BsWallet2, BsCurrencyDollar } from 'react-icons/bs';
import useLocalStorage from '../../hooks/useLocalStorage';
import LoadingSpinner from '../common/LoadingSpinner';
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
  
  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Listen for changes to favorites in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const savedFavorites = localStorage.getItem('favorites');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch wallet data
  const fetchWalletData = async () => {
    if (!favorites.length) {
      setWalletData([]);
      setTotalValue(0);
      setTotalChange(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get CSRF token
      const csrfResponse = await axios.get('/api/csrf-token');
      axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfResponse.data.csrf_token;
      
      const favoriteIds = favorites.join(',');
      const response = await axios.get(`/api/crypto/markets?ids=${favoriteIds}`);
      const data = response.data;
      
      // Calculate portfolio values
      let total = 0;
      let totalPrevious = 0;
      
      const enrichedData = data.map(coin => {
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
    } catch (err) {
      console.error('Wallet fetch error:', err);
      setError('Failed to update wallet');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when favorites or portfolio changes
  useEffect(() => {
    fetchWalletData();
  }, [favorites, portfolio]);

  // Auto-refresh every 30 seconds
  useInterval(() => {
    if (favorites.length > 0) {
      fetchWalletData();
    }
  }, 30000);
  
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
  
  // Remove from wallet
  const removeFromWallet = (coinId) => {
    const newFavorites = favorites.filter(id => id !== coinId);
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    
    // Also remove from portfolio
    const newPortfolio = { ...portfolio };
    delete newPortfolio[coinId];
    setPortfolio(newPortfolio);
  };

  // Format large numbers
  const formatLargeNumber = (num) => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    }
    return formatPrice(num);
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0 d-flex align-items-center">
            <BsWallet2 className="me-2" />
            Wallet
          </h5>
          <div className="d-flex align-items-center">
            {favorites.length > 0 && (
              <Badge bg="secondary" className="me-2">{favorites.length}</Badge>
            )}
            {error && (
              <BsExclamationTriangle className="text-warning" title={error} />
            )}
          </div>
        </div>
        {totalValue > 0 && (
          <div className="text-center mt-3">
            <div className="h3 mb-1">{formatLargeNumber(totalValue)}</div>
            <div className={totalChange >= 0 ? 'text-success' : 'text-danger'}>
              {totalChange >= 0 ? '+' : ''}{formatPrice(totalChange)} ({totalChange >= 0 ? '+' : ''}{((totalChange / (totalValue - totalChange)) * 100).toFixed(2)}%)
            </div>
            <small className="text-muted">Total Portfolio Value</small>
          </div>
        )}
      </Card.Header>
      <Card.Body className="p-0">
        {loading && favorites.length > 0 && walletData.length === 0 ? (
          <div className="text-center py-3">
            <LoadingSpinner />
          </div>
        ) : walletData.length > 0 ? (
          <ListGroup variant="flush">
            {walletData.map(coin => (
              <ListGroup.Item key={coin.id} className="px-3 py-2">
                <div className="d-flex align-items-center">
                  <img 
                    src={coin.image} 
                    alt={coin.name} 
                    width="32" 
                    height="32" 
                    className="me-3" 
                  />
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-medium">{coin.name}</div>
                        <small className="text-muted">{coin.symbol.toUpperCase()}</small>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 text-muted"
                        onClick={() => removeFromWallet(coin.id)}
                      >
                        <BsX size={20} />
                      </Button>
                    </div>
                    <div className="mt-2 row g-2">
                      <div className="col-4">
                        <InputGroup size="sm">
                          <Form.Control
                            type="number"
                            placeholder="0.00"
                            value={coin.balance || ''}
                            onChange={(e) => updateBalance(coin.id, e.target.value)}
                            step="0.00000001"
                            min="0"
                          />
                        </InputGroup>
                        <small className="text-muted">{coin.symbol.toUpperCase()}</small>
                      </div>
                      <div className="col-4 text-center">
                        <div className="font-monospace small">{formatPrice(coin.current_price)}</div>
                        <small className={coin.price_change_percentage_24h >= 0 ? 'text-success' : 'text-danger'}>
                          {coin.price_change_percentage_24h >= 0 ? '+' : ''}{formatPercentage(coin.price_change_percentage_24h)}
                        </small>
                      </div>
                      <div className="col-4 text-end">
                        <div className="fw-medium">{formatPrice(coin.value || 0)}</div>
                        <small className={coin.value > coin.previousValue ? 'text-success' : 'text-danger'}>
                          {coin.value > coin.previousValue ? '+' : ''}{formatPrice((coin.value || 0) - (coin.previousValue || 0))}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : favorites.length === 0 ? (
          <div className="text-center text-muted py-5">
            <BsWallet2 size={48} className="mb-3" />
            <div className="h5">Your wallet is empty</div>
            <small>Add coins from the market overview by clicking the star icon</small>
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
};

export default Wallet;
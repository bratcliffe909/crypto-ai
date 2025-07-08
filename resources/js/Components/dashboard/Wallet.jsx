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
  const [loadingCoins, setLoadingCoins] = useState({}); // Track loading state per coin
  const [cachedWalletData, setCachedWalletData] = useLocalStorage('cachedWalletData', {}); // Cache wallet data
  
  // Clear old cached data if it has incomplete structure
  useEffect(() => {
    const cached = localStorage.getItem('cachedWalletData');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Check if any cached coin has null market_cap (indicating old incomplete data)
        const hasIncompleteData = Object.values(parsed).some(coin => 
          coin && coin.market_cap === null && coin.price_change_percentage_24h === 0
        );
        if (hasIncompleteData) {
          console.log('Clearing old incomplete cached wallet data');
          localStorage.removeItem('cachedWalletData');
          setCachedWalletData({});
        }
      } catch (e) {
        // Invalid cache, clear it
        localStorage.removeItem('cachedWalletData');
        setCachedWalletData({});
      }
    }
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
    const portfolioCoins = Object.keys(portfolio);
    if (!portfolioCoins.length) {
      setWalletData([]);
      setTotalValue(0);
      setTotalChange(0);
      return;
    }

    try {
      // Only show loading if we don't have any data yet
      if (walletData.length === 0 && !Object.keys(cachedWalletData).length) {
        setLoading(true);
      }
      setError(null);
      
      // Get CSRF token
      const csrfResponse = await axios.get('/api/csrf-token');
      axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfResponse.data.csrf_token;
      
      // Always include bitcoin in the request to get BTC price
      const requestIds = portfolioCoins.includes('bitcoin') ? portfolioCoins : [...portfolioCoins, 'bitcoin'];
      
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
        .filter(coin => portfolioCoins.includes(coin.id)) // Only show coins that are actually in portfolio
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
      
      // Preserve any placeholders that were recently added (needsRefresh flag)
      const currentPlaceholders = walletData.filter(coin => coin.needsRefresh && !enrichedData.find(c => c.id === coin.id));
      
      // Add placeholder values to totals
      currentPlaceholders.forEach(placeholder => {
        total += placeholder.value || 0;
        totalPrevious += placeholder.previousValue || 0;
      });
      
      setWalletData([...enrichedData, ...currentPlaceholders]);
      setTotalValue(total);
      setTotalChange(total - totalPrevious);
      
      // Cache the enriched data by coin ID
      const newCachedData = {};
      enrichedData.forEach(coin => {
        newCachedData[coin.id] = {
          ...coin,
          cachedAt: new Date().toISOString()
        };
      });
      setCachedWalletData(prev => ({ ...prev, ...newCachedData }));
      
      // Clear loading state for all fetched coins
      setLoadingCoins(prev => {
        const newState = { ...prev };
        portfolioCoins.forEach(id => delete newState[id]);
        return newState;
      });
      
      // Only update last updated if we didn't get it from headers
      if (!response.headers['x-last-updated']) {
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
      setError('Failed to update wallet');
      
      // Load from cache if available
      if (Object.keys(cachedWalletData).length > 0) {
        const cachedEnrichedData = portfolioCoins
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
      
      // Clear loading state
      setLoadingCoins({});
    } finally {
      setLoading(false);
    }
  };

  // Fetch exchange rate on mount
  useEffect(() => {
    fetchExchangeRate();
  }, []);

  // Load cached data on mount if available
  useEffect(() => {
    const portfolioCoins = Object.keys(portfolio);
    if (portfolioCoins.length > 0 && Object.keys(cachedWalletData).length > 0) {
      const cachedEnrichedData = portfolioCoins
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
  }, []); // Only run on mount
  
  // Fetch data on mount and when portfolio changes
  useEffect(() => {
    fetchWalletData();
  }, [portfolio]);

  // Auto-refresh every 30 seconds
  useInterval(() => {
    if (Object.keys(portfolio).length > 0) {
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
  const addCoinToWallet = async (coin) => {
    // Add coin to portfolio with initial balance
    const initialBalance = coin.initialBalance || 0;
    
    // Close modal
    setShowAddCoinModal(false);
    
    // Update portfolio first
    const newPortfolio = {
      ...portfolio,
      [coin.id]: {
        balance: initialBalance,
        addedAt: new Date().toISOString()
      }
    };
    setPortfolio(newPortfolio);
    
    // Try to get coin data from cache first
    const cachedCoin = cachedWalletData[coin.id];
    if (cachedCoin) {
      // Use cached data immediately
      const enrichedCoin = {
        ...cachedCoin,
        balance: initialBalance,
        value: initialBalance * (cachedCoin.current_price || 0),
        previousValue: initialBalance * (cachedCoin.current_price || 0)
      };
      
      setWalletData(prevData => {
        const filtered = prevData.filter(c => c.id !== coin.id);
        return [...filtered, enrichedCoin];
      });
    } else {
      // No cache, create placeholder with proper format
      const placeholderCoin = {
        id: coin.id,
        symbol: coin.symbol.toLowerCase(), // API returns lowercase
        name: coin.name,
        image: coin.large || coin.thumb || coin.image,
        current_price: 0,
        market_cap: 0,
        market_cap_rank: coin.market_cap_rank || null,
        fully_diluted_valuation: null,
        total_volume: 0,
        high_24h: 0,
        low_24h: 0,
        price_change_24h: 0,
        price_change_percentage_24h: 0,
        market_cap_change_24h: 0,
        market_cap_change_percentage_24h: 0,
        circulating_supply: null,
        total_supply: null,
        max_supply: null,
        ath: 0,
        ath_change_percentage: 0,
        ath_date: null,
        atl: 0,
        atl_change_percentage: 0,
        atl_date: null,
        roi: null,
        last_updated: new Date().toISOString(),
        price_change_percentage_24h_in_currency: 0,
        price_change_percentage_30d_in_currency: 0,
        price_change_percentage_7d_in_currency: 0,
        balance: initialBalance,
        value: 0,
        previousValue: 0,
        needsRefresh: true
      };
      
      // Add to wallet data
      setWalletData(prevData => {
        const filtered = prevData.filter(c => c.id !== coin.id);
        return [...filtered, placeholderCoin];
      });
      
      // Cache this placeholder
      setCachedWalletData(prev => ({
        ...prev,
        [coin.id]: {
          ...placeholderCoin,
          cachedAt: new Date().toISOString()
        }
      }));
      
      // Try to refresh from API
      try {
        // Get CSRF token
        const csrfResponse = await axios.get('/api/csrf-token');
        axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfResponse.data.csrf_token;
        
        await axios.post(`/api/crypto/refresh-coin/${coin.id}`, {
          symbol: coin.symbol,
          name: coin.name,
          image: coin.large || coin.thumb
        });
        
        // Wait a bit then fetch wallet data
        setTimeout(() => {
          fetchWalletData();
        }, 2000); // Increased to 2 seconds to ensure refresh completes
      } catch (err) {
      }
    }
  };

  // Remove from wallet
  const removeFromWallet = (coinId) => {
    if (window.confirm('Are you sure you want to remove this coin from your wallet?')) {
      // Remove from portfolio
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
        {loading && Object.keys(portfolio).length > 0 && walletData.length === 0 ? (
          <div className="text-center py-3">
            <LoadingSpinner />
          </div>
        ) : walletData.length > 0 || Object.keys(portfolio).length > 0 ? (
          <>
            <div className="px-2 py-1 border-bottom small text-muted d-flex align-items-center">
              <div className="flex-fill ps-5">Amount</div>
              <div className="text-center" style={{ minWidth: '90px' }}>Price</div>
              <div className="text-end" style={{ minWidth: '90px' }}>Value</div>
            </div>
            <ListGroup variant="flush">
            {Object.keys(portfolio).map(coinId => {
              const coin = walletData.find(c => c.id === coinId);
              const isLoading = loadingCoins[coinId];
              
              
              // Show loading placeholder for coins being fetched
              if (!coin && isLoading) {
                return (
                  <ListGroup.Item key={coinId} className="px-2 py-1">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center flex-grow-1">
                        <div className="placeholder-glow me-2">
                          <span className="placeholder rounded-circle" style={{ width: 24, height: 24 }}></span>
                        </div>
                        <div className="flex-grow-1">
                          <span className="placeholder-glow">
                            <span className="placeholder col-6"></span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      <div className="flex-fill text-center">
                        <span className="placeholder-glow">
                          <span className="placeholder col-8"></span>
                        </span>
                      </div>
                      <div className="text-center" style={{ minWidth: '90px' }}>
                        <span className="placeholder-glow">
                          <span className="placeholder col-10"></span>
                        </span>
                      </div>
                      <div className="text-end" style={{ minWidth: '90px' }}>
                        <span className="placeholder-glow">
                          <span className="placeholder col-10"></span>
                        </span>
                      </div>
                    </div>
                  </ListGroup.Item>
                );
              }
              
              // If no coin data, create a minimal display with portfolio data
              if (!coin) {
                const cachedCoin = cachedWalletData[coinId];
                const balance = portfolio[coinId]?.balance || 0;
                
                
                // Create minimal coin object for display
                const minimalCoin = {
                  id: coinId,
                  name: cachedCoin?.name || coinId.charAt(0).toUpperCase() + coinId.slice(1).replace(/-/g, ' '),
                  symbol: cachedCoin?.symbol || coinId.slice(0, 3).toUpperCase(),
                  image: cachedCoin?.image || null,
                  current_price: cachedCoin?.current_price || 0,
                  price_change_percentage_24h: cachedCoin?.price_change_percentage_24h || 0,
                  balance: balance,
                  value: balance * (cachedCoin?.current_price || 0),
                  isStale: true,
                  isUnavailable: !cachedCoin
                };
                
                return (
                  <ListGroup.Item key={coinId} className="px-2 py-1" style={{ opacity: 0.6 }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <div className="d-flex align-items-center flex-grow-1">
                        {minimalCoin.image ? (
                          <img 
                            src={minimalCoin.image} 
                            alt={minimalCoin.name} 
                            width="24" 
                            height="24" 
                            className="me-2" 
                          />
                        ) : (
                          <div className="bg-secondary rounded-circle me-2" style={{ width: 24, height: 24 }} />
                        )}
                        <div className="flex-grow-1">
                          <span className="fw-medium small">{minimalCoin.name}</span>
                          <span className="text-muted small ms-1">{minimalCoin.symbol}</span>
                          <Tooltip content={minimalCoin.isUnavailable ? "Price data unavailable" : "Using cached data"}>
                            <BsExclamationTriangle className="ms-1 text-warning" size={12} />
                          </Tooltip>
                        </div>
                      </div>
                      <div className="d-flex gap-1">
                        <Button
                          variant="link"
                          size="sm"
                          className="p-1 text-white"
                          onClick={() => openEditBalance({ id: coinId, balance: balance })}
                          title="Edit balance"
                        >
                          <BsPencil size={14} />
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-1 text-white"
                          onClick={() => removeFromWallet(coinId)}
                          title="Remove from wallet"
                        >
                          <BsTrash size={14} />
                        </Button>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <div className="flex-fill">
                        <div className="font-monospace small text-center">
                          {balance} {minimalCoin.symbol}
                        </div>
                      </div>
                      <div className="text-center" style={{ minWidth: '90px' }}>
                        <div className="font-monospace small">
                          {minimalCoin.isUnavailable ? '--' : `$${minimalCoin.current_price.toFixed(2)}`}
                        </div>
                      </div>
                      <div className="text-end" style={{ minWidth: '90px' }}>
                        <div className="font-monospace small">
                          {minimalCoin.isUnavailable ? '--' : `$${minimalCoin.value.toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                  </ListGroup.Item>
                );
              }
              
              return (
              <ListGroup.Item key={coin.id} className="px-2 py-1" style={{ opacity: coin.isStale ? 0.8 : 1 }}>
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
                      {coin.isStale && (
                        <Tooltip content="Using cached data - unable to fetch latest prices">
                          <BsExclamationTriangle className="ms-1 text-warning" size={12} />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <div className="d-flex gap-1">
                    <Button
                      variant="link"
                      size="sm"
                      className="p-1 text-white"
                      onClick={() => openEditBalance(coin)}
                      title="Edit balance"
                    >
                      <BsPencil size={14} />
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-1 text-white"
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
                      {coin.balance || 0} {(coin.symbol || coin.id.slice(0, 3)).toUpperCase()}
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
            );
            })}
          </ListGroup>
          </>
        ) : (
          <div className="text-center text-muted py-5">
            <BsWallet2 size={48} className="mb-3" />
            <div className="h5">Your wallet is empty</div>
            <small>Click "Add Coin" to start tracking your portfolio</small>
          </div>
        )}
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
        existingCoins={Object.keys(portfolio)}
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
import React, { useState, useEffect } from 'react';
import { Card, Form, Button, ListGroup, InputGroup, Badge } from 'react-bootstrap';
import { BsX, BsSearch, BsExclamationTriangle, BsPlus, BsStar, BsStarFill } from 'react-icons/bs';
import useLocalStorage from '../../hooks/useLocalStorage';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatPrice, formatPercentage } from '../../utils/formatters';
import useInterval from '../../hooks/useInterval';
import axios from 'axios';

const Watchlist = () => {
  const [watchlist, setWatchlist] = useLocalStorage('watchlist', []);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [watchlistData, setWatchlistData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch watchlist data
  const fetchWatchlistData = async () => {
    if (!watchlist.length) {
      setWatchlistData([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get CSRF token
      const csrfResponse = await axios.get('/api/csrf-token');
      axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfResponse.data.csrf_token;
      
      const watchlistIds = watchlist.join(',');
      const response = await axios.get(`/api/crypto/price/${watchlistIds}`);
      setWatchlistData(response.data);
    } catch (err) {
      console.error('Watchlist fetch error:', err);
      setError('Failed to update watchlist');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when watchlist changes
  useEffect(() => {
    fetchWatchlistData();
  }, [watchlist]);

  // Auto-refresh every 30 seconds
  useInterval(() => {
    if (watchlist.length > 0) {
      fetchWatchlistData();
    }
  }, 30000);

  const handleSearch = async () => {
    if (!searchTerm.trim() || searchTerm.length < 2) return;
    
    setSearching(true);
    try {
      const response = await axios.get('/api/crypto/search', { 
        params: { query: searchTerm } 
      });
      // Filter out coins already in watchlist
      const filtered = response.data.filter(coin => !watchlist.includes(coin.id));
      setSearchResults(filtered.slice(0, 10)); // Limit to 10 results
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (e.target.value.length === 0) {
      setSearchResults([]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const addToWatchlist = (coin) => {
    if (!watchlist.includes(coin.id)) {
      setWatchlist([...watchlist, coin.id]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeFromWatchlist = (coinId) => {
    setWatchlist(watchlist.filter(id => id !== coinId));
  };

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Watchlist</h5>
        <div className="d-flex align-items-center">
          {watchlist.length > 0 && (
            <Badge bg="secondary" className="me-2">{watchlist.length}</Badge>
          )}
          {error && (
            <BsExclamationTriangle className="text-warning" title={error} />
          )}
        </div>
      </Card.Header>
      <Card.Body>
        <InputGroup className="mb-3">
          <Form.Control
            placeholder="Search coins..."
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyPress={handleKeyPress}
          />
          <Button 
            variant="outline-secondary" 
            onClick={handleSearch} 
            disabled={searching || searchTerm.length < 2}
          >
            {searching ? <LoadingSpinner size="sm" /> : <BsSearch />}
          </Button>
        </InputGroup>

        {searchResults.length > 0 && (
          <Card className="mb-3 border-secondary">
            <Card.Header className="bg-secondary text-white py-2">
              <small>Search Results</small>
            </Card.Header>
            <ListGroup variant="flush">
              {searchResults.map(coin => (
                <ListGroup.Item 
                  key={coin.id}
                  action
                  onClick={() => addToWatchlist(coin)}
                  className="d-flex align-items-center py-2"
                >
                  <img 
                    src={coin.thumb} 
                    alt={coin.name} 
                    width="24" 
                    height="24" 
                    className="me-2" 
                  />
                  <div className="flex-grow-1">
                    <div className="fw-medium">{coin.name}</div>
                    <small className="text-muted">{coin.symbol}</small>
                  </div>
                  <div className="text-end">
                    <small className="text-muted">#{coin.market_cap_rank || 'N/A'}</small>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="ms-2 p-1 text-success"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToWatchlist(coin);
                    }}
                  >
                    <BsPlus size={20} />
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        )}

        {loading && watchlist.length > 0 && watchlistData.length === 0 ? (
          <div className="text-center py-3">
            <LoadingSpinner />
          </div>
        ) : watchlistData.length > 0 ? (
          <ListGroup>
            {watchlistData.map(coin => (
              <ListGroup.Item key={coin.id} className="d-flex align-items-center px-2">
                <BsStarFill className="text-warning me-2" size={16} />
                <img 
                  src={coin.image} 
                  alt={coin.name} 
                  width="24" 
                  height="24" 
                  className="me-2" 
                />
                <div className="flex-grow-1">
                  <div className="fw-medium">{coin.name}</div>
                  <small className="text-muted">{coin.symbol.toUpperCase()}</small>
                </div>
                <div className="text-end">
                  <div className="font-monospace">{formatPrice(coin.current_price)}</div>
                  <small className={coin.price_change_percentage_24h > 0 ? 'price-up' : 'price-down'}>
                    {formatPercentage(coin.price_change_percentage_24h)}
                  </small>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="ms-2 p-1 text-muted"
                  onClick={() => removeFromWatchlist(coin.id)}
                >
                  <BsX size={20} />
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : watchlist.length === 0 ? (
          <div className="text-center text-muted py-3">
            <BsStar size={24} className="mb-2" />
            <div>No coins in watchlist</div>
            <small>Search and add coins to track</small>
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
};

export default Watchlist;

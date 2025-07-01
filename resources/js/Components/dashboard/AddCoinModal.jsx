import React, { useState, useEffect } from 'react';
import { Modal, Form, InputGroup, ListGroup, Button, Spinner } from 'react-bootstrap';
import { BsSearch, BsPlus } from 'react-icons/bs';
import axios from 'axios';
import useDebounce from '../../hooks/useDebounce';

const AddCoinModal = ({ show, onHide, onAddCoin, existingCoins = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [balance, setBalance] = useState('');
  
  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Search for coins when search term changes
  useEffect(() => {
    const searchCoins = async () => {
      if (debouncedSearchTerm.length < 2) {
        setSearchResults([]);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Get CSRF token
        const csrfResponse = await axios.get('/api/csrf-token');
        axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfResponse.data.csrf_token;
        
        // Search for coins
        const response = await axios.get(`/api/crypto/search?q=${encodeURIComponent(debouncedSearchTerm)}`);
        
        // Filter out coins that are already in the wallet
        const filteredResults = response.data.filter(
          coin => !existingCoins.includes(coin.id)
        );
        
        setSearchResults(filteredResults.slice(0, 10)); // Limit to 10 results
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search coins');
      } finally {
        setLoading(false);
      }
    };
    
    searchCoins();
  }, [debouncedSearchTerm, existingCoins]);
  
  // Clear search when modal closes
  useEffect(() => {
    if (!show) {
      setSearchTerm('');
      setSearchResults([]);
      setError(null);
      setSelectedCoin(null);
      setBalance('');
    }
  }, [show]);
  
  const handleSelectCoin = (coin) => {
    setSelectedCoin(coin);
  };
  
  const handleAddCoin = () => {
    if (selectedCoin) {
      const coinWithBalance = {
        ...selectedCoin,
        initialBalance: parseFloat(balance) || 0
      };
      onAddCoin(coinWithBalance);
      // Clear everything after adding
      setSearchTerm('');
      setSearchResults([]);
      setSelectedCoin(null);
      setBalance('');
    }
  };
  
  const handleBack = () => {
    setSelectedCoin(null);
    setBalance('');
  };
  
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {selectedCoin ? `Add ${selectedCoin.name} to Wallet` : 'Add Coin to Wallet'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!selectedCoin ? (
          // Search view
          <>
        <InputGroup className="mb-3">
          <InputGroup.Text>
            <BsSearch />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search for a coin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </InputGroup>
        
        {loading && (
          <div className="text-center py-3">
            <Spinner animation="border" size="sm" />
            <span className="ms-2">Searching...</span>
          </div>
        )}
        
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        {!loading && searchResults.length > 0 && (
          <ListGroup>
            {searchResults.map(coin => (
              <ListGroup.Item 
                key={coin.id}
                className="d-flex justify-content-between align-items-center"
                action
                onClick={() => handleSelectCoin(coin)}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center">
                  {coin.thumb && (
                    <img 
                      src={coin.thumb} 
                      alt={coin.name}
                      width="24"
                      height="24"
                      className="me-2"
                    />
                  )}
                  <div>
                    <div className="fw-medium">{coin.name}</div>
                    <small className="text-muted">{coin.symbol?.toUpperCase()}</small>
                  </div>
                </div>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectCoin(coin);
                  }}
                >
                  <BsPlus size={18} />
                  Select
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
        
        {!loading && searchTerm.length >= 2 && searchResults.length === 0 && (
          <div className="text-center text-muted py-3">
            No coins found matching "{searchTerm}"
          </div>
        )}
        
        {searchTerm.length < 2 && searchTerm.length > 0 && (
          <div className="text-center text-muted py-3">
            Type at least 2 characters to search
          </div>
        )}
          </>
        ) : (
          // Balance input view
          <div>
            <div className="d-flex align-items-center mb-3">
              {selectedCoin.thumb && (
                <img 
                  src={selectedCoin.thumb} 
                  alt={selectedCoin.name}
                  width="32"
                  height="32"
                  className="me-3"
                />
              )}
              <div>
                <h5 className="mb-0">{selectedCoin.name}</h5>
                <small className="text-muted">{selectedCoin.symbol?.toUpperCase()}</small>
              </div>
            </div>
            
            <Form.Group className="mb-3">
              <Form.Label>Amount you own</Form.Label>
              <Form.Control
                type="number"
                placeholder="0.00"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                step="any"
                min="0"
                autoFocus
              />
              <Form.Text className="text-muted">
                Enter the amount of {selectedCoin.symbol?.toUpperCase()} you currently own
              </Form.Text>
            </Form.Group>
            
            <div className="d-flex gap-2">
              <Button variant="secondary" onClick={handleBack}>
                Back
              </Button>
              <Button variant="primary" onClick={handleAddCoin} className="flex-grow-1">
                Add to Wallet
              </Button>
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default AddCoinModal;
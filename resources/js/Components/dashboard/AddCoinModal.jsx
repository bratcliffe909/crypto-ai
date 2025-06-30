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
    }
  }, [show]);
  
  const handleAddCoin = (coin) => {
    onAddCoin(coin);
    // Clear search after adding
    setSearchTerm('');
    setSearchResults([]);
  };
  
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add Coin to Wallet</Modal.Title>
      </Modal.Header>
      <Modal.Body>
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
                onClick={() => handleAddCoin(coin)}
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
                    handleAddCoin(coin);
                  }}
                >
                  <BsPlus size={18} />
                  Add
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
      </Modal.Body>
    </Modal>
  );
};

export default AddCoinModal;
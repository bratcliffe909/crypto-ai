import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

const EditBalanceModal = ({ show, onHide, coin, currentBalance, onSave }) => {
  const [balance, setBalance] = useState('');
  
  useEffect(() => {
    if (show && currentBalance !== undefined) {
      setBalance(currentBalance.toString());
    }
  }, [show, currentBalance]);
  
  const handleSave = () => {
    const newBalance = parseFloat(balance) || 0;
    onSave(coin.id, newBalance);
    onHide();
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };
  
  if (!coin) return null;
  
  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton>
        <Modal.Title>Edit {coin.symbol?.toUpperCase()} Balance</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex align-items-center mb-3">
          {coin.image && (
            <img 
              src={coin.image} 
              alt={coin.name}
              width="32"
              height="32"
              className="me-3"
            />
          )}
          <div>
            <h6 className="mb-0">{coin.name}</h6>
            <small className="text-muted">{coin.symbol?.toUpperCase()}</small>
          </div>
        </div>
        
        <Form.Group>
          <Form.Label>Amount</Form.Label>
          <Form.Control
            type="number"
            placeholder="0.00"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            onKeyPress={handleKeyPress}
            step="any"
            min="0"
            autoFocus
          />
          <Form.Text className="text-muted">
            Enter the amount of {coin.symbol?.toUpperCase()} you own
          </Form.Text>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditBalanceModal;
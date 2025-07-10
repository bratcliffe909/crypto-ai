import React, { useState } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import { BsClipboard, BsCheckCircle, BsHeart } from 'react-icons/bs';
import { FaEthereum } from 'react-icons/fa';
import QRCode from 'react-qr-code';

const DonationModal = ({ show, onHide, ethAddress }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(ethAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <BsHeart className="text-danger" />
          Support Development
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        <div className="mb-4">
          <p className="mb-3">
            If you find this crypto dashboard helpful, consider supporting its development with an Ethereum donation.
          </p>
          <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
            <FaEthereum size={24} className="text-primary" />
            <span className="fs-5 fw-semibold">Ethereum (ETH)</span>
          </div>
        </div>

        <div className="bg-light p-4 rounded mb-3">
          <QRCode
            value={ethAddress}
            size={200}
            level="H"
            className="mx-auto"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>

        <div className="mb-3">
          <div className="input-group">
            <input
              type="text"
              className="form-control text-center font-monospace"
              value={ethAddress}
              readOnly
              style={{ fontSize: '0.875rem' }}
            />
            <Button
              variant={copied ? 'success' : 'outline-secondary'}
              onClick={handleCopyAddress}
              className="d-flex align-items-center gap-1"
            >
              {copied ? (
                <>
                  <BsCheckCircle /> Copied!
                </>
              ) : (
                <>
                  <BsClipboard /> Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {copied && (
          <Alert variant="success" className="py-2">
            Address copied to clipboard!
          </Alert>
        )}

        <p className="text-muted small mb-0">
          Thank you for your support! Every contribution helps maintain and improve this dashboard.
        </p>
      </Modal.Body>
    </Modal>
  );
};

export default DonationModal;
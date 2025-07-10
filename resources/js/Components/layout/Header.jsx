import React, { useState } from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { BsMoonFill, BsSunFill, BsHeart } from 'react-icons/bs';
import { usePage } from '@inertiajs/react';
import SystemStatus from '../common/SystemStatus';
import DonationModal from '../common/DonationModal';

const Header = ({ theme, toggleTheme }) => {
  const [showDonationModal, setShowDonationModal] = useState(false);
  const { ethDonationAddress } = usePage().props;
  
  // Only show donation button if address is configured
  const showDonation = ethDonationAddress && ethDonationAddress.trim() !== '';

  return (
    <>
      <Navbar expand="lg" className="border-bottom">
        <Container fluid>
          <Navbar.Brand href="#" className="fw-bold fs-4">
            Crypto Dashboard
          </Navbar.Brand>
          
          <Nav className="ms-auto d-flex align-items-center">
            <SystemStatus />
            {showDonation && (
              <Button
                variant="link"
                className="nav-link p-2 text-danger"
                onClick={() => setShowDonationModal(true)}
                aria-label="Donate"
                title="Support Development"
              >
                <BsHeart size={20} />
              </Button>
            )}
            <Button
              variant="link"
              className="nav-link p-2"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <BsSunFill size={20} /> : <BsMoonFill size={20} />}
            </Button>
          </Nav>
        </Container>
      </Navbar>
      
      {showDonation && (
        <DonationModal 
          show={showDonationModal} 
          onHide={() => setShowDonationModal(false)}
          ethAddress={ethDonationAddress}
        />
      )}
    </>
  );
};

export default Header;

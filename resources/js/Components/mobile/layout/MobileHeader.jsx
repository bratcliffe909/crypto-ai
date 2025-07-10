import React, { useState } from 'react';
import { BsMoonFill, BsSunFill, BsHeart } from 'react-icons/bs';
import { usePage } from '@inertiajs/react';
import DonationModal from '../../common/DonationModal';

const MobileHeader = ({ theme, toggleTheme }) => {
  const [showDonationModal, setShowDonationModal] = useState(false);
  const { ethDonationAddress } = usePage().props;
  
  // Only show donation button if address is configured
  const showDonation = ethDonationAddress && ethDonationAddress.trim() !== '';

  return (
    <>
      <header className="mobile-header">
        <div className="d-flex justify-content-between align-items-center px-3 py-2">
          <h5 className="mb-0">Crypto Dashboard</h5>
          
          <div className="d-flex align-items-center gap-2">
            {showDonation && (
              <button
                className="btn btn-sm text-danger"
                onClick={() => setShowDonationModal(true)}
                aria-label="Donate"
                title="Support Development"
              >
                <BsHeart size={18} />
              </button>
            )}
            
            <button
              className="btn btn-sm"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <BsSunFill size={18} /> : <BsMoonFill size={18} />}
            </button>
          </div>
        </div>
      </header>
      
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

export default MobileHeader;
import React from 'react';
import { BsMoonFill, BsSunFill } from 'react-icons/bs';
import SystemStatus from '../../common/SystemStatus';

const MobileHeader = ({ theme, toggleTheme }) => {
  return (
    <header className="mobile-header">
      <div className="d-flex justify-content-between align-items-center px-3 py-2">
        <h5 className="mb-0">Crypto Dashboard</h5>
        
        <div className="d-flex align-items-center gap-2">
          <SystemStatus />
          
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
  );
};

export default MobileHeader;
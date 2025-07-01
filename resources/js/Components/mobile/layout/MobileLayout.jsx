import React, { useState } from 'react';
import BottomNavigation from './BottomNavigation';
import MobileHeader from './MobileHeader';
import MobileMarket from '../market/MobileMarket';
import MobileWallet from '../wallet/MobileWallet';
import MobileTrendingCoins from '../trending/MobileTrendingCoins';
import MobileCalendar from '../calendar/MobileCalendar';
import MobileNews from '../news/MobileNews';

const MobileLayout = ({ theme, toggleTheme }) => {
  const [activeSection, setActiveSection] = useState('market');

  const renderSection = () => {
    switch (activeSection) {
      case 'market':
        return <MobileMarket />;
      case 'wallet':
        return <MobileWallet />;
      case 'trending':
        return <MobileTrendingCoins />;
      case 'calendar':
        return <MobileCalendar />;
      case 'news':
        return <MobileNews />;
      default:
        return (
          <div className="p-4">
            <h2>Section: {activeSection}</h2>
            <p>This section is not implemented yet.</p>
          </div>
        );
    }
  };

  return (
    <div className="mobile-app">
      <MobileHeader theme={theme} toggleTheme={toggleTheme} />
      
      <div className="mobile-content">
        {renderSection()}
      </div>
      
      <BottomNavigation 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
    </div>
  );
};

export default MobileLayout;
import React from 'react';
import MobileMarketStats from './MobileMarketStats';
import MobileMarketOverview from './MobileMarketOverview';

const MobileMarket = () => {
  return (
    <div className="mobile-section mobile-market">
      <MobileMarketStats />
      <MobileMarketOverview />
    </div>
  );
};

export default MobileMarket;
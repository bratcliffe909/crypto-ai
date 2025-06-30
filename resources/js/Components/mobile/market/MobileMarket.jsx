import React from 'react';
import MarketOverview from '../../dashboard/MarketOverview';
import MarketStats from '../../dashboard/MarketStats';

const MobileMarket = () => {
  return (
    <div className="mobile-section mobile-market">
      <MarketStats />
      <MarketOverview />
    </div>
  );
};

export default MobileMarket;
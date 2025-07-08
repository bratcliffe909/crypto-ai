import React, { useState } from 'react';
import { BsGridFill } from 'react-icons/bs';
import MobileSectionHeader from '../common/MobileSectionHeader';
import MobileMarketStats from './MobileMarketStats';
import MobileMarketOverview from './MobileMarketOverview';

const MobileMarket = () => {
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  return (
    <div className="mobile-section mobile-market">
      <MobileSectionHeader
        title="Market"
        icon={BsGridFill}
        lastUpdated={lastUpdated}
        error={error}
      />
      <MobileMarketStats />
      <MobileMarketOverview 
        onDataLoad={(lastFetch, error) => {
          setLastUpdated(lastFetch);
          setError(error);
        }}
      />
    </div>
  );
};

export default MobileMarket;
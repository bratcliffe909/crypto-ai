import React from 'react';
import { BsGridFill } from 'react-icons/bs';
import MobileSectionHeader from '../common/MobileSectionHeader';
import MobileMarketStats from './MobileMarketStats';
import MobileMarketOverview from './MobileMarketOverview';

const MobileMarket = () => {
  return (
    <div className="mobile-section mobile-market">
      <MobileSectionHeader
        title="Market"
        icon={BsGridFill}
      />
      <MobileMarketStats />
      <MobileMarketOverview />
    </div>
  );
};

export default MobileMarket;
import React, { useState, useEffect, lazy, Suspense } from 'react';
import SwipeableViews from 'react-swipeable-views';
import { virtualize } from 'react-swipeable-views-utils';
import BottomNavigation from './BottomNavigation';
import LoadingSpinner from '../../common/LoadingSpinner';
import MobileHeader from './MobileHeader';

// Virtualized swipeable views for better performance
const VirtualizeSwipeableViews = virtualize(SwipeableViews);

// Lazy load mobile sections
const MobileWallet = lazy(() => import('../wallet/MobileWallet'));
const MobileMarket = lazy(() => import('../market/MobileMarket'));
const MobileTrendingCoins = lazy(() => import('../trending/MobileTrendingCoins'));
const MobileCalendar = lazy(() => import('../calendar/MobileCalendar'));
const MobileNews = lazy(() => import('../news/MobileNews'));
const MobileAnalysis = lazy(() => import('../analysis/MobileAnalysis'));

const MobileLayout = ({ theme, toggleTheme }) => {
  const sections = ['wallet', 'market', 'trending', 'calendar', 'news', 'analysis'];
  
  const [activeIndex, setActiveIndex] = useState(() => {
    const hash = window.location.hash.slice(1);
    const index = sections.indexOf(hash);
    return index >= 0 ? index : 1; // Default to market (index 1)
  });

  useEffect(() => {
    window.location.hash = sections[activeIndex];
  }, [activeIndex, sections]);

  const handleChangeIndex = (index) => {
    setActiveIndex(index);
  };

  const slideRenderer = ({ index }) => {
    const sectionComponents = [
      <MobileWallet />,
      <MobileMarket />,
      <MobileTrendingCoins />,
      <MobileCalendar />,
      <MobileNews />,
      <MobileAnalysis />
    ];

    return (
      <div className="swipe-section" key={index}>
        <Suspense fallback={
          <div className="d-flex justify-content-center align-items-center h-100">
            <LoadingSpinner />
          </div>
        }>
          {sectionComponents[index]}
        </Suspense>
      </div>
    );
  };

  return (
    <div className="mobile-app">
      <MobileHeader theme={theme} toggleTheme={toggleTheme} />
      
      <VirtualizeSwipeableViews
        className="mobile-content"
        index={activeIndex}
        onChangeIndex={handleChangeIndex}
        slideCount={sections.length}
        slideRenderer={slideRenderer}
        resistance
      />
      
      <BottomNavigation 
        activeSection={sections[activeIndex]} 
        onSectionChange={(section) => {
          const index = sections.indexOf(section);
          if (index >= 0) setActiveIndex(index);
        }} 
      />
    </div>
  );
};

export default MobileLayout;
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { usePage } from '@inertiajs/react';
import { Container } from 'react-bootstrap';
import { useMobileDetection } from '../hooks/useMobileDetection';
import Header from '../Components/layout/Header';
import MarketOverview from '../Components/dashboard/MarketOverview';
import Wallet from '../Components/dashboard/Wallet';
import BullMarketBand from '../Components/dashboard/BullMarketBand';
import FearGreedIndex from '../Components/dashboard/FearGreedIndex';
import TrendingCoins from '../Components/dashboard/TrendingCoins';
import TechnicalIndicators from '../Components/dashboard/TechnicalIndicators';
import PiCycleTop from '../Components/dashboard/PiCycleTop';
import RainbowChart from '../Components/dashboard/RainbowChart';
import AltcoinSeasonIndex from '../Components/dashboard/AltcoinSeasonIndex';
import EconomicCalendar from '../Components/dashboard/EconomicCalendar';
import NewsFeed from '../Components/dashboard/NewsFeed';
import MarketStats from '../Components/dashboard/MarketStats';
import LoadingSpinner from '../Components/common/LoadingSpinner';

// Lazy load mobile layout
const MobileLayout = lazy(() => import('../Components/mobile/layout/MobileLayout'));

function Dashboard() {
  const props = usePage().props;
  const { isMobile, isTablet } = useMobileDetection();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Show mobile layout for phones and tablets
  if (isMobile || isTablet) {
    return (
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <MobileLayout theme={theme} toggleTheme={toggleTheme} />
      </Suspense>
    );
  }

  // Desktop layout
  return (
    <div className="min-vh-100 bg-body">
      <Header theme={theme} toggleTheme={toggleTheme} />
      
      <Container fluid className="py-4">
        {/* Main Content */}
        <div className="row g-4 mb-4">
          {/* Left Column */}
          <div className="col-lg-3">
            <Wallet />
            <FearGreedIndex />
            <MarketStats />
            <TrendingCoins />
          </div>
          
          {/* Center Column */}
          <div className="col-lg-6">
            <MarketOverview />
            <BullMarketBand />
            <PiCycleTop />
            <RainbowChart />
            <AltcoinSeasonIndex />
            <TechnicalIndicators />
          </div>
          
          {/* Right Column */}
          <div className="col-lg-3">
            <EconomicCalendar />
            <NewsFeed />
          </div>
        </div>
        

      </Container>
    </div>
  );
}

export default Dashboard;

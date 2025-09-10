import React, { useState, useEffect, lazy, Suspense } from 'react';
import { 
  BsGraphUp, 
  BsGraphDown,
  BsSpeedometer,
  BsActivity,
  BsBandaid,
  BsRainbow,
  BsCurrencyExchange,
  BsChatDots,
  BsBarChart
} from 'react-icons/bs';
import LoadingSpinner from '../../common/LoadingSpinner';
import MobileSectionHeader from '../common/MobileSectionHeader';

// Lazy load chart components
const BullMarketBand = lazy(() => import('../../dashboard/BullMarketBand'));
const RainbowChart = lazy(() => import('../../dashboard/RainbowChart'));
const PiCycleTop = lazy(() => import('../../dashboard/PiCycleTop'));
const FearGreedIndex = lazy(() => import('../../dashboard/FearGreedIndex'));
const TechnicalIndicators = lazy(() => import('../../dashboard/TechnicalIndicators'));
const MobileAltcoinSeason = lazy(() => import('./MobileAltcoinSeason'));
const MobileEconomicMiniDashboard = lazy(() => import('./MobileEconomicMiniDashboard'));
const MarketSentiment = lazy(() => import('../../desktop/indicators/MarketSentiment'));
const SocialActivity = lazy(() => import('../../desktop/indicators/SocialActivity'));

const MobileAnalysis = () => {
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const charts = [
    { id: 'bullmarket', label: 'Bull Market Band', component: BullMarketBand, icon: BsBandaid },
    { id: 'rainbow', label: 'Rainbow Chart', component: RainbowChart, icon: BsRainbow },
    { id: 'picycle', label: 'Pi Cycle Top', component: PiCycleTop, icon: BsGraphDown },
    { id: 'economic', label: 'Economic Indicators', component: MobileEconomicMiniDashboard, icon: BsBarChart },
    { id: 'feargreed', label: 'Fear & Greed', component: FearGreedIndex, icon: BsSpeedometer },
    { id: 'sentiment', label: 'Market Sentiment', component: MarketSentiment, icon: BsChatDots },
    { id: 'social', label: 'Social Activity', component: SocialActivity, icon: BsChatDots },
    { id: 'altseason', label: 'Altcoin Season', component: MobileAltcoinSeason, icon: BsCurrencyExchange },
    { id: 'rsi', label: 'RSI & Indicators', component: TechnicalIndicators, icon: BsActivity }
  ];

  const ActiveChartComponent = charts[activeChartIndex].component;

  // Update last updated time when component mounts or chart changes
  useEffect(() => {
    setLastUpdated(new Date());
    setError(null);
  }, [activeChartIndex]);

  return (
    <div className="mobile-section mobile-analysis">
      <MobileSectionHeader
        title="Charts"
        icon={BsGraphUp}
        lastUpdated={lastUpdated}
        error={error}
      />

      <div className="chart-menu">
        {charts.map((chart, index) => {
          const IconComponent = chart.icon;
          return (
            <button
              key={chart.id}
              className={`chart-menu-item ${index === activeChartIndex ? 'active' : ''}`}
              onClick={() => setActiveChartIndex(index)}
              aria-label={chart.label}
            >
              <IconComponent size={20} />
              <span className="chart-menu-label">{chart.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mobile-chart-container">
        <Suspense fallback={
          <div className="chart-loading">
            <LoadingSpinner />
          </div>
        }>
          <div className="chart-wrapper">
            <ActiveChartComponent />
          </div>
        </Suspense>
      </div>
    </div>
  );
};

export default MobileAnalysis;
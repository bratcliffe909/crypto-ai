import React, { useState, lazy, Suspense } from 'react';
import { BsGraphUp, BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import LoadingSpinner from '../../common/LoadingSpinner';

// Lazy load chart components
const BullMarketBand = lazy(() => import('../../dashboard/BullMarketBand'));
const RainbowChart = lazy(() => import('../../dashboard/RainbowChart'));
const PiCycleTop = lazy(() => import('../../dashboard/PiCycleTop'));
const FearGreedIndex = lazy(() => import('../../dashboard/FearGreedIndex'));
const MarketBreadth = lazy(() => import('../../dashboard/MarketBreadth'));

const MobileAnalysis = () => {
  const [activeChartIndex, setActiveChartIndex] = useState(0);

  const charts = [
    { id: 'bullmarket', label: 'Bull Market Band', component: BullMarketBand },
    { id: 'rainbow', label: 'Rainbow Chart', component: RainbowChart },
    { id: 'picycle', label: 'Pi Cycle Top', component: PiCycleTop },
    { id: 'feargreed', label: 'Fear & Greed', component: FearGreedIndex },
    { id: 'breadth', label: 'Market Breadth', component: MarketBreadth }
  ];

  const ActiveChartComponent = charts[activeChartIndex].component;

  const handlePrevChart = () => {
    setActiveChartIndex((prev) => (prev === 0 ? charts.length - 1 : prev - 1));
  };

  const handleNextChart = () => {
    setActiveChartIndex((prev) => (prev === charts.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="mobile-section mobile-analysis">
      <div className="analysis-header">
        <div className="d-flex align-items-center">
          <h5 className="mb-0">Analysis</h5>
          <BsGraphUp className="ms-2 text-primary" size={20} />
        </div>
      </div>

      <div className="chart-navigation">
        <button 
          className="nav-arrow prev"
          onClick={handlePrevChart}
          aria-label="Previous chart"
        >
          <BsChevronLeft size={20} />
        </button>
        
        <div className="chart-info">
          <div className="chart-title">{charts[activeChartIndex].label}</div>
          <div className="chart-indicators">
            {charts.map((_, index) => (
              <span
                key={index}
                className={`indicator ${index === activeChartIndex ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>
        
        <button 
          className="nav-arrow next"
          onClick={handleNextChart}
          aria-label="Next chart"
        >
          <BsChevronRight size={20} />
        </button>
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

      <div className="chart-list">
        {charts.map((chart, index) => (
          <button
            key={chart.id}
            className={`chart-item ${index === activeChartIndex ? 'active' : ''}`}
            onClick={() => setActiveChartIndex(index)}
          >
            <span className="chart-number">{index + 1}</span>
            <span className="chart-name">{chart.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileAnalysis;
import React, { useState } from 'react';
import { ButtonGroup, Button } from 'react-bootstrap';
import BullMarketBand from '../../dashboard/BullMarketBand';
import RainbowChart from '../../dashboard/RainbowChart';
import PiCycleTop from '../../dashboard/PiCycleTop';

const MobileAnalysis = () => {
  const [activeChart, setActiveChart] = useState('bullmarket');

  const charts = [
    { id: 'bullmarket', label: 'Bull Market', component: BullMarketBand },
    { id: 'rainbow', label: 'Rainbow', component: RainbowChart },
    { id: 'picycle', label: 'Pi Cycle', component: PiCycleTop }
  ];

  const ActiveChartComponent = charts.find(c => c.id === activeChart)?.component;

  return (
    <div className="mobile-section mobile-analysis">
      <div className="mobile-analysis-header p-3 border-bottom">
        <h5 className="mb-2">Chart Analysis</h5>
        <ButtonGroup size="sm" className="w-100">
          {charts.map(chart => (
            <Button
              key={chart.id}
              variant={activeChart === chart.id ? 'primary' : 'outline-secondary'}
              onClick={() => setActiveChart(chart.id)}
            >
              {chart.label}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      <div className="mobile-chart-container">
        {ActiveChartComponent && <ActiveChartComponent />}
      </div>
    </div>
  );
};

export default MobileAnalysis;
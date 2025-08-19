import React from 'react';
import { Container } from 'react-bootstrap';
import MarketInsightsDashboard from './MarketInsightsDashboard';

/**
 * Example implementation of Market Insights Dashboard
 * Replace this with your actual dashboard integration
 */
const MarketInsightsExample = () => {
  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Market Insights</h2>
          <p className="text-muted mb-0">
            Key financial indicators and their impact on cryptocurrency markets
          </p>
        </div>
      </div>
      
      <MarketInsightsDashboard />
    </Container>
  );
};

export default MarketInsightsExample;
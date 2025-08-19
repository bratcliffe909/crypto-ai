import React from 'react';
import { Row, Col } from 'react-bootstrap';
import InsightCard from './InsightCard';

const MarketInsightsDashboard = () => {
  // Sample data - replace with real API data
  const insights = [
    {
      id: 'dxy',
      title: 'Dollar Index (DXY)',
      subtitle: 'US Dollar Strength',
      value: 104.2,
      change24h: 0.3,
      status: 'warning', // warning = neutral for crypto
      cryptoImpact: 'Neutral',
      description: 'The Dollar Index measures the US dollar against major currencies. A rising DXY often pressures Bitcoin and crypto markets as investors move to traditional safe havens.',
      explanation: 'DXY above 100 shows dollar strength. Values 100-105 are neutral for crypto, below 100 is bullish for crypto, above 105 can be bearish.',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'vix',
      title: 'Volatility Index (VIX)',
      subtitle: 'Market Fear Gauge',
      value: 18.5,
      change24h: -2.1,
      status: 'success', // success = good for crypto
      cryptoImpact: 'Bullish',
      description: 'The VIX measures expected volatility in the S&P 500. Low VIX indicates market calm and risk appetite, which typically benefits crypto assets.',
      explanation: 'VIX below 20 shows market confidence and risk-on sentiment. VIX 20-30 is elevated fear, above 30 indicates extreme fear and risk-off behavior.',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'sp500',
      title: 'S&P 500',
      subtitle: 'US Stock Market',
      value: 4847.2,
      change24h: -0.8,
      status: 'danger', // danger = bad for crypto
      cryptoImpact: 'Bearish',
      description: 'The S&P 500 tracks large US companies. Crypto often correlates with stock markets, especially during risk-off periods when both decline together.',
      explanation: 'Strong S&P 500 performance usually supports crypto markets. Significant declines can trigger broader risk asset selloffs including Bitcoin and altcoins.',
      lastUpdated: new Date().toISOString()
    }
  ];

  return (
    <div className="market-insights-dashboard">
      <Row>
        {insights.map((insight) => (
          <Col key={insight.id} lg={4} md={6} className="mb-4">
            <InsightCard insight={insight} />
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default MarketInsightsDashboard;
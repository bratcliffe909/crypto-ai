import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { BsInfoCircleFill } from 'react-icons/bs';
import EconomicOverlayChart from './EconomicOverlayChart';
import MobileEconomicView from '../mobile/MobileEconomicView';

/**
 * Example usage of the Economic Overlay Chart components
 * This demonstrates how to integrate the components into your application
 */
const EconomicOverlayExample = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedIndicator, setSelectedIndicator] = useState('UNRATE');

  // Preset configurations for quick demos
  const presetConfigs = [
    {
      name: 'Unemployment vs Bitcoin',
      indicator: 'UNRATE',
      description: 'See how unemployment rates correlate with Bitcoin prices during economic cycles'
    },
    {
      name: 'Inflation Impact',
      indicator: 'CPIAUCSL', 
      description: 'Analyze Bitcoin as an inflation hedge by comparing with Consumer Price Index'
    },
    {
      name: 'Fed Policy Effect',
      indicator: 'DFEDTARU',
      description: 'Track Federal Reserve interest rate changes and Bitcoin price reactions'
    },
    {
      name: 'Money Supply Analysis',
      indicator: 'M2SL',
      description: 'Compare Bitcoin with M2 money supply expansion (popular narrative)'
    },
    {
      name: 'Market Fear Gauge',
      indicator: 'VIXCLS',
      description: 'Correlate Bitcoin with VIX volatility index (risk-on/risk-off sentiment)'
    }
  ];

  // Handle window resize for mobile detection
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="d-flex align-items-center">
              <BsInfoCircleFill className="me-2 text-primary" />
              <h5 className="mb-0">Economic Indicator Overlay Charts - Usage Example</h5>
            </Card.Header>
            <Card.Body>
              <Alert variant="info" className="mb-3">
                <strong>Integration Guide:</strong> These components follow the existing crypto-graph patterns and can be easily integrated into your dashboard.
                The mobile version automatically adapts for screen sizes under 768px.
              </Alert>
              
              <div className="mb-3">
                <strong>Current View:</strong> {isMobile ? 'Mobile Optimized' : 'Desktop Full Featured'}
              </div>
              
              <div className="d-flex gap-2 mb-3 flex-wrap">
                <Button
                  variant={!isMobile ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setIsMobile(false)}
                >
                  Desktop View
                </Button>
                <Button
                  variant={isMobile ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setIsMobile(true)}
                >
                  Mobile View
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Preset Configuration Buttons */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Quick Preset Configurations</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-flex gap-2 flex-wrap">
                {presetConfigs.map((preset, index) => (
                  <Button
                    key={index}
                    variant={selectedIndicator === preset.indicator ? 'success' : 'outline-secondary'}
                    size="sm"
                    onClick={() => setSelectedIndicator(preset.indicator)}
                    className="mb-2"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
              
              {presetConfigs.find(p => p.indicator === selectedIndicator) && (
                <Alert variant="light" className="mt-3 mb-0">
                  <strong>{presetConfigs.find(p => p.indicator === selectedIndicator).name}:</strong> {' '}
                  {presetConfigs.find(p => p.indicator === selectedIndicator).description}
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Chart Display */}
      <Row>
        <Col>
          {isMobile ? (
            <MobileEconomicView 
              initialIndicator={selectedIndicator}
              initialTimeRange="1095"
            />
          ) : (
            <EconomicOverlayChart
              initialIndicator={selectedIndicator}
              initialTimeRange="1095"
              showCorrelation={true}
              showEvents={true}
              height={500}
            />
          )}
        </Col>
      </Row>

      {/* Implementation Code Examples */}
      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Implementation Code Examples</h6>
            </Card.Header>
            <Card.Body>
              <div className="mb-4">
                <h6>Basic Desktop Implementation:</h6>
                <pre className="bg-dark p-3 rounded text-light small">
{`import EconomicOverlayChart from './Components/dashboard/EconomicOverlayChart';

<EconomicOverlayChart
  initialIndicator="UNRATE"
  initialTimeRange="1095"
  showCorrelation={true}
  showEvents={true}
  height={500}
/>`}
                </pre>
              </div>

              <div className="mb-4">
                <h6>Mobile Implementation:</h6>
                <pre className="bg-dark p-3 rounded text-light small">
{`import MobileEconomicView from './Components/mobile/MobileEconomicView';

<MobileEconomicView 
  initialIndicator="CPIAUCSL"
  initialTimeRange="365"
/>`}
                </pre>
              </div>

              <div className="mb-4">
                <h6>Responsive Implementation:</h6>
                <pre className="bg-dark p-3 rounded text-light small">
{`const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

{isMobile ? (
  <MobileEconomicView initialIndicator="UNRATE" />
) : (
  <EconomicOverlayChart 
    initialIndicator="UNRATE"
    showCorrelation={true}
  />
)}`}
                </pre>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* API Endpoint Requirements */}
      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Required API Endpoint</h6>
            </Card.Header>
            <Card.Body>
              <Alert variant="warning">
                <strong>API Implementation Required:</strong> You'll need to implement the following endpoint in your Laravel backend.
              </Alert>
              
              <div className="mb-3">
                <strong>Endpoint:</strong> <code>GET /api/crypto/economic-overlay</code>
              </div>
              
              <div className="mb-3">
                <strong>Parameters:</strong>
                <ul>
                  <li><code>indicator</code> - Economic indicator code (e.g., UNRATE, CPIAUCSL)</li>
                  <li><code>days</code> - Number of days of data (90, 365, 1095, 1825)</li>
                  <li><code>normalize</code> - Boolean, whether to normalize data for overlay charts</li>
                </ul>
              </div>

              <div className="mb-3">
                <strong>Expected Response Format:</strong>
                <pre className="bg-dark p-3 rounded text-light small">
{`{
  "data": [
    {
      "date": "2024-01-01",
      "btc_price": 42000,
      "economic_value": 3.7,
      "btc_normalized": 75.5,
      "economic_normalized": 42.3,
      "btc_price_change_pct": 2.1,
      "economic_change_pct": -0.1
    }
  ],
  "metadata": {
    "indicator": "UNRATE",
    "title": "Unemployment Rate",
    "unit": "%",
    "source": "Bureau of Labor Statistics",
    "lastUpdated": "2024-01-15T10:30:00Z",
    "decimals": 1,
    "availableIndicators": {...},
    "bandLabels": {...},
    "bandColors": {...}
  },
  "events": [
    {
      "date": "2020-03-15",
      "title": "Fed cuts rates to zero",
      "type": "policy",
      "impact": "high",
      "description": "Emergency rate cut"
    }
  ]
}`}
                </pre>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EconomicOverlayExample;
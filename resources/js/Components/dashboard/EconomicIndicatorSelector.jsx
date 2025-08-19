/**
 * EconomicIndicatorSelector Component
 * Provides preset configurations and easy selection for common economic analysis scenarios
 * Designed to help non-financial analysts understand economic indicators
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Badge, Modal, Alert } from 'react-bootstrap';
import { BsInfoCircleFill, BsBookmark, BsGraphUp, BsDollarSign, BsTrendingUp, BsGlobe } from 'react-icons/bs';

// Preset analysis scenarios for non-financial users
const ANALYSIS_PRESETS = {
  INFLATION_HEDGE: {
    id: 'inflation_hedge',
    name: 'Bitcoin as Inflation Hedge',
    description: 'Analyze how Bitcoin performs during inflationary periods',
    icon: BsDollarSign,
    color: '#FF6B6B',
    indicators: ['INFLATION_CPI', 'FEDERAL_FUNDS_RATE'],
    timeRange: '1825', // 5 years
    explanation: 'This analysis helps you understand whether Bitcoin acts as a store of value during inflation. Look for periods when inflation rises and see if Bitcoin price follows.',
    expectedPattern: 'During high inflation periods, Bitcoin often rallies as investors seek alternatives to depreciating fiat currency.',
    keyEvents: ['2021-2022 Inflation Surge', 'COVID-19 Money Printing'],
    difficulty: 'Beginner'
  },
  
  MONETARY_POLICY: {
    id: 'monetary_policy',
    name: 'Federal Reserve Impact',
    description: 'How Fed policy changes affect Bitcoin prices',
    icon: BsGraphUp,
    color: '#4ECDC4',
    indicators: ['FEDERAL_FUNDS_RATE', 'VIX_VOLATILITY'],
    timeRange: '730', // 2 years
    explanation: 'Track how Federal Reserve interest rate decisions impact Bitcoin. Lower rates typically benefit Bitcoin as investors seek higher yields.',
    expectedPattern: 'Rate cuts often precede Bitcoin rallies, while rate hikes can cause selling pressure.',
    keyEvents: ['2020 Emergency Rate Cuts', '2022-2023 Rate Hike Cycle'],
    difficulty: 'Intermediate'
  },
  
  RISK_CORRELATION: {
    id: 'risk_correlation',
    name: 'Stock Market Correlation',
    description: 'Bitcoin relationship with traditional risk assets',
    icon: BsTrendingUp,
    color: '#45B7D1',
    indicators: ['SPX_INDEX', 'VIX_VOLATILITY'],
    timeRange: '1825', // 5 years
    explanation: 'Understand when Bitcoin moves with or against the stock market. This helps predict Bitcoin behavior during market stress.',
    expectedPattern: 'Correlation varies by market regime - high during crises, lower during Bitcoin adoption phases.',
    keyEvents: ['COVID-19 Crash', '2022 Tech Stock Selloff'],
    difficulty: 'Advanced'
  },
  
  DOLLAR_STRENGTH: {
    id: 'dollar_strength',
    name: 'Dollar Strength Analysis',
    description: 'US Dollar impact on Bitcoin pricing',
    icon: BsGlobe,
    color: '#96CEB4',
    indicators: ['DXY_DOLLAR_INDEX', 'INFLATION_CPI'],
    timeRange: '1825', // 5 years
    explanation: 'Bitcoin often moves inverse to USD strength. A weak dollar typically supports Bitcoin prices as global investors seek alternatives.',
    expectedPattern: 'Strong negative correlation - when DXY falls, Bitcoin often rises.',
    keyEvents: ['2020 Dollar Weakness', '2022 Dollar Strength Rally'],
    difficulty: 'Intermediate'
  },
  
  RECESSION_WATCH: {
    id: 'recession_watch',
    name: 'Recession Indicators',
    description: 'Economic uncertainty and Bitcoin behavior',
    icon: BsBookmark,
    color: '#F38BA8',
    indicators: ['UNEMPLOYMENT_RATE', 'VIX_VOLATILITY'],
    timeRange: '1825', // 5 years
    explanation: 'Track leading recession indicators and Bitcoin performance. Understanding these patterns helps prepare for market cycles.',
    expectedPattern: 'Bitcoin behavior during recessions varies - initially sells off with other risk assets, but can rally as monetary policy loosens.',
    keyEvents: ['2020 Recession', '2022 Recession Fears'],
    difficulty: 'Advanced'
  }
};

// Educational content for beginners
const EDUCATIONAL_CONTENT = {
  correlation: {
    title: 'Understanding Correlation',
    content: 'Correlation measures how two assets move together. +100% means perfect positive correlation (move in same direction), -100% means perfect negative correlation (move opposite), 0% means no relationship.',
    examples: [
      'Bitcoin and stocks: Often positive during normal times',
      'Bitcoin and USD: Usually negative (inverse relationship)',
      'Bitcoin and gold: Mixed, depends on market conditions'
    ]
  },
  
  indicators: {
    title: 'Economic Indicators Explained',
    content: 'Economic indicators are statistics that show how the economy is performing. They help predict future economic conditions.',
    types: [
      'Interest Rates: Cost of borrowing money',
      'Inflation: Rate of price increases',
      'Employment: Job market health',
      'Stock Markets: Investment sentiment'
    ]
  },
  
  interpretation: {
    title: 'Reading the Charts',
    content: 'Look for patterns where economic changes precede Bitcoin price movements. Strong correlations suggest predictive relationships.',
    tips: [
      'Focus on major trend changes, not daily noise',
      'Consider multiple indicators together',
      'Historical patterns may not always repeat',
      'Use for education, not investment advice'
    ]
  }
};

/**
 * Difficulty indicator component
 */
const DifficultyBadge = ({ difficulty }) => {
  const getVariant = (diff) => {
    switch (diff) {
      case 'Beginner': return 'success';
      case 'Intermediate': return 'warning';
      case 'Advanced': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <Badge bg={getVariant(difficulty)} className="ms-2">
      {difficulty}
    </Badge>
  );
};

/**
 * Preset card component
 */
const PresetCard = ({ preset, onSelect, isActive }) => {
  const Icon = preset.icon;
  
  return (
    <Card 
      className={`preset-card h-100 ${isActive ? 'border-primary' : ''}`}
      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
      onClick={() => onSelect(preset)}
    >
      <Card.Body>
        <div className="d-flex align-items-start justify-content-between mb-3">
          <div className="d-flex align-items-center">
            <div 
              className="preset-icon me-3 d-flex align-items-center justify-content-center"
              style={{ 
                width: '40px', 
                height: '40px', 
                backgroundColor: preset.color,
                borderRadius: '8px',
                opacity: 0.8
              }}
            >
              <Icon className="text-white" size={20} />
            </div>
            <div>
              <h6 className="mb-1">{preset.name}</h6>
              <DifficultyBadge difficulty={preset.difficulty} />
            </div>
          </div>
        </div>
        
        <p className="text-muted small mb-3">{preset.description}</p>
        
        <div className="d-flex flex-wrap gap-1 mb-3">
          {preset.indicators.map(indicator => (
            <Badge key={indicator} bg="secondary" className="small">
              {indicator.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
        
        <div className="small text-muted">
          <strong>Expected Pattern:</strong>
          <div className="mt-1">{preset.expectedPattern}</div>
        </div>
      </Card.Body>
    </Card>
  );
};

/**
 * Educational modal component
 */
const EducationalModal = ({ show, onHide, content }) => {
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{content?.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {content && (
          <>
            <p>{content.content}</p>
            
            {content.examples && (
              <div className="mt-4">
                <h6>Examples:</h6>
                <ul className="list-unstyled">
                  {content.examples.map((example, index) => (
                    <li key={index} className="mb-2">
                      <BsInfoCircleFill className="text-info me-2" />
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {content.types && (
              <div className="mt-4">
                <h6>Types:</h6>
                <ul className="list-unstyled">
                  {content.types.map((type, index) => (
                    <li key={index} className="mb-2">
                      <BsInfoCircleFill className="text-info me-2" />
                      {type}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {content.tips && (
              <div className="mt-4">
                <h6>Tips:</h6>
                <ul className="list-unstyled">
                  {content.tips.map((tip, index) => (
                    <li key={index} className="mb-2">
                      <BsInfoCircleFill className="text-success me-2" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

/**
 * Main EconomicIndicatorSelector component
 */
const EconomicIndicatorSelector = ({ 
  onPresetSelect, 
  selectedPreset = null,
  showEducational = true,
  className = '' 
}) => {
  const [activePreset, setActivePreset] = useState(selectedPreset);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [educationContent, setEducationContent] = useState(null);

  useEffect(() => {
    setActivePreset(selectedPreset);
  }, [selectedPreset]);

  const handlePresetSelect = (preset) => {
    setActivePreset(preset.id);
    onPresetSelect?.(preset);
  };

  const showEducation = (contentKey) => {
    setEducationContent(EDUCATIONAL_CONTENT[contentKey]);
    setShowEducationModal(true);
  };

  return (
    <div className={`economic-indicator-selector ${className}`}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">Economic Analysis Scenarios</h5>
        
        {showEducational && (
          <div className="d-flex gap-2">
            <Button 
              size="sm" 
              variant="outline-info"
              onClick={() => showEducation('correlation')}
            >
              About Correlation
            </Button>
            <Button 
              size="sm" 
              variant="outline-info"
              onClick={() => showEducation('indicators')}
            >
              Economic Indicators
            </Button>
            <Button 
              size="sm" 
              variant="outline-info"
              onClick={() => showEducation('interpretation')}
            >
              Reading Charts
            </Button>
          </div>
        )}
      </div>

      {/* Introduction Alert */}
      <Alert variant="info" className="mb-4">
        <div className="d-flex align-items-start">
          <BsInfoCircleFill className="me-2 mt-1" />
          <div>
            <strong>Choose an analysis scenario to get started:</strong>
            <div className="small mt-1">
              Each scenario is pre-configured with relevant economic indicators and time ranges. 
              Perfect for understanding how traditional economics affects Bitcoin without needing a finance background.
            </div>
          </div>
        </div>
      </Alert>

      {/* Preset Cards Grid */}
      <Row className="g-4 mb-4">
        {Object.values(ANALYSIS_PRESETS).map(preset => (
          <Col key={preset.id} md={6} lg={4}>
            <PresetCard 
              preset={preset}
              onSelect={handlePresetSelect}
              isActive={activePreset === preset.id}
            />
          </Col>
        ))}
      </Row>

      {/* Selected Preset Details */}
      {activePreset && (
        <Card className="border-primary">
          <Card.Header className="bg-primary text-white">
            <h6 className="mb-0 d-flex align-items-center">
              <BsBookmark className="me-2" />
              Selected Analysis: {ANALYSIS_PRESETS[activePreset]?.name}
            </h6>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={8}>
                <div className="mb-3">
                  <strong>What you'll learn:</strong>
                  <p className="text-muted mt-1">
                    {ANALYSIS_PRESETS[activePreset]?.explanation}
                  </p>
                </div>
                
                <div className="mb-3">
                  <strong>Key Historical Events:</strong>
                  <div className="d-flex flex-wrap gap-2 mt-1">
                    {ANALYSIS_PRESETS[activePreset]?.keyEvents.map(event => (
                      <Badge key={event} bg="secondary">{event}</Badge>
                    ))}
                  </div>
                </div>
              </Col>
              
              <Col md={4}>
                <div className="text-md-end">
                  <div className="mb-2">
                    <small className="text-muted">Analysis Period:</small>
                    <div className="fw-bold">
                      {ANALYSIS_PRESETS[activePreset]?.timeRange === '365' ? '1 Year' :
                       ANALYSIS_PRESETS[activePreset]?.timeRange === '730' ? '2 Years' :
                       ANALYSIS_PRESETS[activePreset]?.timeRange === '1825' ? '5 Years' : 'All Time'}
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <small className="text-muted">Indicators:</small>
                    <div className="fw-bold">
                      {ANALYSIS_PRESETS[activePreset]?.indicators.length} Selected
                    </div>
                  </div>
                  
                  <DifficultyBadge difficulty={ANALYSIS_PRESETS[activePreset]?.difficulty} />
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Educational Modal */}
      <EducationalModal 
        show={showEducationModal}
        onHide={() => setShowEducationModal(false)}
        content={educationContent}
      />
    </div>
  );
};

export default EconomicIndicatorSelector;
export { ANALYSIS_PRESETS };
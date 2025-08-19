import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Form, Badge, Button, Collapse, Row, Col } from 'react-bootstrap';
import { BsSearch, BsInfoCircleFill, BsChevronDown, BsChevronUp } from 'react-icons/bs';
import Tooltip from '../common/Tooltip';

const IndicatorSelector = ({ 
  selectedIndicator, 
  onIndicatorChange, 
  availableIndicators = {},
  showCategories = true,
  showSearch = true,
  showPresets = true 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Default indicators configuration
  const defaultIndicators = useMemo(() => ({
    'Employment': {
      'UNRATE': {
        title: 'Unemployment Rate',
        description: 'Percentage of unemployed persons in the labor force',
        unit: '%',
        frequency: 'Monthly',
        source: 'Bureau of Labor Statistics',
        impact: 'High unemployment often correlates with economic uncertainty'
      },
      'PAYEMS': {
        title: 'Total Nonfarm Payrolls',
        description: 'Total number of paid employees in nonfarm establishments',
        unit: 'Thousands',
        frequency: 'Monthly', 
        source: 'Bureau of Labor Statistics',
        impact: 'Job growth indicator, positive for economic outlook'
      },
      'CIVPART': {
        title: 'Labor Force Participation Rate',
        description: 'Percentage of working-age population in labor force',
        unit: '%',
        frequency: 'Monthly',
        source: 'Bureau of Labor Statistics',
        impact: 'Higher participation suggests economic confidence'
      }
    },
    'Inflation': {
      'CPIAUCSL': {
        title: 'Consumer Price Index',
        description: 'Average change in prices paid by urban consumers',
        unit: 'Index',
        frequency: 'Monthly',
        source: 'Bureau of Labor Statistics',
        impact: 'High inflation often drives investors to alternative assets like Bitcoin'
      },
      'CPILFESL': {
        title: 'Core CPI',
        description: 'CPI excluding food and energy prices',
        unit: 'Index',
        frequency: 'Monthly',
        source: 'Bureau of Labor Statistics',
        impact: 'Excludes volatile components for clearer inflation trend'
      },
      'DFEDTARU': {
        title: 'Federal Funds Target Rate',
        description: 'Target interest rate set by the Federal Reserve',
        unit: '%',
        frequency: 'Daily',
        source: 'Federal Reserve',
        impact: 'Higher rates typically reduce risk appetite, affecting Bitcoin'
      }
    },
    'Economic Growth': {
      'GDP': {
        title: 'Gross Domestic Product',
        description: 'Total value of goods and services produced',
        unit: 'Billions of Chained 2012 Dollars',
        frequency: 'Quarterly',
        source: 'Bureau of Economic Analysis',
        impact: 'Economic growth indicator, affects overall market sentiment'
      },
      'INDPRO': {
        title: 'Industrial Production Index',
        description: 'Measure of real output of manufacturing, mining, and utilities',
        unit: 'Index',
        frequency: 'Monthly',
        source: 'Federal Reserve',
        impact: 'Industrial activity correlates with economic strength'
      },
      'HOUST': {
        title: 'Housing Starts',
        description: 'Number of new residential construction projects started',
        unit: 'Thousands of Units',
        frequency: 'Monthly',
        source: 'U.S. Census Bureau',
        impact: 'Housing market strength indicator'
      }
    },
    'Money Supply': {
      'M2SL': {
        title: 'M2 Money Supply',
        description: 'Measure of money supply including cash, deposits, and near money',
        unit: 'Billions of Dollars',
        frequency: 'Monthly',
        source: 'Federal Reserve',
        impact: 'Money supply expansion often cited as Bitcoin bullish factor'
      },
      'BOGMBASE': {
        title: 'Monetary Base',
        description: 'Total amount of currency in circulation plus reserves',
        unit: 'Billions of Dollars',
        frequency: 'Monthly',
        source: 'Federal Reserve',
        impact: 'Base money creation affects asset price inflation'
      },
      'WALCL': {
        title: 'Fed Balance Sheet',
        description: 'Total assets held by the Federal Reserve',
        unit: 'Billions of Dollars',
        frequency: 'Weekly',
        source: 'Federal Reserve',
        impact: 'Balance sheet expansion often correlates with risk asset performance'
      }
    },
    'Market Indicators': {
      'VIXCLS': {
        title: 'VIX Fear & Greed Index',
        description: 'Stock market volatility index',
        unit: 'Index',
        frequency: 'Daily',
        source: 'Chicago Board Options Exchange',
        impact: 'Market fear gauge, high VIX often correlates with Bitcoin volatility'
      },
      'DGS10': {
        title: '10-Year Treasury Rate',
        description: '10-Year Treasury Constant Maturity Rate',
        unit: '%',
        frequency: 'Daily',
        source: 'Federal Reserve',
        impact: 'Risk-free rate benchmark affecting all asset valuations'
      },
      'DEXUSEU': {
        title: 'USD/EUR Exchange Rate',
        description: 'US Dollar to Euro exchange rate',
        unit: 'USD per EUR',
        frequency: 'Daily',
        source: 'Federal Reserve',
        impact: 'Dollar strength affects international Bitcoin demand'
      }
    }
  }), []);

  // Merge default with provided indicators
  const indicators = useMemo(() => {
    if (!availableIndicators || Object.keys(availableIndicators).length === 0) {
      return defaultIndicators;
    }
    
    // Merge provided indicators with defaults, preferring provided data
    const merged = { ...defaultIndicators };
    Object.keys(availableIndicators).forEach(category => {
      if (!merged[category]) {
        merged[category] = {};
      }
      Object.keys(availableIndicators[category]).forEach(indicator => {
        merged[category][indicator] = {
          ...defaultIndicators[category]?.[indicator],
          ...availableIndicators[category][indicator]
        };
      });
    });
    
    return merged;
  }, [availableIndicators, defaultIndicators]);

  // Filter indicators based on search term
  const filteredIndicators = useMemo(() => {
    if (!searchTerm) return indicators;
    
    const filtered = {};
    Object.keys(indicators).forEach(category => {
      const matchingIndicators = {};
      Object.keys(indicators[category]).forEach(key => {
        const indicator = indicators[category][key];
        if (
          key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          indicator.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          indicator.description.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          matchingIndicators[key] = indicator;
        }
      });
      
      if (Object.keys(matchingIndicators).length > 0) {
        filtered[category] = matchingIndicators;
      }
    });
    
    return filtered;
  }, [indicators, searchTerm]);

  // Preset configurations
  const presets = useMemo(() => ({
    'Employment Dashboard': ['UNRATE', 'PAYEMS', 'CIVPART'],
    'Inflation Watch': ['CPIAUCSL', 'CPILFESL', 'DFEDTARU'],
    'Economic Growth': ['GDP', 'INDPRO', 'HOUST'],
    'Monetary Policy': ['M2SL', 'BOGMBASE', 'WALCL', 'DFEDTARU'],
    'Risk Sentiment': ['VIXCLS', 'DGS10', 'DEXUSEU']
  }), []);

  // Toggle category expansion
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Get current indicator details
  const currentIndicatorDetails = useMemo(() => {
    for (const category of Object.keys(indicators)) {
      if (indicators[category][selectedIndicator]) {
        return indicators[category][selectedIndicator];
      }
    }
    return null;
  }, [selectedIndicator, indicators]);

  return (
    <div className="indicator-selector">
      {/* Search Bar */}
      {showSearch && (
        <div className="mb-3">
          <Form.Group>
            <div className="position-relative">
              <BsSearch className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" />
              <Form.Control
                type="text"
                placeholder="Search indicators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-4"
                size="sm"
              />
            </div>
          </Form.Group>
        </div>
      )}

      {/* Current Selection Display */}
      {currentIndicatorDetails && (
        <div className="mb-3 p-2 bg-dark rounded">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <strong className="text-light">{currentIndicatorDetails.title}</strong>
              <div className="text-muted small">{currentIndicatorDetails.description}</div>
              <div className="mt-1">
                <Badge bg="secondary" className="me-1">{currentIndicatorDetails.frequency}</Badge>
                <Badge bg="info">{currentIndicatorDetails.unit}</Badge>
              </div>
            </div>
            <Tooltip content={currentIndicatorDetails.impact}>
              <BsInfoCircleFill className="text-muted" style={{ cursor: 'help' }} />
            </Tooltip>
          </div>
        </div>
      )}

      {/* Preset Configurations */}
      {showPresets && (
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="text-muted fw-bold">QUICK PRESETS</small>
          </div>
          <div className="d-flex flex-wrap gap-1">
            {Object.keys(presets).map(preset => (
              <Button
                key={preset}
                variant="outline-primary"
                size="sm"
                onClick={() => onIndicatorChange(presets[preset][0])} // Select first indicator from preset
                className="text-nowrap"
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {showCategories && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="text-muted fw-bold">CATEGORIES</small>
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="p-0 text-muted"
            >
              {showAllCategories ? <BsChevronUp /> : <BsChevronDown />}
            </Button>
          </div>

          {Object.keys(filteredIndicators).map((category, index) => {
            const isExpanded = expandedCategories[category] || showAllCategories;
            const categoryIndicators = filteredIndicators[category];
            const indicatorCount = Object.keys(categoryIndicators).length;

            return (
              <div key={category} className="mb-2">
                <Button
                  variant="link"
                  className="p-1 text-start w-100 d-flex justify-content-between align-items-center text-light"
                  onClick={() => toggleCategory(category)}
                >
                  <span>
                    {category} 
                    <Badge bg="secondary" className="ms-2">{indicatorCount}</Badge>
                  </span>
                  {isExpanded ? <BsChevronUp /> : <BsChevronDown />}
                </Button>
                
                <Collapse in={isExpanded}>
                  <div>
                    <Row className="g-1">
                      {Object.keys(categoryIndicators).map(indicatorKey => {
                        const indicator = categoryIndicators[indicatorKey];
                        const isSelected = selectedIndicator === indicatorKey;
                        
                        return (
                          <Col key={indicatorKey} xs={12}>
                            <Button
                              variant={isSelected ? 'primary' : 'outline-secondary'}
                              size="sm"
                              className="w-100 text-start"
                              onClick={() => onIndicatorChange(indicatorKey)}
                            >
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <div className="fw-bold">{indicator.title}</div>
                                  <small className="text-muted">{indicatorKey}</small>
                                </div>
                                <div className="text-end">
                                  <Badge 
                                    bg={isSelected ? 'light' : 'secondary'}
                                    text={isSelected ? 'dark' : 'light'}
                                    className="me-1"
                                  >
                                    {indicator.frequency}
                                  </Badge>
                                  <Tooltip content={`${indicator.description}\n\nImpact: ${indicator.impact}`}>
                                    <BsInfoCircleFill 
                                      className={isSelected ? 'text-dark' : 'text-muted'} 
                                      style={{ cursor: 'help' }} 
                                    />
                                  </Tooltip>
                                </div>
                              </div>
                            </Button>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>
                </Collapse>
              </div>
            );
          })}
        </div>
      )}

      {/* No Results */}
      {searchTerm && Object.keys(filteredIndicators).length === 0 && (
        <div className="text-center text-muted py-3">
          <p>No indicators found matching "{searchTerm}"</p>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setSearchTerm('')}
          >
            Clear Search
          </Button>
        </div>
      )}
    </div>
  );
};

IndicatorSelector.propTypes = {
  selectedIndicator: PropTypes.string.isRequired,
  onIndicatorChange: PropTypes.func.isRequired,
  availableIndicators: PropTypes.object,
  showCategories: PropTypes.bool,
  showSearch: PropTypes.bool,
  showPresets: PropTypes.bool
};

export default IndicatorSelector;
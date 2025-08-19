import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Card, Row, Col, ProgressBar, Badge, Alert } from 'react-bootstrap';
import { BsArrowUp, BsArrowDown, BsExclamationTriangle, BsInfoCircleFill } from 'react-icons/bs';
import Tooltip from '../common/Tooltip';

const CorrelationAnalysis = ({ 
  correlation, 
  indicator, 
  dataPoints, 
  timeRange,
  showDetails = true,
  showInterpretation = true,
  showStatistics = true 
}) => {
  // Calculate correlation strength and interpretation
  const analysis = useMemo(() => {
    if (correlation === null || correlation === undefined || isNaN(correlation)) {
      return {
        strength: 'No Data',
        direction: 'neutral',
        interpretation: 'Insufficient data to calculate correlation',
        reliability: 'low',
        color: '#6c757d',
        bgColor: 'secondary'
      };
    }

    const absCorr = Math.abs(correlation);
    let strength, reliability, color, bgColor, interpretation;

    // Determine correlation strength
    if (absCorr >= 0.8) {
      strength = 'Very Strong';
      reliability = 'high';
      color = absCorr >= 0.9 ? '#dc3545' : '#fd7e14';
      bgColor = absCorr >= 0.9 ? 'danger' : 'warning';
    } else if (absCorr >= 0.6) {
      strength = 'Strong';
      reliability = 'high';
      color = '#fd7e14';
      bgColor = 'warning';
    } else if (absCorr >= 0.4) {
      strength = 'Moderate';
      reliability = 'medium';
      color = '#20c997';
      bgColor = 'info';
    } else if (absCorr >= 0.2) {
      strength = 'Weak';
      reliability = 'medium';
      color = '#6f42c1';
      bgColor = 'secondary';
    } else {
      strength = 'Very Weak';
      reliability = 'low';
      color = '#6c757d';
      bgColor = 'light';
    }

    // Determine direction and interpretation
    const direction = correlation > 0 ? 'positive' : 'negative';
    const directionText = correlation > 0 ? 'positive' : 'negative';
    
    // Generate interpretation based on strength and direction
    if (absCorr >= 0.6) {
      interpretation = correlation > 0 
        ? `Strong positive relationship: When ${indicator} increases, Bitcoin tends to increase significantly.`
        : `Strong negative relationship: When ${indicator} increases, Bitcoin tends to decrease significantly.`;
    } else if (absCorr >= 0.4) {
      interpretation = correlation > 0
        ? `Moderate positive relationship: ${indicator} and Bitcoin show some tendency to move in the same direction.`
        : `Moderate negative relationship: ${indicator} and Bitcoin show some tendency to move in opposite directions.`;
    } else if (absCorr >= 0.2) {
      interpretation = correlation > 0
        ? `Weak positive relationship: ${indicator} and Bitcoin have a slight tendency to move together.`
        : `Weak negative relationship: ${indicator} and Bitcoin have a slight tendency to move oppositely.`;
    } else {
      interpretation = `Very weak relationship: ${indicator} and Bitcoin show little to no linear correlation.`;
    }

    return {
      strength,
      direction,
      directionText,
      interpretation,
      reliability,
      color,
      bgColor,
      absCorr
    };
  }, [correlation, indicator]);

  // Statistical significance assessment
  const statisticalInfo = useMemo(() => {
    if (!dataPoints || dataPoints < 10) {
      return {
        significance: 'insufficient',
        message: 'Need at least 10 data points for meaningful analysis',
        sampleSize: 'too small'
      };
    }

    // Rough t-test approximation for correlation significance
    // t = r * sqrt((n-2)/(1-r²))
    const absCorr = Math.abs(correlation || 0);
    const tStat = absCorr * Math.sqrt((dataPoints - 2) / (1 - absCorr * absCorr));
    
    // Critical t-values (approximate, for two-tailed test)
    let significance, sampleSize;
    
    if (dataPoints >= 100) {
      sampleSize = 'large';
      significance = tStat > 1.96 ? 'significant' : 'not significant';
    } else if (dataPoints >= 30) {
      sampleSize = 'medium';
      significance = tStat > 2.04 ? 'significant' : 'not significant';
    } else {
      sampleSize = 'small';
      significance = tStat > 2.13 ? 'significant' : 'not significant';
    }

    const message = significance === 'significant' 
      ? 'The correlation is statistically significant'
      : 'The correlation may not be statistically significant';

    return {
      significance,
      sampleSize,
      message,
      tStat: tStat.toFixed(2)
    };
  }, [correlation, dataPoints]);

  // Time range context
  const timeRangeText = useMemo(() => {
    const ranges = {
      '30': '1 month',
      '90': '3 months',
      '180': '6 months', 
      '365': '1 year',
      '730': '2 years',
      '1095': '3 years',
      '1460': '4 years',
      '1825': '5 years'
    };
    return ranges[timeRange] || `${timeRange} days`;
  }, [timeRange]);

  // Risk assessment based on correlation
  const riskAssessment = useMemo(() => {
    if (!correlation || Math.abs(correlation) < 0.3) {
      return {
        level: 'Low',
        message: 'Low correlation suggests Bitcoin may provide portfolio diversification benefits.',
        color: 'success'
      };
    } else if (Math.abs(correlation) < 0.6) {
      return {
        level: 'Medium',
        message: 'Moderate correlation indicates some relationship but still offers diversification.',
        color: 'warning'
      };
    } else {
      return {
        level: 'High',
        message: 'Strong correlation suggests Bitcoin may not provide significant diversification benefits.',
        color: 'danger'
      };
    }
  }, [correlation]);

  if (correlation === null || correlation === undefined || isNaN(correlation)) {
    return (
      <Alert variant="info" className="mt-3">
        <BsExclamationTriangle className="me-2" />
        Insufficient data to calculate correlation analysis. Try selecting a different time range or indicator.
      </Alert>
    );
  }

  return (
    <Card className="mt-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Correlation Analysis</h6>
        <Tooltip content="Correlation measures the linear relationship between Bitcoin and the economic indicator. Values range from -1 (perfect negative correlation) to +1 (perfect positive correlation), with 0 indicating no linear relationship.">
          <BsInfoCircleFill className="text-muted" style={{ cursor: 'help' }} />
        </Tooltip>
      </Card.Header>
      
      <Card.Body>
        {/* Main Correlation Display */}
        <Row className="align-items-center mb-3">
          <Col xs={6}>
            <div className="text-center">
              <div className="display-4 fw-bold" style={{ color: analysis.color }}>
                {(correlation * 100).toFixed(1)}%
              </div>
              <div className="d-flex align-items-center justify-content-center">
                {analysis.direction === 'positive' ? (
                  <BsArrowUp className="text-success me-1" />
                ) : (
                  <BsArrowDown className="text-danger me-1" />
                )}
                <Badge bg={analysis.bgColor} className="text-uppercase">
                  {analysis.strength}
                </Badge>
              </div>
            </div>
          </Col>
          
          <Col xs={6}>
            <div>
              <strong className="text-light">Correlation Strength</strong>
              <ProgressBar 
                now={analysis.absCorr * 100}
                variant={analysis.bgColor}
                className="mb-2"
                style={{ height: '8px' }}
              />
              <small className="text-muted">
                Time Period: {timeRangeText} ({dataPoints} data points)
              </small>
            </div>
          </Col>
        </Row>

        {/* Interpretation */}
        {showInterpretation && (
          <Alert variant="light" className="mb-3">
            <div className="mb-2">
              <strong>Interpretation:</strong>
            </div>
            <p className="mb-2">{analysis.interpretation}</p>
            
            {/* Risk Assessment */}
            <div className="d-flex align-items-center">
              <Badge bg={riskAssessment.color} className="me-2">
                {riskAssessment.level} Portfolio Risk
              </Badge>
              <small className="text-muted">{riskAssessment.message}</small>
            </div>
          </Alert>
        )}

        {/* Statistical Details */}
        {showStatistics && (
          <Row>
            <Col md={6}>
              <div className="p-3 bg-dark rounded">
                <h6 className="text-light mb-2">Statistical Reliability</h6>
                <div className="mb-2">
                  <Badge 
                    bg={statisticalInfo.significance === 'significant' ? 'success' : 'warning'}
                    className="me-2"
                  >
                    {statisticalInfo.significance}
                  </Badge>
                  <small className="text-muted">
                    Sample: {statisticalInfo.sampleSize} (n={dataPoints})
                  </small>
                </div>
                <small className="text-muted">{statisticalInfo.message}</small>
              </div>
            </Col>
            
            <Col md={6}>
              <div className="p-3 bg-dark rounded">
                <h6 className="text-light mb-2">Analysis Details</h6>
                <div className="row g-2">
                  <div className="col-6">
                    <small className="text-muted">Direction:</small>
                    <div className="fw-bold text-light">
                      {analysis.directionText}
                      {analysis.direction === 'positive' ? (
                        <BsArrowUp className="ms-1 text-success" />
                      ) : (
                        <BsArrowDown className="ms-1 text-danger" />
                      )}
                    </div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Reliability:</small>
                    <div className="fw-bold text-light text-capitalize">
                      {analysis.reliability}
                    </div>
                  </div>
                </div>
                
                {statisticalInfo.tStat && (
                  <div className="mt-2">
                    <small className="text-muted">T-Statistic: {statisticalInfo.tStat}</small>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        )}

        {/* Correlation Scale Reference */}
        {showDetails && (
          <div className="mt-3 pt-3 border-top">
            <small className="text-muted">
              <strong>Correlation Scale:</strong> 
              <span className="ms-2">
                0.8+ Very Strong | 0.6+ Strong | 0.4+ Moderate | 0.2+ Weak | &lt;0.2 Very Weak
              </span>
            </small>
          </div>
        )}

        {/* Warnings for low reliability */}
        {(dataPoints < 30 || analysis.reliability === 'low') && (
          <Alert variant="warning" className="mt-3 mb-0">
            <BsExclamationTriangle className="me-2" />
            <small>
              {dataPoints < 30 && "Small sample size may affect reliability. "}
              {analysis.reliability === 'low' && "Very weak correlations should be interpreted with caution. "}
              Consider using a longer time period for more robust analysis.
            </small>
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

CorrelationAnalysis.propTypes = {
  correlation: PropTypes.number,
  indicator: PropTypes.string.isRequired,
  dataPoints: PropTypes.number.isRequired,
  timeRange: PropTypes.string.isRequired,
  showDetails: PropTypes.bool,
  showInterpretation: PropTypes.bool,
  showStatistics: PropTypes.bool
};

export default CorrelationAnalysis;
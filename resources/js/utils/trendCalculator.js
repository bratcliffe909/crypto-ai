/**
 * Trend Calculator Utility
 * Calculates trend direction and strength for economic indicators
 */

/**
 * Calculate linear regression slope for trend analysis
 * @param {Array} data - Array of {date, value} objects
 * @param {number} windowDays - Number of days to analyze (default: 30)
 * @returns {Object} - {slope, strength, direction, confidence}
 */
export const calculateTrend = (data, windowDays = 30) => {
  if (!data || data.length < 2) {
    return {
      slope: 0,
      strength: 'minimal',
      direction: 'flat',
      confidence: 0,
      angle: 0
    };
  }

  // Sort data by date and take last N days
  const sortedData = data
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-Math.min(windowDays, data.length));

  if (sortedData.length < 2) {
    return {
      slope: 0,
      strength: 'minimal', 
      direction: 'flat',
      confidence: 0,
      angle: 0
    };
  }

  // Calculate linear regression
  const n = sortedData.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  sortedData.forEach((point, index) => {
    const x = index; // Use index as x-coordinate
    const y = parseFloat(point.value) || 0;
    
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  // Linear regression slope formula: (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  // Calculate R-squared for confidence
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  
  sortedData.forEach((point, index) => {
    const y = parseFloat(point.value) || 0;
    const yPred = slope * index + (sumY - slope * sumX) / n;
    ssRes += Math.pow(y - yPred, 2);
    ssTot += Math.pow(y - meanY, 2);
  });
  
  const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  
  // Normalize slope based on value range for angle calculation
  const valueRange = Math.max(...sortedData.map(d => parseFloat(d.value))) - 
                     Math.min(...sortedData.map(d => parseFloat(d.value)));
  const normalizedSlope = valueRange > 0 ? (slope * n) / valueRange : 0;
  
  // Calculate strength based on normalized slope magnitude
  const slopeMagnitude = Math.abs(normalizedSlope);
  let strength;
  if (slopeMagnitude < 0.05) strength = 'minimal';
  else if (slopeMagnitude < 0.15) strength = 'weak';
  else if (slopeMagnitude < 0.35) strength = 'moderate';
  else if (slopeMagnitude < 0.6) strength = 'strong';
  else strength = 'very-strong';

  // Determine direction with consistent thresholds
  let direction;
  if (slopeMagnitude < 0.05) direction = 'flat'; // Same threshold as minimal strength
  else if (normalizedSlope > 0) direction = 'up';
  else direction = 'down';

  // Calculate angle for arrow rotation
  // Arrow points right by default, rotation determines up/down angle
  let angle = 0;
  if (direction !== 'flat') {
    const maxAngle = 45; // Maximum 45 degrees up or down
    // Scale angle based on strength
    const strengthMultiplier = {
      'minimal': 0.2,   // Small angle (slightly up/down)
      'weak': 0.4,
      'moderate': 0.6,
      'strong': 0.8,
      'very-strong': 1.0
    };
    
    const baseAngle = maxAngle * strengthMultiplier[strength];
    // Positive slope = rising = negative angle (arrow points up-right)
    // Negative slope = falling = positive angle (arrow points down-right)
    angle = normalizedSlope > 0 ? -baseAngle : baseAngle;
  }

  // Get previous value (first data point in the window)
  const previousValue = sortedData.length > 0 ? parseFloat(sortedData[0].value) : null;
  const currentValue = sortedData.length > 0 ? parseFloat(sortedData[sortedData.length - 1].value) : null;

  return {
    slope: normalizedSlope,
    strength,
    direction,
    confidence: rSquared,
    angle: Math.round(angle),
    previousValue,
    currentValue,
    change: currentValue && previousValue ? currentValue - previousValue : null
  };
};


/**
 * Get color scheme for indicator based on trend direction
 * @param {string} indicatorKey - Indicator identifier
 * @param {string} direction - 'up', 'down', or 'flat'
 * @returns {Object} - {color, backgroundColor}
 */
export const getIndicatorColors = (indicatorKey, direction) => {
  const colorSchemes = {
    federal_funds_rate: {
      up: { color: '#dc3545', backgroundColor: '#dc35451a' },
      down: { color: '#198754', backgroundColor: '#1987541a' },
      flat: { color: '#6c757d', backgroundColor: '#6c757d1a' }
    },
    inflation_cpi: {
      up: { color: '#198754', backgroundColor: '#1987541a' },
      down: { color: '#fd7e14', backgroundColor: '#fd7e141a' },
      flat: { color: '#6c757d', backgroundColor: '#6c757d1a' }
    },
    unemployment_rate: {
      up: { color: '#ffc107', backgroundColor: '#ffc1071a' },
      down: { color: '#198754', backgroundColor: '#1987541a' },
      flat: { color: '#6c757d', backgroundColor: '#6c757d1a' }
    },
    dxy_dollar_index: {
      up: { color: '#dc3545', backgroundColor: '#dc35451a' },
      down: { color: '#198754', backgroundColor: '#1987541a' },
      flat: { color: '#6c757d', backgroundColor: '#6c757d1a' }
    }
  };

  return colorSchemes[indicatorKey]?.[direction] || colorSchemes.dxy_dollar_index.flat;
};

/**
 * Get strength badge properties
 * @param {string} strength - Strength level from calculateTrend
 * @returns {Object} - {text, variant, icon}
 */
export const getStrengthBadge = (strength) => {
  const badges = {
    'minimal': { text: 'Minimal', variant: 'secondary', icon: '○' },
    'weak': { text: 'Weak', variant: 'info', icon: '◔' },
    'moderate': { text: 'Moderate', variant: 'warning', icon: '◐' },
    'strong': { text: 'Strong', variant: 'primary', icon: '◕' },
    'very-strong': { text: 'Very Strong', variant: 'danger', icon: '●' }
  };

  return badges[strength] || badges.minimal;
};
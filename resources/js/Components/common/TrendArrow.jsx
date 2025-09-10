import React from 'react';

/**
 * TrendArrow Component
 * Displays an SVG arrow indicator for trend direction and strength
 */
const TrendArrow = ({ 
  angle = 0, 
  color = '#6c757d', 
  size = 24, 
  strength = 'minimal',
  direction = 'up',
  className = '' 
}) => {
  // For flat trends, override color to grey
  const displayColor = direction === 'flat' ? '#6c757d' : color;
  
  // Adjust arrow thickness based on strength
  const strokeWidthMap = {
    'minimal': 1.5,
    'weak': 2,
    'moderate': 2.5,
    'strong': 3,
    'very-strong': 3.5
  };

  const strokeWidth = strokeWidthMap[strength] || 2;

  // For flat trends, force angle to 0 (horizontal)
  const clampedAngle = direction === 'flat' ? 0 : Math.max(-60, Math.min(60, angle));

  return (
    <div className={`trend-arrow ${className}`} style={{ display: 'inline-block' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        style={{ 
          transform: `rotate(${clampedAngle}deg)`,
          transition: 'transform 0.3s ease'
        }}
      >
        {/* Arrow always points right, rotation determines angle */}
        
        {/* Arrow body - horizontal line */}
        <line
          x1="4"
          y1="12"
          x2="18"
          y2="12"
          stroke={displayColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Arrow head - always pointing right */}
        <polygon
          points="18,12 14,8 14,10 14,14 14,16"
          fill={displayColor}
          stroke={displayColor}
          strokeWidth={strokeWidth * 0.3}
          strokeLinejoin="round"
        />
        
        {/* Strength indicator dots */}
        {strength === 'strong' || strength === 'very-strong' ? (
          <>
            <circle
              cx="8"
              cy="10"
              r="0.8"
              fill={displayColor}
              opacity="0.5"
            />
            <circle
              cx="8"
              cy="14"
              r="0.8"
              fill={displayColor}
              opacity="0.5"
            />
          </>
        ) : null}
        
        {strength === 'very-strong' ? (
          <>
            <circle
              cx="6"
              cy="9"
              r="0.6"
              fill={displayColor}
              opacity="0.4"
            />
            <circle
              cx="6"
              cy="15"
              r="0.6"
              fill={displayColor}
              opacity="0.4"
            />
          </>
        ) : null}
      </svg>
    </div>
  );
};

export default TrendArrow;
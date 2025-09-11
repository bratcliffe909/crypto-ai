import React from 'react';
import { BsArrowRight } from 'react-icons/bs';

/**
 * TrendArrow Component
 * Displays a rotating Font Awesome arrow icon for trend direction and strength
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
  
  // Get opacity based on strength for visual emphasis
  const getOpacity = () => {
    const opacityMap = {
      'minimal': 0.6,
      'weak': 0.7,
      'moderate': 0.8,
      'strong': 0.9,
      'very-strong': 1.0
    };
    return opacityMap[strength] || 0.7;
  };

  // For flat trends, force angle to 0 (horizontal)
  const clampedAngle = direction === 'flat' ? 0 : Math.max(-60, Math.min(60, angle));

  return (
    <div 
      className={`trend-arrow ${className}`} 
      style={{ 
        display: 'inline-block',
        fontSize: `${size}px`,
        color: displayColor,
        opacity: getOpacity(),
        transform: `rotate(${clampedAngle}deg)`,
        transition: 'transform 0.3s ease, opacity 0.3s ease, color 0.3s ease'
      }}
    >
      <BsArrowRight />
    </div>
  );
};

export default TrendArrow;
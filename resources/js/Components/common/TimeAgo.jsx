import React from 'react';
import { BsClock } from 'react-icons/bs';
import { getTimeAgo } from '../../utils/timeUtils';

/**
 * Displays a clock icon with relative time
 * @param {Object} props
 * @param {Date|string} props.date - The date to display
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.iconSize - Size of the clock icon (default: 12)
 * @param {boolean} props.showIcon - Whether to show the clock icon (default: true)
 */
const TimeAgo = ({ date, className = '', iconSize = 12, showIcon = true }) => {
  if (!date) return null;
  
  return (
    <small className={`text-muted d-flex align-items-center ${className}`}>
      {showIcon && <BsClock size={iconSize} className="me-1" />}
      {getTimeAgo(date)}
    </small>
  );
};

export default TimeAgo;
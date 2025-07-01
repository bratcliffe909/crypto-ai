import React from 'react';
import TimeAgo from '../../common/TimeAgo';
import { BsExclamationTriangle } from 'react-icons/bs';

const MobileSectionHeader = ({ 
  title, 
  icon: Icon, 
  lastUpdated, 
  error, 
  children,
  className = ''
}) => {
  return (
    <div className={`mobile-section-header ${className}`}>
      <div className="header-content">
        <div className="d-flex align-items-center">
          {Icon && <Icon className="section-icon" size={20} />}
          <h5 className="section-title mb-0">{title}</h5>
        </div>
        <div className="header-actions">
          {children}
          <div className="d-flex align-items-center gap-2">
            {lastUpdated && <TimeAgo date={lastUpdated} />}
            {error && <BsExclamationTriangle className="text-warning" size={16} title={error} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileSectionHeader;
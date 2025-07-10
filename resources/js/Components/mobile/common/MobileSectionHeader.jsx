import React from 'react';

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
        </div>
      </div>
    </div>
  );
};

export default MobileSectionHeader;
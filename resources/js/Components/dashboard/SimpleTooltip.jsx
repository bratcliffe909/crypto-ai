import React from 'react';
import { OverlayTrigger, Tooltip as BSTooltip } from 'react-bootstrap';

const SimpleTooltip = ({ content, children, placement = 'top', delay = { show: 150, hide: 150 } }) => {
  if (!content) return children;

  const renderTooltip = (props) => (
    <BSTooltip {...props} className="custom-tooltip">
      <div style={{ maxWidth: '280px', textAlign: 'left' }}>
        {content}
      </div>
    </BSTooltip>
  );

  return (
    <OverlayTrigger
      placement={placement}
      delay={delay}
      overlay={renderTooltip}
    >
      <span className="d-inline-block">{children}</span>
    </OverlayTrigger>
  );
};

export default SimpleTooltip;
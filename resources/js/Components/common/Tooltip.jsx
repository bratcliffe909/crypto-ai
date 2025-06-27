import React from 'react';
import { OverlayTrigger, Tooltip as BSTooltip } from 'react-bootstrap';

const Tooltip = ({ content, children, placement = 'top' }) => {
  return (
    <OverlayTrigger
      placement={placement}
      overlay={<BSTooltip>{content}</BSTooltip>}
    >
      <span className="d-inline-block">{children}</span>
    </OverlayTrigger>
  );
};

export default Tooltip;

import React from 'react';
import { Card } from 'react-bootstrap';
import { BsCalendarEvent } from 'react-icons/bs';

const EconomicCalendar = () => {
  return (
    <Card className="mb-4">
      <Card.Header className="d-flex align-items-center">
        <h5 className="mb-0">Economic Calendar</h5>
        <BsCalendarEvent className="ms-2" />
      </Card.Header>
      <Card.Body>
        <p className="text-muted mb-0">FOMC dates and economic events coming soon...</p>
      </Card.Body>
    </Card>
  );
};

export default EconomicCalendar;

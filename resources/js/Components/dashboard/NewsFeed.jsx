import React from 'react';
import { Card } from 'react-bootstrap';
import { BsNewspaper } from 'react-icons/bs';

const NewsFeed = () => {
  return (
    <Card className="mb-4">
      <Card.Header className="d-flex align-items-center">
        <h5 className="mb-0">News Feed</h5>
        <BsNewspaper className="ms-2" />
      </Card.Header>
      <Card.Body>
        <p className="text-muted mb-0">Latest crypto news coming soon...</p>
      </Card.Body>
    </Card>
  );
};

export default NewsFeed;

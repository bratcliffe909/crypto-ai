import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { BsMoonFill, BsSunFill } from 'react-icons/bs';

const Header = ({ theme, toggleTheme }) => {
  return (
    <Navbar expand="lg" className="border-bottom">
      <Container fluid>
        <Navbar.Brand href="#" className="fw-bold fs-4">
          Crypto Dashboard
        </Navbar.Brand>
        
        <Nav className="ms-auto">
          <Button
            variant="link"
            className="nav-link p-2"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <BsSunFill size={20} /> : <BsMoonFill size={20} />}
          </Button>
        </Nav>
      </Container>
    </Navbar>
  );
};

export default Header;

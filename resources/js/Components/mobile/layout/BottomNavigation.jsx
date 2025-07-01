import React from 'react';
import { BsWallet2, BsGridFill, BsFire, BsCalendar3, BsNewspaper, BsGraphUp } from 'react-icons/bs';

const BottomNavigation = ({ activeSection, onSectionChange }) => {
  const sections = [
    { id: 'wallet', label: 'Wallet', icon: BsWallet2 },
    { id: 'market', label: 'Market', icon: BsGridFill },
    { id: 'trending', label: 'Trend', icon: BsFire },
    { id: 'calendar', label: 'Events', icon: BsCalendar3 },
    { id: 'news', label: 'News', icon: BsNewspaper },
    { id: 'analysis', label: 'Charts', icon: BsGraphUp }
  ];

  return (
    <nav className="bottom-navigation">
      {sections.map(section => {
        const Icon = section.icon;
        return (
          <button
            key={section.id}
            className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => onSectionChange(section.id)}
            type="button"
          >
            <Icon size={20} />
            <span className="nav-label">{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;
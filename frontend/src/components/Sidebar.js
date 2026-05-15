import React, { useState, useEffect, useRef } from 'react';
import './Sidebar.css';

const Sidebar = ({ currentPage, onPageChange }) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const sidebarRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
      active: currentPage === 'dashboard',
      hasDropdown: false
    },
    {
      id: 'foh',
      label: 'FOH',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
      active: currentPage === 'foh',
      hasDropdown: true,
      dropdownItems: [
        { id: 'foh', label: 'Daily Tasks' },
        { id: 'foh-cleaning', label: 'Cleaning Checklist' }
      ]
    },
    {
      id: 'setup-sheet',
      label: 'Setup Sheet',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/></svg>,
      active: currentPage === 'setup-sheet',
      hasDropdown: true,
      dropdownItems: [
        { id: 'setup-sheet-templates', label: 'Templates' },
        { id: 'setup-sheet-builder', label: 'New Setup' },
        { id: 'saved-setups', label: 'Saved Setups' },
        { id: 'shift-summary', label: 'Shift Summary' }
      ]
    },
    {
      id: 'kitchen',
      label: 'Kitchen',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 2v20l18-10L3 2z"/></svg>,
      active: currentPage === 'kitchen',
      hasDropdown: true,
      dropdownItems: [
        { id: 'kitchen', label: 'Dashboard' },
        { id: 'kitchen-analytics', label: 'Analytics' },
        { id: 'kitchen-equipment', label: 'Equipment Status' },
        { id: 'kitchen-safety', label: 'Food Safety' },
        { id: 'kitchen-cleaning', label: 'Cleaning & Maintenance' },
        { id: 'kitchen-checklists', label: 'Shift Checklists' },
        { id: 'kitchen-waste', label: 'Waste Tracker' }
      ]
    },
    {
      id: 'team-members',
      label: 'Team Members',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      active: currentPage === 'team-members',
      hasDropdown: true,
      dropdownItems: [
        { id: 'team-members', label: 'View All' },
        { id: 'team-documentation', label: 'Documentation' },
        { id: 'team-evaluations', label: 'Evaluations' },
        { id: 'team-surveys', label: 'Team Surveys' },
        { id: 'team-training', label: 'Training' },
        { id: 'team-quick-links', label: 'Quick Links' }
      ]
    },
    {
      id: 'development',
      label: 'Development',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
      active: currentPage === 'development',
      hasDropdown: true,
      dropdownItems: [
        { id: 'leadership', label: 'Leadership' },
        { id: 'leadership-360', label: '360° Evaluations' },
        { id: 'team-development', label: 'Team Development' }
      ]
    }
  ];

  const toggleDropdown = (itemId) => {
    setOpenDropdown(openDropdown === itemId ? null : itemId);
  };

  const handleItemClick = (item, dropdownItem = null) => {
    if (dropdownItem) {
      onPageChange(dropdownItem.id);
      setOpenDropdown(null);
    } else if (!item.hasDropdown) {
      onPageChange(item.id);
    } else {
      toggleDropdown(item.id);
    }
  };

  return (
    <div className="sidebar-nav" ref={sidebarRef}>
      {navigationItems.map((item) => (
        <div key={item.id} className="nav-item-container">
          <button
            onClick={() => handleItemClick(item)}
            className={`nav-button ${item.active ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-text">{item.label}</span>
            {item.hasDropdown && (
              <span className={`nav-arrow ${openDropdown === item.id ? 'open' : ''}`}>
                ▼
              </span>
            )}
          </button>
          
          {item.hasDropdown && openDropdown === item.id && (
            <div className="dropdown-menu">
              {item.dropdownItems.map((dropdownItem) => (
                <button
                  key={dropdownItem.id}
                  onClick={() => handleItemClick(item, dropdownItem)}
                  className="dropdown-item"
                >
                  {dropdownItem.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Sidebar;

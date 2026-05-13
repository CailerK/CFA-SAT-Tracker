import React, { useState, useEffect, useRef } from 'react';
import './CustomizeActionsModal.css';

const CustomizeActionsModal = ({ isOpen, onClose, onSave, currentActions }) => {
  const [selectedActions, setSelectedActions] = useState([]);
  const modalRef = useRef(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const availableActions = [
    {
      id: 'team-overview',
      title: 'Team Overview',
      subtitle: 'Manage your team',
      category: 'Front Counter, Drive Thru, Everything',
      icon: '👥',
      iconColor: 'blue'
    },
    {
      id: 'evaluations',
      title: 'Evaluations',
      subtitle: 'Review performance',
      category: 'Leadership',
      icon: '📋',
      iconColor: 'purple'
    },
    {
      id: 'foh-tasks',
      title: 'FOH Tasks',
      subtitle: 'Daily checklist',
      category: 'Front Counter, Drive Thru, Everything',
      icon: '✅',
      iconColor: 'green'
    },
    {
      id: 'cleaning',
      title: 'Cleaning',
      subtitle: 'Maintenance tasks',
      category: 'Front Counter, Drive Thru, Everything',
      icon: '🧽',
      iconColor: 'cyan'
    },
    {
      id: 'setup-sheets',
      title: 'Setup Sheets',
      subtitle: 'View schedules',
      category: 'Kitchen, Prep, Food Truck, Everything',
      icon: '📅',
      iconColor: 'orange'
    },
    {
      id: 'kitchen',
      title: 'Kitchen',
      subtitle: 'Kitchen operations',
      category: 'Kitchen, Prep, Everything',
      icon: '🍳',
      iconColor: 'red'
    },
    {
      id: 'training',
      title: 'Training',
      subtitle: 'Team development',
      category: 'Leadership',
      icon: '🎓',
      iconColor: 'blue'
    },
    {
      id: 'documentation',
      title: 'Documentation',
      subtitle: 'Employee docs',
      category: 'Leadership',
      icon: '📄',
      iconColor: 'red'
    },
    {
      id: 'leadership',
      title: 'Leadership',
      subtitle: 'Development plans',
      category: 'Leader, Director',
      icon: '❤️',
      iconColor: 'cyan'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      subtitle: 'View insights',
      category: 'Leader, Director',
      icon: '📊',
      iconColor: 'purple'
    },
    {
      id: 'waste-tracker',
      title: 'Waste Tracker',
      subtitle: 'Track waste',
      category: 'Kitchen, Prep, Food Truck, Everything',
      icon: '🗑',
      iconColor: 'red'
    },
    {
      id: 'equipment',
      title: 'Equipment',
      subtitle: 'Maintenance logs',
      category: 'Kitchen, Prep, Food Truck, Everything',
      icon: '🔧',
      iconColor: 'blue'
    },
    {
      id: 'food-safety',
      title: 'Food Safety',
      subtitle: 'Safety checks',
      category: 'Kitchen, Prep, Food Truck, Everything',
      icon: '🌡',
      iconColor: 'cyan'
    },
    {
      id: 'my-training',
      title: 'My Training',
      subtitle: 'Your progress',
      category: 'Team Member, Trainer',
      icon: '📚',
      iconColor: 'blue'
    },
    {
      id: 'my-evaluations',
      title: 'My Evaluations',
      subtitle: 'Your reviews',
      category: 'Team Member, Trainer',
      icon: '📋',
      iconColor: 'purple'
    },
    {
      id: 'my-profile',
      title: 'My Profile',
      subtitle: 'View profile',
      category: 'Team Member, Trainer',
      icon: '👤',
      iconColor: 'cyan'
    },
    {
      id: 'playbooks',
      title: 'Playbooks',
      subtitle: 'Training guides',
      category: 'Leader, Director',
      icon: '📖',
      iconColor: 'purple'
    },
    {
      id: 'goals',
      title: 'Goals',
      subtitle: 'Set objectives',
      category: 'Leader, Director',
      icon: '🎯',
      iconColor: 'purple'
    },
    {
      id: 'cfadollars',
      title: 'CFAdollars',
      subtitle: 'Rewards program',
      category: 'Leader, Director',
      icon: '💰',
      iconColor: 'yellow'
    },
    {
      id: 'safe-counting',
      title: 'Safe Counting',
      subtitle: 'Cash management',
      category: 'Leader, Director',
      icon: '💵',
      iconColor: 'cyan'
    },
    {
      id: 'team-chat',
      title: 'Team Chat',
      subtitle: 'Communication',
      category: 'Everything',
      icon: '💬',
      iconColor: 'green'
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Preferences',
      category: 'Everything',
      icon: '⚙️',
      iconColor: 'gray'
    }
  ];

  useEffect(() => {
    if (currentActions) {
      setSelectedActions(currentActions.map(action => action.id));
    }
  }, [currentActions]);

  const handleActionToggle = (actionId) => {
    if (selectedActions.includes(actionId)) {
      setSelectedActions(selectedActions.filter(id => id !== actionId));
    } else if (selectedActions.length < 12) {
      setSelectedActions([...selectedActions, actionId]);
    }
  };

  const handleSave = () => {
    const selectedActionData = availableActions.filter(action => 
      selectedActions.includes(action.id)
    );
    onSave(selectedActionData);
    onClose();
  };

  const handleReset = () => {
    setSelectedActions([
      'team-overview', 'evaluations', 'foh-tasks', 'cleaning', 
      'setup-sheets', 'kitchen', 'training', 'documentation', 
      'leadership', 'analytics'
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" ref={modalRef}>
        <div className="modal-header">
          <h2 className="modal-title">Customize Quick Actions</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <p className="modal-description">
          Select up to 12 actions to display on your dashboard. Uncheck all to use the default set.
        </p>

        <div className="selection-info">
          <span className="selection-count">
            Selected: <span className="count-highlight">{selectedActions.length}</span> / 12
          </span>
          <button className="reset-button" onClick={handleReset}>
            🔄 Reset to Default
          </button>
        </div>

        <div className="actions-grid">
          {availableActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionToggle(action.id)}
              className={`action-option ${selectedActions.includes(action.id) ? 'selected' : ''} ${
                !selectedActions.includes(action.id) && selectedActions.length >= 12 ? 'disabled' : ''
              }`}
              disabled={!selectedActions.includes(action.id) && selectedActions.length >= 12}
            >
              <div className={`action-icon ${action.iconColor}`}>
                {action.icon}
              </div>
              <div className="action-info">
                <h3 className="action-title">{action.title}</h3>
                <p className="action-subtitle">{action.subtitle}</p>
                <span className="action-category">{action.category}</span>
              </div>
              {selectedActions.includes(action.id) && (
                <div className="selected-indicator">✓</div>
              )}
            </button>
          ))}
        </div>

        <div className="modal-actions">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="save-button" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomizeActionsModal;

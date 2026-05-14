import React, { useState, useEffect } from 'react';
import './CustomizeInsightsModal.css';

const CustomizeInsightsModal = ({ isOpen, onClose, onSave, currentInsights }) => {
  const [selectedCards, setSelectedCards] = useState([]);

  const availableCards = [
    {
      id: 'foh-tasks',
      title: 'FOH Tasks',
      subtitle: 'Front of house task completion',
      category: 'fohTasks',
      icon: '✓',
      iconColor: 'green',
      page: 'foh'
    },
    {
      id: 'kitchen-checklist',
      title: 'Kitchen Checklist',
      subtitle: 'Kitchen shift checklist completion',
      category: 'kitchen',
      icon: '✓',
      iconColor: 'green',
      page: 'kitchen-checklist'
    },
    {
      id: 'equipment-issues',
      title: 'Equipment Issues',
      subtitle: 'Equipment needing repair',
      category: 'kitchen',
      icon: '⚠',
      iconColor: 'yellow',
      page: 'kitchen-equipment'
    },
    {
      id: 'documentation',
      title: 'Documentation',
      subtitle: 'Documentation entries this week',
      category: 'documentation',
      icon: '📄',
      iconColor: 'red',
      page: 'documentation'
    },
    {
      id: 'waste-today',
      title: 'Waste Today',
      subtitle: 'Waste value for current shift',
      category: 'kitchen',
      icon: '🗑',
      iconColor: 'red',
      page: 'kitchen-waste'
    },
    {
      id: 'team-members',
      title: 'Team Members',
      subtitle: 'Active team members',
      category: 'training',
      icon: '👥',
      iconColor: 'blue',
      page: 'team-members'
    },
    {
      id: 'evaluations',
      title: 'Evaluations',
      subtitle: 'Upcoming evaluations',
      category: 'evaluations',
      icon: '📋',
      iconColor: 'purple',
      page: 'team-evaluations'
    },
    {
      id: 'active-trainees',
      title: 'Active Trainees',
      subtitle: 'Employees in training',
      category: 'training',
      icon: '🎓',
      iconColor: 'blue',
      page: 'team-training'
    },
    {
      id: 'new-hires',
      title: 'New Hires',
      subtitle: 'New hires in last 30 days',
      category: 'training',
      icon: '👋',
      iconColor: 'blue',
      page: 'team-members'
    },
    {
      id: 'completion-rate',
      title: 'Completion Rate',
      subtitle: 'Training completion rate',
      category: 'training',
      icon: '📈',
      iconColor: 'green',
      page: 'team-training'
    },
    {
      id: 'training-programs',
      title: 'Training',
      subtitle: 'Active training programs',
      category: 'training',
      icon: '📚',
      iconColor: 'green',
      page: 'team-training'
    },
    {
      id: 'leadership-plans',
      title: 'Leadership Plans',
      subtitle: 'Active leadership plans',
      category: 'leadership',
      icon: '🎯',
      iconColor: 'blue',
      page: 'leadership-360'
    },
    {
      id: 'team-performance',
      title: 'Team Performance',
      subtitle: 'Average team performance score',
      category: 'leadership',
      icon: '📊',
      iconColor: 'red',
      page: 'team-development'
    },
    {
      id: 'food-safety-temps',
      title: 'Food Safety Temps',
      subtitle: 'Temperature checks completed',
      category: 'kitchen',
      icon: '🌡',
      iconColor: 'cyan',
      page: 'kitchen-safety'
    },
    {
      id: 'safety-incidents',
      title: 'Safety Incidents',
      subtitle: 'Recent safety reports',
      category: 'leadership',
      icon: '⚠',
      iconColor: 'orange',
      page: 'kitchen-safety'
    },
    {
      id: 'schedule-compliance',
      title: 'Schedule Compliance',
      subtitle: 'On-time clock-ins today',
      category: 'leadership',
      icon: '⏰',
      iconColor: 'blue',
      page: 'team-schedules'
    },
    {
      id: 'guest-recovery',
      title: 'Guest Recovery',
      subtitle: 'Active guest complaints',
      category: 'leadership',
      icon: '🛎',
      iconColor: 'orange',
      page: 'leadership'
    },
    {
      id: 'prep-tasks',
      title: 'Prep Tasks',
      subtitle: 'Kitchen prep completion',
      category: 'kitchen',
      icon: '🥘',
      iconColor: 'green',
      page: 'kitchen'
    }
  ];

  useEffect(() => {
    if (currentInsights) {
      setSelectedCards(currentInsights.map(insight => insight.id));
    }
  }, [currentInsights]);

  const handleCardToggle = (cardId) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter(id => id !== cardId));
    } else if (selectedCards.length < 4) {
      setSelectedCards([...selectedCards, cardId]);
    }
  };

  const handleSave = () => {
    const selectedCardData = availableCards.filter(card => 
      selectedCards.includes(card.id)
    );
    onSave(selectedCardData);
    onClose();
  };

  const handleReset = () => {
    setSelectedCards(['foh-tasks', 'kitchen-checklist', 'equipment-issues', 'documentation']);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Customize Stat Cards</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p className="modal-description">
            Select up to 4 stat cards to display on your dashboard. Uncheck all to use role-based defaults.
          </p>

          <div className="selection-info">
            <span className="selection-count">
              Selected: <span className="count-highlight">{selectedCards.length}</span> / 4
            </span>
            <button className="reset-button" onClick={handleReset}>
              🔄 Reset to Default
            </button>
          </div>

          <div className="cards-grid">
            {availableCards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleCardToggle(card.id)}
                className={`card-option ${selectedCards.includes(card.id) ? 'selected' : ''} ${
                  !selectedCards.includes(card.id) && selectedCards.length >= 4 ? 'disabled' : ''
                }`}
                disabled={!selectedCards.includes(card.id) && selectedCards.length >= 4}
              >
                <div className={`card-icon ${card.iconColor}`}>
                  {card.icon}
                </div>
                <div className="card-info">
                  <h3 className="card-title">{card.title}</h3>
                  <p className="card-subtitle">{card.subtitle}</p>
                  <span className="card-category">{card.category}</span>
                </div>
                {selectedCards.includes(card.id) && (
                  <div className="selected-indicator">✓</div>
                )}
              </button>
            ))}
          </div>
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

export default CustomizeInsightsModal;

import React, { useState } from 'react';
import './New360Evaluation.css';

const New360Evaluation = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedLeader, setSelectedLeader] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [startDate, setStartDate] = useState('April 20th, 2026');
  const [dueDate, setDueDate] = useState('April 27th, 2026');
  const [evaluators, setEvaluators] = useState([]);

  const steps = [
    { id: 1, label: 'Leader', icon: '👤' },
    { id: 2, label: 'Template', icon: '📋' },
    { id: 3, label: 'Schedule', icon: '📅' },
    { id: 4, label: 'Evaluators', icon: '👥' }
  ];

  const templates = [
    { id: 'directors', name: 'Leadership 360 - Directors', description: 'Comprehensive 360-degree feedback template for leadership evaluation', sections: 6 },
    { id: 'emerging', name: 'Leadership 360 - Emerging Leaders', description: 'Comprehensive 360-degree feedback template for leadership evaluation', sections: 6 },
    { id: 'managers', name: 'Leadership 360 - Managers', description: 'Comprehensive 360-degree feedback template for leadership evaluation', sections: 6 },
    { id: 'general', name: 'Leadership 360 Evaluation', description: 'Comprehensive 360-degree feedback template for leadership evaluation', sections: 6 }
  ];

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else onBack();
  };

  const addEvaluator = () => {
    if (evaluators.length < 10) {
      setEvaluators([...evaluators, { id: Date.now(), type: 'Peer' }]);
    }
  };

  return (
    <div className="new-360-evaluation">
      {/* Header */}
      <div className="evaluation-header">
        <button className="back-btn" onClick={handleBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <h1>New 360° Leadership Evaluation</h1>
      </div>

      {/* Wizard Container */}
      <div className="wizard-container">
        <h2>Create 360° Evaluation</h2>

        {/* Stepper */}
        <div className="stepper">
          {steps.map((step, index) => (
            <div key={step.id} className={`step ${currentStep >= step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}>
              <div className="step-circle">
                {currentStep > step.id ? '✓' : step.icon}
              </div>
              <span className="step-label">{step.label}</span>
              {index < steps.length - 1 && <div className={`step-line ${currentStep > step.id ? 'active' : ''}`} />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="step-content">
          {/* Step 1: Select Leader */}
          {currentStep === 1 && (
            <div className="step-panel">
              <h3>Select Leader</h3>
              <p className="step-description">Choose the leader who will receive the 360° leadership evaluation</p>
              
              <div className="form-group">
                <label>Leader</label>
                <select 
                  className="form-select"
                  value={selectedLeader}
                  onChange={(e) => setSelectedLeader(e.target.value)}
                >
                  <option value="">Select a leader</option>
                  <option value="anthony">Anthony Pope</option>
                  <option value="sarah">Sarah Johnson</option>
                  <option value="michael">Michael Chen</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Select Template */}
          {currentStep === 2 && (
            <div className="step-panel">
              <h3>Select Evaluation Template</h3>
              <p className="step-description">Choose a Leadership 360 Evaluation template for this assessment</p>
              
              <div className="form-group">
                <label>Available Templates</label>
                <div className="templates-list">
                  {templates.map(template => (
                    <div 
                      key={template.id}
                      className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="template-info">
                        <h4>{template.name}</h4>
                        <p>{template.description}</p>
                        <span className="sections">{template.sections} sections</span>
                      </div>
                      {selectedTemplate === template.id && (
                        <div className="template-check">✓</div>
                      )}
                    </div>
                  ))}
                </div>
                <button className="btn-create-template">+ Create Additional Template</button>
              </div>
            </div>
          )}

          {/* Step 3: Schedule */}
          {currentStep === 3 && (
            <div className="step-panel">
              <h3>Schedule Evaluation</h3>
              <p className="step-description">Set the start and due dates for the 360° leadership evaluation. Evaluators typically need 7 days to complete their feedback.</p>
              
              <div className="date-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <p className="date-note">Evaluation period: Apr 20 - Apr 27, 2026 (7 days)</p>
            </div>
          )}

          {/* Step 4: Select Evaluators */}
          {currentStep === 4 && (
            <div className="step-panel">
              <h3>Select Evaluators</h3>
              <p className="step-description">Add at least 2 evaluators (recommended 6) to provide feedback on the leader's performance</p>
              
              <div className="evaluators-summary">
                <span className="eval-count">0 evaluators selected</span>
                <span className="eval-needed">Add at least 2 more evaluators</span>
              </div>

              <div className="add-evaluator-row">
                <select className="form-select eval-select">
                  <option>Select an evaluator</option>
                </select>
                <select className="form-select type-select">
                  <option>Peer</option>
                  <option>Manager</option>
                  <option>Direct Report</option>
                </select>
              </div>
              <button className="btn-add-evaluator" onClick={addEvaluator}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  <line x1="19" y1="11" x2="19" y2="11"/>
                </svg>
                Add Evaluator
              </button>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="wizard-navigation">
          <button className="btn-nav-back" onClick={handleBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Back
          </button>
          
          {currentStep < 4 ? (
            <button className="btn-nav-next" onClick={handleNext}>
              Next
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          ) : (
            <button className="btn-create-eval" disabled={evaluators.length < 2}>
              Create Evaluation & Send Invitations
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default New360Evaluation;

import React, { useState, useRef, useEffect } from 'react';
import setupSheetsService from '../services/setupSheets';
import './SetupSheetBuilder.css';

const IconClipboard = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
  </svg>
);

const IconInfo = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const IconUploadCloud = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
  </svg>
);

const IconChevronDown = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const SetupSheetBuilder = ({ onNavigate, user }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null); // 'uploading'|'success'|'error'
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef(null);

  // Load templates so the "Load Previous Setup" dropdown reflects reality.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await setupSheetsService.listTemplates();
        const rows = res.results || res || [];
        if (!cancelled) setTemplates(rows);
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Create a brand-new draft sheet, then attach the uploaded file to it.
  // Server-side parsing is deferred; for now we just acknowledge the file.
  const uploadFileAsNewSheet = async (file) => {
    setUploadStatus('uploading');
    setUploadMessage(`Uploading ${file.name}…`);
    try {
      const today = new Date();
      const sheet = await setupSheetsService.createSheet({
        name: file.name.replace(/\.[^/.]+$/, '') || 'Untitled setup',
        status: 'draft',
        week_start: today.toISOString().slice(0, 10),
        week_end: new Date(today.getTime() + 6 * 86400000)
          .toISOString().slice(0, 10),
      });
      await setupSheetsService.uploadFile(sheet.id, file);
      setUploadStatus('success');
      setUploadMessage(
        `Saved "${sheet.name}" — file received (parsing is coming in a future update).`
      );
      // Navigate to the saved-sheets list so the user sees their new draft.
      setTimeout(() => onNavigate && onNavigate('saved-setups'), 1200);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadStatus('error');
      setUploadMessage(err.message || 'Upload failed.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) uploadFileAsNewSheet(files[0]);
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) uploadFileAsNewSheet(e.target.files[0]);
  };

  return (
    <div className="ssb-page">
      <div className="ssb-container">
        <div className="ssb-stack">
          {/* Red blur backdrop */}
          <div className="ssb-hero-blur" aria-hidden="true"></div>

          {/* Hero */}
          <div className="ssb-hero">
            <div className="ssb-hero-badge">
              <div className="ssb-hero-badge-glow" aria-hidden="true"></div>
              <div className="ssb-hero-badge-inner">
                <IconClipboard className="ssb-hero-badge-icon" />
              </div>
            </div>
            <h1 className="ssb-hero-title">Weekly Schedule Setup</h1>
            <p className="ssb-hero-subtitle">
              Upload your HotSchedules weekly report to automatically generate employee assignments and time blocks.
            </p>
          </div>

          {/* How to Export */}
          <section className="ssb-card ssb-export-card">
            <div className="ssb-card-corner-blur" aria-hidden="true"></div>

            <div className="ssb-export-header">
              <div className="ssb-export-header-icon">
                <IconInfo className="ssb-export-header-icon-svg" />
              </div>
              <div>
                <h2 className="ssb-export-title">How to Export from HotSchedules</h2>
                <p className="ssb-export-subtitle">Follow these quick steps to prepare your schedule file for import.</p>
              </div>
            </div>

            <div className="ssb-export-grid">
              {/* Steps 1-5 */}
              <div className="ssb-steps-card">
                <h3 className="ssb-steps-title">
                  <span className="ssb-steps-bar"></span>
                  Steps 1-5: Export
                </h3>
                <ol className="ssb-steps-list">
                  <li>
                    <span className="ssb-step-num">1</span>
                    <span className="ssb-step-text">Log in to HotSchedules</span>
                  </li>
                  <li>
                    <span className="ssb-step-num">2</span>
                    <span className="ssb-step-text">Click on scheduling to view the week's schedule</span>
                  </li>
                  <li>
                    <span className="ssb-step-num">3</span>
                    <span className="ssb-step-text">Navigate to the week you want to upload</span>
                  </li>
                  <li>
                    <span className="ssb-step-num">4</span>
                    <span className="ssb-step-text">
                      Top right corner: click <strong>Reports → Weekly Report</strong>
                    </span>
                  </li>
                  <li>
                    <span className="ssb-step-num">5</span>
                    <span className="ssb-step-text">
                      Click <strong>Download</strong> button to get PDF
                    </span>
                  </li>
                </ol>
              </div>

              {/* Steps 6-9 */}
              <div className="ssb-steps-card">
                <h3 className="ssb-steps-title">
                  <span className="ssb-steps-bar"></span>
                  Steps 6-9: Convert
                </h3>
                <ol className="ssb-steps-list">
                  <li>
                    <span className="ssb-step-num">6</span>
                    <span className="ssb-step-text">
                      Go to{' '}
                      <a
                        href="https://www.ilovepdf.com/pdf_to_excel"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ssb-link"
                      >
                        ilovepdf.com/pdf_to_excel
                      </a>
                    </span>
                  </li>
                  <li>
                    <span className="ssb-step-num">7</span>
                    <span className="ssb-step-text">Convert PDF to Excel format and download</span>
                  </li>
                  <li>
                    <span className="ssb-step-num">8</span>
                    <span className="ssb-step-text">
                      Open Excel file and <strong>delete the first row</strong>
                    </span>
                  </li>
                  <li>
                    <span className="ssb-step-num ssb-step-num-red">9</span>
                    <span className="ssb-step-text ssb-step-text-emphasis">Save and drop the file below</span>
                  </li>
                </ol>
              </div>
            </div>
          </section>

          {/* Dropzone */}
          <div
            role="button"
            tabIndex={0}
            className={`ssb-dropzone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClickUpload}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickUpload(); }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.pdf"
              className="ssb-file-input"
              onChange={handleFileChange}
            />
            <div className="ssb-dropzone-content">
              <div className="ssb-dropzone-icon">
                <IconUploadCloud className="ssb-dropzone-icon-svg" />
              </div>
              <h2 className="ssb-dropzone-title">Upload Schedule File</h2>
              <p className="ssb-dropzone-subtitle">Drag and drop your converted Excel file or click to browse</p>
              <div className="ssb-dropzone-chips">
                <span className="ssb-chip">.xlsx</span>
                <span className="ssb-chip">.xls</span>
                <span className="ssb-chip">.pdf</span>
              </div>
            </div>
          </div>

          {/* Load Previous Setup */}
          <section className="ssb-card ssb-load-card">
            <div className="ssb-load-corner" aria-hidden="true"></div>
            <div className="ssb-load-inner">
              <div className="ssb-load-text">
                <h3 className="ssb-load-title">Load Previous Setup</h3>
                <p className="ssb-load-subtitle">Pick up where you left off or reuse a previous week's configuration.</p>
              </div>
              <div className="ssb-load-select-wrap">
                <select
                  className="ssb-load-select"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                >
                  <option value="">Select a saved template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <IconChevronDown className="ssb-load-chevron" />
              </div>
            </div>
          </section>

          {/* Upload status feedback */}
          {uploadStatus && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 14,
                background: uploadStatus === 'error' ? '#fee2e2'
                  : uploadStatus === 'success' ? '#dcfce7'
                  : '#dbeafe',
                color: uploadStatus === 'error' ? '#991b1b'
                  : uploadStatus === 'success' ? '#166534'
                  : '#1e40af',
              }}
            >
              {uploadMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupSheetBuilder;

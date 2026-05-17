import React, { useEffect, useState } from 'react';
import './LoginPage.css';
import apiService from '../services/api';

const REMEMBERED_EMAIL_KEY = 'cfa:rememberedEmail';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    try {
      const rememberedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (!rememberedEmail) return;
      setEmail(rememberedEmail);
      setForgotPasswordEmail(rememberedEmail);
      setRememberMe(true);
    } catch (err) {
      console.warn('Remembered email is unavailable on this device.', err);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await apiService.login(email, password, rememberMe);
      try {
        if (rememberMe) {
          window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
        } else {
          window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
      } catch (storageErr) {
        console.warn('Could not update remembered email on this device.', storageErr);
      }
      onLogin();
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsForgotPasswordLoading(true);
    setError('');

    try {
      const response = await apiService.forgotPassword(forgotPasswordEmail);
      setForgotPasswordMessage(response.message);
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const openForgotPassword = () => {
    setForgotPasswordEmail((prev) => prev || email.trim());
    setForgotPasswordMessage('');
    setError('');
    setShowForgotPassword(true);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-section">
            <h1 className="logo-text">CFA I-410 & Rigsby</h1>
            <p className="location-text">2203 SE Loop 410, San Antonio, TX</p>
          </div>
          <h2 className="login-title">Sign in to your account</h2>
          <p className="login-subtitle">Welcome back to your team development platform!</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="password-input-container">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="form-input password-input"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="checkbox-input"
              />
              <span className="checkbox-text">Remember me</span>
            </label>
            <button 
              type="button"
              onClick={openForgotPassword}
              className="forgot-password"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`login-button ${isLoading ? 'loading' : ''}`}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="forgot-password-modal">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Reset Password</h3>
                <button 
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                    setForgotPasswordMessage('');
                    setError('');
                  }}
                  className="close-button"
                >
                  ×
                </button>
              </div>
              
              {forgotPasswordMessage ? (
                <div className="success-message">
                  {forgotPasswordMessage}
                </div>
              ) : (
                <form onSubmit={handleForgotPassword}>
                  {error && (
                    <div className="error-message">
                      {error}
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label htmlFor="forgot-email" className="form-label">
                      Email Address
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isForgotPasswordLoading}
                    className={`login-button ${isForgotPasswordLoading ? 'loading' : ''}`}
                  >
                    {isForgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LoginPage;

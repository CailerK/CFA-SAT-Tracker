import React, { useState } from 'react';
import './ResetPasswordPage.css';
import apiService from '../services/api';

const ResetPasswordPage = ({ uid, token, onBackToLogin }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Enter and confirm your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiService.resetPassword(uid, token, password);
      setSuccessMessage(response?.message || 'Password reset complete.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Could not reset your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-card">
        <div className="reset-password-accent" aria-hidden="true" />
        <div className="reset-password-header">
          <p className="reset-password-eyebrow">CFA SAT Tracker</p>
          <h1 className="reset-password-title">Create a new password</h1>
          <p className="reset-password-subtitle">
            This password reset link is tied to your account and expires after 24 hours.
          </p>
        </div>

        {successMessage ? (
          <div className="reset-password-success">
            <div className="reset-password-success-icon">&#10003;</div>
            <h2>Password updated</h2>
            <p>{successMessage}</p>
            <button type="button" className="reset-password-button" onClick={onBackToLogin}>
              Back to sign in
            </button>
          </div>
        ) : (
          <form className="reset-password-form" onSubmit={handleSubmit}>
            {error && <div className="reset-password-error">{error}</div>}

            <label className="reset-password-label" htmlFor="new-password">
              New password
            </label>
            <div className="reset-password-input-wrap">
              <input
                id="new-password"
                className="reset-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your new password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="reset-password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <label className="reset-password-label" htmlFor="confirm-password">
              Confirm password
            </label>
            <div className="reset-password-input-wrap">
              <input
                id="confirm-password"
                className="reset-password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="reset-password-toggle"
                aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                onClick={() => setShowConfirmPassword((value) => !value)}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <p className="reset-password-hint">
              Use at least 8 characters and avoid passwords that are too common or too similar to your personal info.
            </p>

            <button
              type="submit"
              className="reset-password-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating password...' : 'Reset password'}
            </button>

            <button
              type="button"
              className="reset-password-secondary"
              onClick={onBackToLogin}
            >
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;

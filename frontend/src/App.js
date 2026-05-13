import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import apiService from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Normalize the backend's snake_case user object to the camelCase the UI
  // components (Dashboard, etc.) expect. Single source of truth.
  const normalizeUser = (raw) => ({
    id: raw.id,
    email: raw.email,
    firstName: raw.first_name,
    lastName: raw.last_name,
    storeId: raw.company_id,
    role: raw.role,
    department: raw.department,
  });

  // On app load, ask the backend whether our session cookie is valid.
  // The browser silently sends the sessionid cookie; if the user is logged in,
  // Django returns their info, otherwise we get a 401 and show the login page.
  // This is more secure than trusting localStorage — a user can't fake a session
  // by editing browser storage in DevTools.
  const checkSession = useCallback(async () => {
    try {
      const data = await apiService.getCurrentUser();
      setUser(normalizeUser(data.user));
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogin = () => {
    // LoginPage already called apiService.login() which set the session cookie.
    // Re-fetch the user from the backend so the shape matches what checkSession
    // sees (avoids snake_case vs camelCase drift between login and refresh).
    checkSession();
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (err) {
      // If the logout call fails (already expired session, etc.) drop client state anyway.
      console.warn('Logout request failed; clearing local state regardless.', err);
    }
    setUser(null);
  };

  if (isLoading) {
    return (
      <div
        className="App"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div>Loading…</div>
      </div>
    );
  }

  return (
    <div className="App">
      {!user ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;

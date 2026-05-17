import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import ResetPasswordPage from './components/ResetPasswordPage';
import apiService from './services/api';

const getResetPasswordRoute = () => {
  const match = window.location.pathname.match(/^\/reset-password\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;
  return {
    uid: decodeURIComponent(match[1]),
    token: decodeURIComponent(match[2]),
  };
};

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resetPasswordRoute, setResetPasswordRoute] = useState(getResetPasswordRoute);

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
    isSuperuser: raw.is_superuser,
    isAdmin: raw.is_admin,
    store: raw.store,
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

  useEffect(() => {
    const syncRoute = () => setResetPasswordRoute(getResetPasswordRoute());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  const handleLogin = () => {
    // LoginPage already called apiService.login() which set the session cookie.
    // Re-fetch the user from the backend so the shape matches what checkSession
    // sees (avoids snake_case vs camelCase drift between login and refresh).
    // Clear any stale URL hash so users always land on the dashboard after login.
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search
    );
    checkSession();
  };

  const handleReturnToLogin = useCallback(() => {
    setUser(null);
    setResetPasswordRoute(null);
    setIsLoading(false);
    window.history.replaceState(null, '', '/');
  }, []);

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (err) {
      // If the logout call fails (already expired session, etc.) drop client state anyway.
      console.warn('Logout request failed; clearing local state regardless.', err);
    }
    setUser(null);
  };

  if (resetPasswordRoute) {
    return (
      <div className="App">
        <ResetPasswordPage
          uid={resetPasswordRoute.uid}
          token={resetPasswordRoute.token}
          onBackToLogin={handleReturnToLogin}
        />
      </div>
    );
  }

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

import React, { useState, useEffect } from 'react';
import './UserManagement.css';
import api from '../services/api';

const UserManagement = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const isSuperuser = currentUser?.isSuperuser;
  const isAdmin = currentUser?.isAdmin;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, storesRes, rolesRes] = await Promise.all([
        api.request('/users/'),
        api.request('/users/stores/'),
        api.request('/users/roles/'),
      ]);
      setUsers(usersRes);
      setStores(storesRes);
      setRoles(rolesRes);
      setError(null);
    } catch (err) {
      console.error('Failed to load user management data:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser({
      email: '',
      username: '',
      firstName: '',
      lastName: '',
      role: 'team_member',
      phone: '',
      password: '',
      isAdmin: false,
      isSuperuser: false,
      isStaff: false,
      isDemoUser: false,
      store: currentUser?.store?.id || null,
      shiftPreference: 'flex',
    });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser({
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone || '',
      password: '', // Don't pre-fill password
      isAdmin: user.isAdmin,
      isSuperuser: user.isSuperuser,
      isStaff: user.isStaff,
      isDemoUser: user.isDemoUser,
      store: user.store || currentUser?.store?.id,
      shiftPreference: user.shiftPreference || 'flex',
    });
    setShowModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        email: editingUser.email,
        username: editingUser.username,
        first_name: editingUser.firstName,
        last_name: editingUser.lastName,
        role: editingUser.role,
        phone: editingUser.phone,
        is_admin: editingUser.isAdmin,
        is_superuser: editingUser.isSuperuser,
        is_staff: editingUser.isStaff,
        is_demo_user: editingUser.isDemoUser,
        store: editingUser.store,
        shift_preference: editingUser.shiftPreference,
      };

      // Only include password if it's set
      if (editingUser.password) {
        payload.password = editingUser.password;
      }

      if (editingUser.id) {
        // Update existing user
        await api.request(`/users/${editingUser.id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        // Create new user
        await api.request('/users/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      setEditingUser(null);
      loadData();
    } catch (err) {
      console.error('Failed to save user:', err);
      alert(err.message || 'Failed to save user');
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser.id) {
      alert("You cannot delete your own account.");
      return;
    }

    if (!isSuperuser && (user.isAdmin || user.isSuperuser)) {
      alert("You don't have permission to delete admin users.");
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${user.fullName || user.email}?`)) {
      try {
        await api.request(`/users/${user.id}/`, { method: 'DELETE' });
        loadData();
      } catch (err) {
        console.error('Failed to delete user:', err);
        alert(err.message || 'Failed to delete user');
      }
    }
  };

  const handleResetPassword = async (user) => {
    if (window.confirm(`Reset password for ${user.fullName || user.email}?`)) {
      try {
        const res = await api.request(`/users/${user.id}/reset_password/`, { method: 'POST' });
        setTempPassword(res.temporary_password);
        setShowPasswordModal(true);
      } catch (err) {
        console.error('Failed to reset password:', err);
        alert(err.message || 'Failed to reset password');
      }
    }
  };

  const canEditUser = (user) => {
    if (isSuperuser) return true;
    if (!isAdmin) return false;
    // Admins can't edit other admins or superusers
    if (user.isSuperuser || (user.isAdmin && user.id !== currentUser.id)) {
      return false;
    }
    return true;
  };

  const canDeleteUser = (user) => {
    if (user.id === currentUser.id) return false;
    if (isSuperuser) return true;
    if (!isAdmin) return false;
    // Admins can't delete other admins or superusers
    return !user.isSuperuser && !user.isAdmin;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="user-mgmt-loading">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-mgmt-error">
        <p>{error}</p>
        <button onClick={loadData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-mgmt-header">
        <div className="user-mgmt-title">
          <h2>User Management</h2>
          <p className="user-mgmt-subtitle">
            {isSuperuser ? 'Manage all users in your store' : 'Manage team members'}
          </p>
        </div>
        <button className="btn-primary" onClick={handleCreateUser}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add User
        </button>
      </div>

      <div className="user-mgmt-filters">
        <div className="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="all">All Roles</option>
          {roles.map(role => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
      </div>

      <div className="user-mgmt-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Store</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="user-name">
                    <div className="user-avatar">{user.initials}</div>
                    <span>{user.fullName || user.email}</span>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {user.role.replace('_', ' ')}
                  </span>
                  {user.isSuperuser && <span className="badge-superuser">Superuser</span>}
                  {user.isAdmin && !user.isSuperuser && <span className="badge-admin">Admin</span>}
                </td>
                <td>{user.storeName || 'N/A'}</td>
                <td>
                  {user.isDemoUser ? (
                    <span className="status-demo">Demo</span>
                  ) : (
                    <span className="status-active">Active</span>
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    {canEditUser(user) && (
                      <button
                        className="btn-icon"
                        onClick={() => handleEditUser(user)}
                        title="Edit user"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    )}
                    {canEditUser(user) && (
                      <button
                        className="btn-icon"
                        onClick={() => handleResetPassword(user)}
                        title="Reset password"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </button>
                    )}
                    {canDeleteUser(user) && (
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => handleDeleteUser(user)}
                        title="Delete user"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser.id ? 'Edit User' : 'Create New User'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      value={editingUser.firstName}
                      onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      value={editingUser.lastName}
                      onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Username *</label>
                    <input
                      type="text"
                      value={editingUser.username}
                      onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Password {!editingUser.id && '*'}</label>
                    <input
                      type="password"
                      value={editingUser.password}
                      onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                      placeholder={editingUser.id ? 'Leave blank to keep current' : ''}
                      required={!editingUser.id}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={editingUser.phone}
                      onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Role *</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                      required
                    >
                      {roles.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Shift Preference</label>
                    <select
                      value={editingUser.shiftPreference}
                      onChange={(e) => setEditingUser({...editingUser, shiftPreference: e.target.value})}
                    >
                      <option value="day">Day</option>
                      <option value="night">Night</option>
                      <option value="flex">Flexible</option>
                    </select>
                  </div>
                </div>

                {stores.length > 1 && isSuperuser && (
                  <div className="form-group">
                    <label>Store *</label>
                    <select
                      value={editingUser.store || ''}
                      onChange={(e) => setEditingUser({...editingUser, store: parseInt(e.target.value)})}
                      required
                    >
                      <option value="">Select a store</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>
                          {store.name} (#{store.storeNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Permission checkboxes */}
                <div className="form-group">
                  {/* Admins can set admin checkbox when CREATING, but not when editing existing admins */}
                  {(isSuperuser || (isAdmin && !editingUser.id)) && (
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingUser.isAdmin}
                        onChange={(e) => setEditingUser({...editingUser, isAdmin: e.target.checked})}
                        disabled={isAdmin && editingUser.id && editingUser.isAdmin}
                      />
                      <span>Admin (can manage users)</span>
                    </label>
                  )}
                  
                  {/* Only superusers can manage superuser and demo flags */}
                  {isSuperuser && (
                    <>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={editingUser.isSuperuser}
                          onChange={(e) => setEditingUser({...editingUser, isSuperuser: e.target.checked, isStaff: e.target.checked})}
                        />
                        <span>Superuser (full system access)</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={editingUser.isDemoUser}
                          onChange={(e) => setEditingUser({...editingUser, isDemoUser: e.target.checked})}
                        />
                        <span>Demo User</span>
                      </label>
                    </>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser.id ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Password Reset</h3>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Temporary password has been generated:</p>
              <div className="password-display">
                <code>{tempPassword}</code>
                <button
                  className="btn-icon"
                  onClick={() => {
                    navigator.clipboard.writeText(tempPassword);
                    alert('Password copied to clipboard!');
                  }}
                  title="Copy to clipboard"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
              <p className="warning-text">Please share this password securely with the user.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowPasswordModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

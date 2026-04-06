import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { RefreshCcw, Search, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_OPTIONS = [
  'STUDENT',
  'TEACHER',
  'PARENT',
  'SCHOOL_ADMINISTRATOR',
  'BUREAU_OF_EDUCATION',
  'AI_SYSTEM',
  'SYSTEM_ADMINISTRATOR',
  'AUTHENTICATION_SYSTEM',
];

const getRole = (user) => user?.legacyRole || user?.role || user?.roles?.[0]?.name || '';
const formatRoleLabel = (value) => String(value || 'UNKNOWN').replaceAll('_', ' ');
const normalizeText = (value) => String(value || '').trim().toLowerCase();
const toCanonicalRole = (value) => {
  const role = String(value || '').toUpperCase();
  if (role === 'ADMIN') return 'SYSTEM_ADMINISTRATOR';
  if (role === 'INSTRUCTOR') return 'TEACHER';
  return role;
};
const normalizeUserRecord = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const role = toCanonicalRole(raw.legacyRole || raw.role || raw?.roles?.[0]?.name || '');
  return {
    id: raw.id ?? raw.publicId ?? raw.uuid ?? null,
    legacyId: raw.legacyId ?? raw.id ?? null,
    publicId: raw.publicId ?? raw.id ?? null,
    name: raw.name || 'Unnamed User',
    email: raw.email || '',
    legacyRole: role || 'UNKNOWN',
    schoolName: raw.schoolName || raw?.school?.name || '',
    authorities: Array.isArray(raw.authorities) ? raw.authorities : [],
  };
};
const roleToneClass = (value) => {
  const role = toCanonicalRole(value);
  if (role.includes('SYSTEM') || role.includes('SCHOOL_ADMINISTRATOR')) return 'is-admin';
  if (role === 'TEACHER') return 'is-teacher';
  if (role === 'PARENT') return 'is-parent';
  if (role === 'STUDENT') return 'is-student';
  return 'is-other';
};

const UserStatCard = ({ label, value, tone }) => (
  <article className={`users-stat-card panel-card ${tone || ''}`}>
    <p>{label}</p>
    <h3>{value}</h3>
  </article>
);

export default function UserManagement() {
  const { user } = useAuth();
  const currentRole = toCanonicalRole(getRole(user));
  const isAdmin = ['SCHOOL_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'].includes(currentRole);
  const isSystemAdmin = currentRole === 'SYSTEM_ADMINISTRATOR';

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
  });

  const loadUsers = async () => {
    setLoadingUsers(true);
    setMessage({ type: '', text: '' });
    try {
      let payload = [];

      if (isSystemAdmin) {
        try {
          const rbacResponse = await axios.get('/api/rbac/users');
          payload = Array.isArray(rbacResponse.data) ? rbacResponse.data : [];
        } catch {
          const fallbackResponse = await axios.get('/api/users/users');
          payload = Array.isArray(fallbackResponse.data)
            ? fallbackResponse.data
            : Array.isArray(fallbackResponse.data?.users)
              ? fallbackResponse.data.users
              : [];
        }
      } else {
        const response = await axios.get('/api/users/users');
        payload = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.users)
            ? response.data.users
            : [];
      }

      const normalizedUsers = payload
        .map(normalizeUserRecord)
        .filter(Boolean);
      setUsers(normalizedUsers);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data || 'Failed to load users.';
      setMessage({ type: 'error', text: String(errorMessage) });
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoadingUsers(false);
      return;
    }
    loadUsers();
  }, [isAdmin, isSystemAdmin]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = normalizeText(searchText);
    return users.filter((u) => {
      const role = toCanonicalRole(getRole(u));
      const roleMatch = selectedRole === 'ALL' || role === selectedRole;
      if (!roleMatch) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return [u.name, u.email, role].some((value) => normalizeText(value).includes(normalizedQuery));
    });
  }, [searchText, selectedRole, users]);

  const availableRoles = useMemo(() => {
    const fromUsers = users.map((u) => toCanonicalRole(getRole(u))).filter(Boolean);
    return Array.from(new Set([...ROLE_OPTIONS, ...fromUsers])).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => ['SYSTEM_ADMINISTRATOR', 'SCHOOL_ADMINISTRATOR'].includes(toCanonicalRole(getRole(u)))).length;
    const teachers = users.filter((u) => toCanonicalRole(getRole(u)) === 'TEACHER').length;
    const students = users.filter((u) => toCanonicalRole(getRole(u)) === 'STUDENT').length;
    return [
      { label: 'Total Users', value: total, tone: 'is-info' },
      { label: 'Admins', value: admins, tone: 'is-warning' },
      { label: 'Teachers', value: teachers, tone: 'is-success' },
      { label: 'Students', value: students, tone: 'is-neutral' },
    ];
  }, [users]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'STUDENT',
    });
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });

    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }

    if (formData.password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post('/api/users/users/create', formData);
      const successMessage = response.data?.message || 'User created successfully.';
      setMessage({ type: 'success', text: successMessage });
      resetForm();
      await loadUsers();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data || 'Failed to create user.';
      setMessage({ type: 'error', text: String(errorMessage) });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId, userName) => {
    const confirmed = window.confirm(`Delete user "${userName}"?`);
    if (!confirmed) {
      return;
    }

    setMessage({ type: '', text: '' });
    setDeletingId(userId);
    try {
      await axios.delete(`/api/users/users/delete/${userId}`);
      setUsers((prev) => prev.filter((u) => Number(u.legacyId) !== Number(userId)));
      setMessage({ type: 'success', text: 'User deleted successfully.' });
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data || 'Failed to delete user.';
      setMessage({ type: 'error', text: String(errorMessage) });
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <section className="panel-card">
        <h2>Access Restricted</h2>
        <p>This page is available only for school and system administrators.</p>
      </section>
    );
  }

  return (
    <div className="users-page">
      <section className="users-hero panel-card">
        <div className="users-hero-copy">
          <h1>User Management</h1>
          <p>Create and manage platform users from one place.</p>
          <div className="users-hero-tags">
            <span className="users-hero-chip">Role: {formatRoleLabel(currentRole)}</span>
            <span className="users-hero-chip">Users: {users.length}</span>
            <span className="users-hero-chip is-accent">Filtered: {filteredUsers.length}</span>
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={loadUsers} disabled={loadingUsers}>
          <RefreshCcw size={16} />
          {loadingUsers ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      <section className="users-stats-grid">
        {stats.map((item) => (
          <UserStatCard key={item.label} label={item.label} value={item.value} tone={item.tone} />
        ))}
      </section>

      {message.text && (
        <div className={`status-message ${message.type === 'error' ? 'status-error' : 'status-success'}`}>
          {message.text}
        </div>
      )}

      <section className="users-layout">
        <article className="panel-card users-form-card">
          <h2>Create User</h2>
          <p>Add a new account using backend endpoint permissions.</p>

          <form className="user-create-form" onSubmit={handleCreateUser}>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              required
            />

            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="name@example.com"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Minimum 8 characters"
              minLength={8}
              required
            />

            <label htmlFor="role">Role</label>
            <select
              id="role"
              className="input"
              value={formData.role}
              onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
              required
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role.replaceAll('_', ' ')}
                </option>
              ))}
            </select>

            <button type="submit" className="btn btn-primary users-create-btn" disabled={creating}>
              <UserPlus size={18} />
              {creating ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </article>

        <article className="panel-card users-list-card">
          <div className="users-list-head">
            <h2>Users</h2>
            <div className="users-list-tools">
              <div className="users-search-wrap">
                <Search size={16} />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search by name, email, role"
                />
              </div>
              <select
                className="input users-role-filter"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="ALL">All roles</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {formatRoleLabel(role)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingUsers ? (
            <p className="users-muted">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="users-muted">No users found from backend.</p>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>School</th>
                    <th>ID</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const legacyId = Number(u.legacyId);
                    const deleting = deletingId === legacyId;
                    return (
                      <tr key={u.publicId || u.email || legacyId}>
                        <td>
                          <div className="user-item-head">
                            <div className="user-avatar">{String(u.name || 'U').charAt(0).toUpperCase()}</div>
                            <strong>{u.name || 'Unnamed User'}</strong>
                          </div>
                        </td>
                        <td>{u.email || 'N/A'}</td>
                        <td>
                          <span className={`role-chip ${roleToneClass(getRole(u))}`}>{formatRoleLabel(getRole(u))}</span>
                        </td>
                        <td>{u.schoolName || 'Unassigned'}</td>
                        <td>#{legacyId || '-'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger user-delete-btn"
                            onClick={() => handleDelete(legacyId, u.name || u.email || 'user')}
                            disabled={deleting || !legacyId}
                            title="Delete user"
                          >
                            <Trash2 size={16} />
                            {deleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

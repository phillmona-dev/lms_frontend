import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const normalizeUser = (rawUser) => {
  if (!rawUser) {
    return null;
  }

  const normalizedRoles = Array.isArray(rawUser.roles) ? rawUser.roles : [];
  const normalizedLegacyRole = rawUser.legacyRole || rawUser.role || normalizedRoles[0]?.name || null;

  return {
    ...rawUser,
    roles: normalizedRoles,
    legacyRole: normalizedLegacyRole,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          // Profile is at /users/profile on the backend
          const res = await axios.get('/api/users/profile');
          setUser(normalizeUser(res.data));
        } catch (error) {
          console.error('Auth verification failed', error);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      // Backend login endpoint is /auth/login
      const res = await axios.post('/api/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Use the user object returned directly from the login response
      setUser(normalizeUser(user));
      return { success: true };
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Login failed. Please check your credentials.';
      return { success: false, error: msg };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      // Backend register endpoint is /auth/register
      await axios.post('/api/auth/register', { name, email, password, role });
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed.';
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const getEffectiveRoleTheme = (user) => {
  if (!user) return 'STUDENT';
  const role = (user.role || '').toUpperCase();
  const staffRole = (user.staffRole || user.staffProfile?.staffRole || user.profile?.staffRole || '').toUpperCase();
  const roleName = (user.roleName || '').toUpperCase();

  if (role === 'DEAN' || staffRole === 'DEAN' || roleName === 'DEAN') return 'DEAN';
  if (
    role === 'EXAM_SECTION' || role === 'EXAMINATION' || role === 'EXAMINATION_SECTION' ||
    staffRole === 'EXAM_SECTION' || staffRole === 'EXAMINATION' || staffRole === 'EXAMINATION_SECTION' ||
    roleName === 'EXAM_SECTION' || roleName === 'EXAMINATION'
  ) return 'EXAM_SECTION';
  if (role === 'ADMIN' || staffRole === 'ADMIN') return 'ADMIN';
  if (role === 'HOD' || staffRole === 'HOD') return 'HOD';
  if (role === 'MENTOR' || staffRole === 'MENTOR') return 'MENTOR';
  if (role === 'STAFF' || role === 'FACULTY' || staffRole === 'FACULTY') return 'FACULTY';
  if (role === 'PARENT') return 'PARENT';
  if (role === 'STUDENT') return 'STUDENT';
  return 'STUDENT';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('academic_auth_token');
      const savedUser = localStorage.getItem('academic_auth_user');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Error restoring session from localStorage:', e);
      localStorage.removeItem('academic_auth_token');
      localStorage.removeItem('academic_auth_user');
    } finally {
      setLoading(false);
    }
  }, []);

  // Synchronize visual color theme according to authenticated user's role
  useEffect(() => {
    const roleTheme = getEffectiveRoleTheme(user);
    document.documentElement.setAttribute('data-role', roleTheme);
  }, [user]);

  const login = async (identifier, password, userType) => {
    const response = await api.post('/auth/login', {
      identifier,
      password,
      userType,
    });

    if (response.data?.success && response.data?.data) {
      const { token: receivedToken, user: receivedUser } = response.data.data;
      localStorage.setItem('academic_auth_token', receivedToken);
      localStorage.setItem('academic_auth_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    } else {
      throw new Error(response.data?.message || 'Login failed.');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('academic_auth_token');
      localStorage.removeItem('academic_auth_user');
      setToken(null);
      setUser(null);
    }
  };

  const updateUserProfile = (newProfile) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, profile: { ...prev.profile, ...newProfile } };
      localStorage.setItem('academic_auth_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const { user } = useAuth();

  // Initialize dark mode from localStorage or system/user default
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('academic_theme');
    if (saved) return saved === 'dark';
    if (user?.darkMode !== undefined) return Boolean(user.darkMode);
    return false;
  });

  // Initialize notifications setting
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('academic_notifications');
    if (saved !== null) return saved === 'true';
    if (user?.notificationsEnabled !== undefined) return Boolean(user.notificationsEnabled);
    return true;
  });

  const [savingSettings, setSavingSettings] = useState(false);

  // Apply dark class to <html> element
  const applyThemeToDOM = useCallback((isDark) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Synchronize with DOM on mount and whenever darkMode changes
  useEffect(() => {
    applyThemeToDOM(darkMode);
    localStorage.setItem('academic_theme', darkMode ? 'dark' : 'light');
  }, [darkMode, applyThemeToDOM]);

  // Synchronize notifications with localStorage
  useEffect(() => {
    localStorage.setItem('academic_notifications', notificationsEnabled ? 'true' : 'false');
  }, [notificationsEnabled]);

  // When logged-in user changes, fetch/sync their specific backend preferences
  useEffect(() => {
    if (!user) return;

    // Use initial login data if available
    if (user.darkMode !== undefined) {
      setDarkMode(Boolean(user.darkMode));
    }
    if (user.notificationsEnabled !== undefined) {
      setNotificationsEnabled(user.notificationsEnabled !== false);
    }

    // Also fetch latest settings from backend
    const syncUserSettings = async () => {
      try {
        const res = await api.get('/user/settings');
        if (res.data?.success && res.data?.data) {
          const { darkMode: dbDark, notificationsEnabled: dbNotif } = res.data.data;
          setDarkMode(Boolean(dbDark));
          setNotificationsEnabled(dbNotif !== false);
        }
      } catch (err) {
        // Silently continue with local cached settings
      }
    };

    syncUserSettings();
  }, [user?.id]);

  // Toggle Dark Mode
  const toggleDarkMode = async () => {
    const nextVal = !darkMode;
    setDarkMode(nextVal);
    applyThemeToDOM(nextVal);

    if (user) {
      setSavingSettings(true);
      try {
        await api.put('/user/settings', { darkMode: nextVal });
      } catch (err) {
        console.error('Failed to persist dark mode setting:', err);
      } finally {
        setSavingSettings(false);
      }
    }
    return nextVal;
  };

  // Toggle Notifications
  const toggleNotifications = async () => {
    const nextVal = !notificationsEnabled;
    setNotificationsEnabled(nextVal);

    if (user) {
      setSavingSettings(true);
      try {
        await api.put('/user/settings', { notificationsEnabled: nextVal });
      } catch (err) {
        console.error('Failed to persist notification setting:', err);
      } finally {
        setSavingSettings(false);
      }
    }
    return nextVal;
  };

  // Update Settings explicitly
  const updateSettings = async (settings) => {
    setSavingSettings(true);
    try {
      if (settings.darkMode !== undefined) {
        setDarkMode(settings.darkMode);
        applyThemeToDOM(settings.darkMode);
      }
      if (settings.notificationsEnabled !== undefined) {
        setNotificationsEnabled(settings.notificationsEnabled);
      }

      if (user) {
        await api.put('/user/settings', settings);
      }
      return { success: true };
    } catch (err) {
      console.error('Failed to update settings:', err);
      return { success: false, error: err.response?.data?.message || err.message };
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        darkMode,
        notificationsEnabled,
        savingSettings,
        toggleDarkMode,
        toggleNotifications,
        updateSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;

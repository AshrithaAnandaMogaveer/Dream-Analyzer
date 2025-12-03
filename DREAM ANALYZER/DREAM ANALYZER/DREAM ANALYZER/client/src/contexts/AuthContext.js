import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Create context with a default empty object to avoid null issues
// Export the context itself as default
const AuthContext = createContext({});
export default AuthContext;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [recentActivity, setRecentActivity] = useState(null);
  const [activityLoaded, setActivityLoaded] = useState(false);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get('/api/auth/me');
          setUser(response.data);
          // Fetch recent activity once after successful auth
          if (!activityLoaded) {
            try {
              const act = await axios.get('/api/recent-activity');
              setRecentActivity(act.data?.items || []);
            } catch (e) {
              // ignore activity errors
            } finally {
              setActivityLoaded(true);
            }
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/auth/login', { email, password });
      
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      // Reset and fetch recent activity once
      setActivityLoaded(false);
      try {
        // Ensure Authorization header is present immediately on first request
        const act = await axios.get('/api/recent-activity', {
          headers: { Authorization: `Bearer ${newToken}` }
        });
        setRecentActivity(act.data?.items || []);
      } catch (_) {}
      setActivityLoaded(true);
      
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      // Prefer explicit server message, fall back to validation errors if present
      const serverData = error.response?.data;
      let message = 'Login failed';
      if (serverData) {
        if (serverData.message) message = serverData.message;
        else if (serverData.errors && Array.isArray(serverData.errors) && serverData.errors.length) {
          message = serverData.errors.map(e => e.msg || e.message).join('; ');
        }
      }
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/auth/register', userData);
      
      const { token: newToken, user: newUser } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      setActivityLoaded(false);
      try {
        const act = await axios.get('/api/recent-activity', {
          headers: { Authorization: `Bearer ${newToken}` }
        });
        setRecentActivity(act.data?.items || []);
      } catch (_) {}
      setActivityLoaded(true);
      
      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setRecentActivity(null);
      setActivityLoaded(false);
      toast.success('Logged out successfully');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      const response = await axios.put('/api/auth/profile', profileData);
      
      setUser(response.data.user);
      toast.success('Profile updated successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      await axios.post('/api/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      toast.success('Password changed successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    recentActivity,
    activityLoaded,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};















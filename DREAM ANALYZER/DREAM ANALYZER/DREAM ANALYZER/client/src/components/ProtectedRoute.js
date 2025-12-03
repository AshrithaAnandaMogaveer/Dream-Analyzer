import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { FaLock, FaSpinner } from 'react-icons/fa';
import './ProtectedRoute.css';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container">
        <motion.div
          className="loading-content"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="loading-spinner">
            <FaSpinner className="spinner-icon" />
          </div>
          <h3>Loading...</h3>
          <p>Please wait while we verify your authentication</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="protected-route-container">
        <motion.div
          className="access-denied"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="access-denied-icon">
            <FaLock />
          </div>
          <h2>Access Required</h2>
          <p>
            You need to be logged in to access this page. Please sign in or create an account to continue.
          </p>
          <div className="access-denied-actions">
            <button
              className="btn btn-primary"
              onClick={() => window.location.href = '/login'}
            >
              Sign In
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => window.location.href = '/signup'}
            >
              Create Account
            </button>
          </div>
          <p className="redirect-notice">
            You will be redirected to the login page in a few seconds...
          </p>
        </motion.div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;















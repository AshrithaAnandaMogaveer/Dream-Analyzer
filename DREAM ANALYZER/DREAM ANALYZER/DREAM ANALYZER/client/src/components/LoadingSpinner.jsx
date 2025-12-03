import React from 'react';
import { motion } from 'framer-motion';
import { FaMoon, FaSpinner } from 'react-icons/fa';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
  message = 'Loading...', 
  size = 'medium', 
  showIcon = true,
  fullScreen = false 
}) => {
  const sizeClasses = {
    small: 'spinner-small',
    medium: 'spinner-medium',
    large: 'spinner-large'
  };

  const containerClass = fullScreen ? 'loading-fullscreen' : 'loading-container';

  return (
    <motion.div
      className={containerClass}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="loading-content">
        {showIcon && (
          <motion.div
            className={`loading-icon ${sizeClasses[size]}`}
            animate={{ rotate: 360 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <FaMoon />
          </motion.div>
        )}
        
        <motion.div
          className="loading-text"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.div>
        
        <motion.div
          className="loading-dots"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0
            }}
          >
            ●
          </motion.span>
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.2
            }}
          >
            ●
          </motion.span>
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.4
            }}
          >
            ●
          </motion.span>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LoadingSpinner;

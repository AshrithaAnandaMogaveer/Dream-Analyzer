import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';
import { 
  FaMoon, 
  FaSun, 
  FaBars, 
  FaTimes, 
  FaUser, 
  FaSignOutAlt,
  FaCog,
  FaHome,
  FaComments,
  FaUsers,
  FaThumbsUp,
  FaRobot
} from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isConnected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsOpen(false);
  };

  const navItems = [
    { path: '/', label: 'Home', icon: <FaHome /> },
    { path: '/app', label: 'App', icon: <FaRobot /> },
    { path: '/community', label: 'Community', icon: <FaUsers /> },
    { path: '/feedback', label: 'Feedback', icon: <FaThumbsUp /> }
  ];

  const userMenuItems = [
    { path: '/chatbot', label: 'Dream Chatbot', icon: <FaComments />, protected: true },
    { path: '/dream-diary', label: 'Dream Diary', icon: <FaMoon />, protected: true },
    { path: '/profile', label: 'Profile', icon: <FaUser />, protected: true }
  ];

  return (
    <motion.nav
      className={`navbar ${scrolled ? 'scrolled' : ''} ${theme === 'dark' ? 'dark' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="nav-container">
        <Link to="/" className="nav-logo" onClick={() => setIsOpen(false)}>
          <FaMoon className="logo-icon" />
          <span>Dream Analyzer</span>
        </Link>

        <div className="nav-menu">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          <div
            className="ws-status"
            title={isConnected ? 'Connected to server' : 'Disconnected from server'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginRight: 8
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: isConnected ? '#10b981' : '#ef4444',
                boxShadow: isConnected ? '0 0 6px rgba(16,185,129,0.7)' : '0 0 6px rgba(239,68,68,0.7)'
              }}
            />
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{isConnected ? 'Connected' : 'Offline'}</span>
          </div>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <FaSun /> : <FaMoon />}
          </button>

          {isAuthenticated ? (
            <div className="user-menu">
              <div className="user-info">
                <div className="user-avatar">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt={user.name} />
                  ) : (
                    <FaUser />
                  )}
                </div>
                <span className="user-name">{user?.name}</span>
              </div>

              <div className="user-dropdown">
                {userMenuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="dropdown-item"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ))}
                <button
                  className="dropdown-item logout"
                  onClick={handleLogout}
                >
                  <FaSignOutAlt />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-ghost">
                Login
              </Link>
              <Link to="/signup" className="btn btn-primary">
                Sign Up
              </Link>
            </div>
          )}

          <button
            className="mobile-menu-btn"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mobile-menu-content">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`mobile-nav-link ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}

              {isAuthenticated ? (
                <>
                  {userMenuItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="mobile-nav-link"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  <button
                    className="mobile-nav-link logout"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="mobile-nav-link"
                    onClick={() => setIsOpen(false)}
                  >
                    <FaUser />
                    <span>Login</span>
                  </Link>
                  <Link
                    to="/signup"
                    className="mobile-nav-link"
                    onClick={() => setIsOpen(false)}
                  >
                    <FaUser />
                    <span>Sign Up</span>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;















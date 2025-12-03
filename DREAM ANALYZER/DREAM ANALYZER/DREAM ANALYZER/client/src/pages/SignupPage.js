import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  FaEye, 
  FaEyeSlash, 
  FaEnvelope, 
  FaLock, 
  FaUser,
  FaUserPlus,
  FaGoogle,
  FaFacebook,
  FaGithub,
  FaMoon,
  FaSun,
  FaCalendarAlt,
  FaVenusMars,
  FaBriefcase
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import './AuthPages.css';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: '',
    fieldOfWork: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);

  const { register, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (formData.age && (isNaN(formData.age) || formData.age < 13 || formData.age > 120)) {
      newErrors.age = 'Age must be between 13 and 120';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep2()) {
      return;
    }

    setIsLoading(true);
    
    // Prepare data for registration
    const registrationData = {
      name: formData.name.trim(),
      email: formData.email,
      password: formData.password,
      age: formData.age ? parseInt(formData.age) : undefined,
      gender: formData.gender || undefined,
      fieldOfWork: formData.fieldOfWork.trim() || undefined
    };

    const result = await register(registrationData);
    setIsLoading(false);

    if (result.success) {
      navigate('/app');
    }
  };

  const handleSocialSignup = (provider) => {
    toast.error(`${provider} signup coming soon!`);
  };

  const genderOptions = [
    { value: '', label: 'Prefer not to say' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'non-binary', label: 'Non-binary' }
  ];

  return (
    <div className="auth-page">
      <div className="auth-container">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="auth-header">
            <motion.div
              className="auth-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <FaMoon className="logo-icon" />
              <span>Dream Analyzer</span>
            </motion.div>
            
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <FaSun /> : <FaMoon />}
            </button>
          </div>

          <motion.div
            className="auth-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h1>Create Your Account</h1>
            <p>Join our community of dreamers and start your journey</p>

            {/* Progress Indicator */}
            <div className="progress-indicator">
              <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
                <span>1</span>
                <label>Account</label>
              </div>
              <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
                <span>2</span>
                <label>Profile</label>
              </div>
            </div>

            {/* Social Signup */}
            {step === 1 && (
              <div className="social-login">
                <button
                  className="social-btn google"
                  onClick={() => handleSocialSignup('Google')}
                >
                  <FaGoogle />
                  <span>Sign up with Google</span>
                </button>
                <button
                  className="social-btn facebook"
                  onClick={() => handleSocialSignup('Facebook')}
                >
                  <FaFacebook />
                  <span>Sign up with Facebook</span>
                </button>
                <button
                  className="social-btn github"
                  onClick={() => handleSocialSignup('GitHub')}
                >
                  <FaGithub />
                  <span>Sign up with GitHub</span>
                </button>
              </div>
            )}

            {step === 1 && <div className="divider"><span>or</span></div>}

            {/* Signup Form */}
            <form onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNext(); } : handleSubmit} className="auth-form">
              {step === 1 && (
                <>
                  <div className="form-group">
                    <label htmlFor="name">Full Name</label>
                    <div className="input-container">
                      <FaUser className="input-icon" />
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`input ${errors.name ? 'error' : ''}`}
                        placeholder="Enter your full name"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.name && <span className="error-message">{errors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <div className="input-container">
                      <FaEnvelope className="input-icon" />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`input ${errors.email ? 'error' : ''}`}
                        placeholder="Enter your email"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.email && <span className="error-message">{errors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <div className="input-container">
                      <FaLock className="input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`input ${errors.password ? 'error' : ''}`}
                        placeholder="Create a password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.password && <span className="error-message">{errors.password}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <div className="input-container">
                      <FaLock className="input-icon" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`input ${errors.confirmPassword ? 'error' : ''}`}
                        placeholder="Confirm your password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary auth-submit"
                    disabled={isLoading}
                  >
                    Next Step
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="form-group">
                    <label htmlFor="age">Age (Optional)</label>
                    <div className="input-container">
                      <FaCalendarAlt className="input-icon" />
                      <input
                        type="number"
                        id="age"
                        name="age"
                        value={formData.age}
                        onChange={handleChange}
                        className={`input ${errors.age ? 'error' : ''}`}
                        placeholder="Enter your age"
                        min="13"
                        max="120"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.age && <span className="error-message">{errors.age}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="gender">Gender (Optional)</label>
                    <div className="input-container">
                      <FaVenusMars className="input-icon" />
                      <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="input"
                        disabled={isLoading}
                      >
                        {genderOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="fieldOfWork">Field of Work/Study (Optional)</label>
                    <div className="input-container">
                      <FaBriefcase className="input-icon" />
                      <input
                        type="text"
                        id="fieldOfWork"
                        name="fieldOfWork"
                        value={formData.fieldOfWork}
                        onChange={handleChange}
                        className="input"
                        placeholder="e.g., Software Engineer, Student, Teacher"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleBack}
                      disabled={isLoading}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary auth-submit"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="spinner"></div>
                      ) : (
                        <>
                          <FaUserPlus />
                          Create Account
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>

            {/* Footer */}
            <div className="auth-footer">
              <p>
                Already have an account?{' '}
                <Link to="/login" className="auth-link">
                  Sign in here
                </Link>
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Background Animation */}
        <div className="auth-background">
          <div className="floating-shapes">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="shape"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${3 + Math.random() * 4}s`
                }}
                animate={{
                  y: [0, -30, 0],
                  rotate: [0, 180, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 4 + Math.random() * 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;















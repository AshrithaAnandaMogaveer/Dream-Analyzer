import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { 
  FaMoon, 
  FaBrain, 
  FaHeart, 
  FaUsers, 
  FaChartLine, 
  FaRobot,
  FaArrowRight,
  FaStar,
  FaQuoteLeft
} from 'react-icons/fa';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      text: "Dream Analyzer helped me understand my recurring nightmares and find peace. The AI insights were incredibly accurate!",
      author: "Sarah M.",
      rating: 5
    },
    {
      text: "The community support and expert advice have been life-changing. I finally sleep better at night.",
      author: "Michael R.",
      rating: 5
    },
    {
      text: "As a psychology student, I'm amazed by the depth of analysis. This tool is revolutionary for dream research.",
      author: "Dr. Emily Chen",
      rating: 5
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const features = [
    {
      icon: <FaBrain />,
      title: "AI-Powered Analysis",
      description: "Advanced AI interprets your dreams with personalized insights based on your profile and patterns."
    },
    {
      icon: <FaChartLine />,
      title: "Dream Analytics",
      description: "Track your dream patterns, stress levels, and sleep quality with beautiful visualizations."
    },
    {
      icon: <FaUsers />,
      title: "Community Support",
      description: "Connect with others, share experiences, and get expert advice from mental health professionals."
    },
    {
      icon: <FaHeart />,
      title: "Mental Wellness",
      description: "Integrate with meditation, yoga, and therapy resources for holistic mental health support."
    }
  ];

  const stats = [
    { number: "10K+", label: "Dreams Analyzed" },
    { number: "5K+", label: "Happy Users" },
    { number: "98%", label: "Accuracy Rate" },
    { number: "24/7", label: "AI Support" }
  ];

  return (
    <div className="homepage">
      {/* Animated Background */}
      <div className="background-animation">
        <div className="floating-shapes">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="shape"
              style={{
                left: `${Math.random() * 100}%`,
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

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <motion.div
            className="hero-content"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="hero-badge"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <FaMoon className="moon-icon" />
              <span>Unlock the Mysteries of Your Dreams</span>
            </motion.div>

            <motion.h1
              className="hero-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Dream Analyzer
              <span className="gradient-text"> AI</span>
            </motion.h1>

            <motion.p
              className="hero-description"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Discover the hidden meanings in your dreams with our advanced AI technology. 
              Get personalized insights, track patterns, and connect with a supportive community 
              of dreamers and mental health professionals.
            </motion.p>

            <motion.div
              className="hero-actions"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <button
                className="btn btn-primary launch-btn"
                onClick={() => navigate('/app')}
              >
                Launch Now
                <FaArrowRight />
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/signup')}
              >
                Get Started Free
              </button>
            </motion.div>

            <motion.div
              className="hero-stats"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  className="stat-item"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                >
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2>Why Choose Dream Analyzer?</h2>
            <p>Powerful features designed to help you understand and improve your mental wellness</p>
          </motion.div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, scale: 1.02 }}
              >
                <div className="feature-icon">
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <div className="container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2>What Our Users Say</h2>
            <p>Real stories from our community of dreamers</p>
          </motion.div>

          <motion.div
            className="testimonial-container"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.div
              key={currentTestimonial}
              className="testimonial-card"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
            >
              <FaQuoteLeft className="quote-icon" />
              <p className="testimonial-text">
                {testimonials[currentTestimonial].text}
              </p>
              <div className="testimonial-rating">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <FaStar key={i} className="star" />
                ))}
              </div>
              <div className="testimonial-author">
                - {testimonials[currentTestimonial].author}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <motion.div
            className="cta-content"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2>Ready to Explore Your Dreams?</h2>
            <p>Join thousands of users who have discovered the power of dream analysis</p>
            <div className="cta-actions">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/signup')}
              >
                Start Your Journey
                <FaArrowRight />
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => navigate('/app')}
              >
                Try Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Theme Toggle */}
      <motion.button
        className="theme-toggle"
        onClick={toggleTheme}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <FaMoon />
      </motion.button>
    </div>
  );
};

export default HomePage;















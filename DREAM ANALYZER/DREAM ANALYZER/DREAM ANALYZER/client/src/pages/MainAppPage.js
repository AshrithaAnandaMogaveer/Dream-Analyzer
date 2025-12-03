import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FaRobot, 
  FaUsers, 
  FaThumbsUp, 
  FaSignInAlt,
  FaBrain,
  FaChartLine,
  FaHeart,
  FaShieldAlt,
  FaLightbulb,
  FaArrowRight,
  FaStar,
  FaQuoteLeft,
  FaSpa,
  FaOm,
  FaLeaf,
  FaImage
} from 'react-icons/fa';
import NanoBananaImageGenerator from '../components/NanoBananaImageGenerator';
import './MainAppPage.css';

const MainAppPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [activeSection, setActiveSection] = useState('why-us');

  const features = [
    {
      icon: <FaBrain />,
      title: "AI-Powered Dream Analysis",
      description: "Our advanced AI analyzes your dreams with personalized insights based on your profile, patterns, and emotional state.",
      color: "#667eea"
    },
    {
      icon: <FaImage />,
      title: "Dream Visualization",
      description: "Transform your dreams into visual representations using our Nano Banana (Gemini) image generation.",
      color: "#4C51BF",
      component: <NanoBananaImageGenerator />
    },
    {
      icon: <FaChartLine />,
      title: "Dream Analytics & Patterns",
      description: "Track your dream patterns, stress levels, and sleep quality with beautiful visualizations and detailed reports.",
      color: "#764ba2"
    },
    {
      icon: <FaUsers />,
      title: "Community Support",
      description: "Connect with a supportive community of dreamers, mental health professionals, and wellness experts.",
      color: "#f093fb"
    },
    {
      icon: <FaHeart />,
      title: "Mental Wellness Integration",
      description: "Integrate with meditation, yoga, therapy resources, and wellness programs for holistic mental health support.",
      color: "#4facfe"
    }
  ];

  const collaborations = [
    {
      name: "Mindful Yoga Center",
      description: "Partnered with certified yoga instructors to provide dream-inspired meditation sessions",
      icon: <FaSpa />,
      color: "#ff6b6b"
    },
    {
      name: "Zen Meditation Studio",
      description: "Collaborating on guided meditation practices specifically designed for better sleep and dream recall",
      icon: <FaOm />,
      color: "#4ecdc4"
    },
    {
      name: "Wellness Institute",
      description: "Working with mental health professionals to provide evidence-based dream therapy techniques",
      icon: <FaLeaf />,
      color: "#45b7d1"
    }
  ];

  const testimonials = [
    {
      text: "Dream Analyzer has completely transformed how I understand my dreams. The AI insights are incredibly accurate and helpful.",
      author: "Sarah M.",
      role: "Psychology Student",
      rating: 5
    },
    {
      text: "The community support and expert advice have been life-changing. I finally sleep better and understand my subconscious better.",
      author: "Michael R.",
      role: "Software Engineer",
      rating: 5
    },
    {
      text: "As a therapist, I recommend this app to all my clients. It's a powerful tool for self-reflection and mental wellness.",
      author: "Dr. Emily Chen",
      role: "Licensed Therapist",
      rating: 5
    }
  ];

  const stats = [
    { number: "10,000+", label: "Dreams Analyzed", icon: <FaBrain /> },
    { number: "5,000+", label: "Active Users", icon: <FaUsers /> },
    { number: "98%", label: "Accuracy Rate", icon: <FaStar /> },
    { number: "24/7", label: "AI Support", icon: <FaRobot /> }
  ];

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/chatbot');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="main-app-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <motion.div
            className="hero-content"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="hero-text">
              <h1>
                Welcome to <span className="gradient-text">Dream Analyzer</span>
              </h1>
              <p>
                Unlock the mysteries of your dreams with AI-powered analysis, 
                community support, and personalized insights for better mental wellness.
              </p>
              <div className="hero-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleGetStarted}
                >
                  {isAuthenticated ? 'Start Analyzing Dreams' : 'Get Started Free'}
                  <FaArrowRight />
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate('/community')}
                >
                  Explore Community
                </button>
              </div>
            </div>
            <div className="hero-visual">
              <motion.div
                className="floating-cards"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <div className="card dream-card">
                  <FaBrain className="card-icon" />
                  <h3>Dream Analysis</h3>
                  <p>AI-powered insights</p>
                </div>
                <div className="card community-card">
                  <FaUsers className="card-icon" />
                  <h3>Community</h3>
                  <p>Support & sharing</p>
                </div>
                <div className="card wellness-card">
                  <FaHeart className="card-icon" />
                  <h3>Wellness</h3>
                  <p>Mental health focus</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="nav-tabs">
        <div className="container">
          <div className="tab-navigation">
            <button
              className={`tab-btn ${activeSection === 'why-us' ? 'active' : ''}`}
              onClick={() => setActiveSection('why-us')}
            >
              Why Us
            </button>
            <button
              className={`tab-btn ${activeSection === 'how-helpful' ? 'active' : ''}`}
              onClick={() => setActiveSection('how-helpful')}
            >
              How We Help
            </button>
            <button
              className={`tab-btn ${activeSection === 'collaborations' ? 'active' : ''}`}
              onClick={() => setActiveSection('collaborations')}
            >
              Collaborations
            </button>
            <button
              className={`tab-btn ${activeSection === 'testimonials' ? 'active' : ''}`}
              onClick={() => setActiveSection('testimonials')}
            >
              Testimonials
            </button>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="content-sections">
        <div className="container">
          {/* Why Us Section */}
          {activeSection === 'why-us' && (
            <motion.div
              className="section-content"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2>Why Choose Dream Analyzer?</h2>
              <div className="features-grid">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    className="feature-card"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                    whileHover={{ y: -10, scale: 1.02 }}
                  >
                    <div 
                      className="feature-icon"
                      style={{ color: feature.color }}
                    >
                      {feature.icon}
                    </div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* How We Help Section */}
          {activeSection === 'how-helpful' && (
            <motion.div
              className="section-content"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2>How We Help You</h2>
              <div className="help-grid">
                <div className="help-item">
                  <div className="help-icon">
                    <FaBrain />
                  </div>
                  <div className="help-content">
                    <h3>Personalized Dream Analysis</h3>
                    <p>
                      Our AI analyzes your dreams based on your personal profile, 
                      emotional state, and life circumstances to provide tailored insights.
                    </p>
                  </div>
                </div>
                <div className="help-item">
                  <div className="help-icon">
                    <FaChartLine />
                  </div>
                  <div className="help-content">
                    <h3>Pattern Recognition</h3>
                    <p>
                      Track recurring themes, emotions, and symbols in your dreams 
                      to understand your subconscious patterns and growth areas.
                    </p>
                  </div>
                </div>
                <div className="help-item">
                  <div className="help-icon">
                    <FaShieldAlt />
                  </div>
                  <div className="help-content">
                    <h3>Privacy & Security</h3>
                    <p>
                      Your dreams are private and secure. We use advanced encryption 
                      and never share your personal data without your explicit consent.
                    </p>
                  </div>
                </div>
                <div className="help-item">
                  <div className="help-icon">
                    <FaLightbulb />
                  </div>
                  <div className="help-content">
                    <h3>Actionable Insights</h3>
                    <p>
                      Get practical suggestions and recommendations based on your 
                      dream analysis to improve your mental wellness and sleep quality.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Collaborations Section */}
          {activeSection === 'collaborations' && (
            <motion.div
              className="section-content"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2>Our Collaborations</h2>
              <p className="section-description">
                We partner with leading mental wellness organizations to provide 
                comprehensive support for your dream journey.
              </p>
              <div className="collaborations-grid">
                {collaborations.map((collab, index) => (
                  <motion.div
                    key={index}
                    className="collaboration-card"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                    whileHover={{ y: -10, scale: 1.02 }}
                  >
                    <div 
                      className="collab-icon"
                      style={{ color: collab.color }}
                    >
                      {collab.icon}
                    </div>
                    <h3>{collab.name}</h3>
                    <p>{collab.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Testimonials Section */}
          {activeSection === 'testimonials' && (
            <motion.div
              className="section-content"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2>What Our Users Say</h2>
              <div className="testimonials-grid">
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={index}
                    className="testimonial-card"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                  >
                    <FaQuoteLeft className="quote-icon" />
                    <p className="testimonial-text">{testimonial.text}</p>
                    <div className="testimonial-rating">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <FaStar key={i} className="star" />
                      ))}
                    </div>
                    <div className="testimonial-author">
                      <strong>{testimonial.author}</strong>
                      <span>{testimonial.role}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <motion.div
            className="stats-grid"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="stat-item"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <motion.div
            className="cta-content"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2>Ready to Explore Your Dreams?</h2>
            <p>
              Join thousands of users who have discovered the power of dream analysis 
              and improved their mental wellness.
            </p>
            <div className="cta-actions">
              <button
                className="btn btn-primary"
                onClick={handleGetStarted}
              >
                {isAuthenticated ? 'Start Dream Analysis' : 'Get Started Free'}
                <FaArrowRight />
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => navigate('/feedback')}
              >
                Read Reviews
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default MainAppPage;




import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaMoon, 
  FaHeart, 
  FaGithub, 
  FaTwitter, 
  FaLinkedin, 
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaFacebook,
  FaInstagram
} from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: 'Features', href: '/app' },
      { label: 'Dream Analysis', href: '/chatbot' },
      { label: 'Community', href: '/community' },
      { label: 'Pricing', href: '/pricing' }
    ],
    support: [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Feedback', href: '/feedback' },
      { label: 'Status', href: '/status' }
    ],
    company: [
      { label: 'About Us', href: '/about' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Careers', href: '/careers' }
    ],
    resources: [
      { label: 'Blog', href: '/blog' },
      { label: 'Research', href: '/research' },
      { label: 'API Docs', href: '/docs' },
      { label: 'Partners', href: '/partners' }
    ]
  };

  const socialLinks = [
    { icon: <FaGithub />, href: 'https://github.com', label: 'GitHub' },
    { icon: <FaTwitter />, href: 'https://twitter.com', label: 'Twitter' },
    { icon: <FaLinkedin />, href: 'https://linkedin.com', label: 'LinkedIn' },
    { icon: <FaFacebook />, href: 'https://facebook.com', label: 'Facebook' },
    { icon: <FaInstagram />, href: 'https://instagram.com', label: 'Instagram' }
  ];

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          {/* Brand Section */}
          <motion.div
            className="footer-brand"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Link to="/" className="footer-logo">
              <FaMoon className="logo-icon" />
              <span>Dream Analyzer</span>
            </Link>
            <p className="footer-description">
              Unlock the mysteries of your dreams with AI-powered analysis, 
              community support, and personalized insights for better mental wellness.
            </p>
            <div className="footer-social">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                  whileHover={{ scale: 1.2, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={social.label}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Links Sections */}
          <div className="footer-links">
            {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
              <motion.div
                key={category}
                className="footer-column"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
                viewport={{ once: true }}
              >
                <h4 className="footer-column-title">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </h4>
                <ul className="footer-column-links">
                  {links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link 
                        to={link.href} 
                        className="footer-link"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <motion.div
          className="footer-contact"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="contact-item">
            <FaEnvelope className="contact-icon" />
            <span>support@dreamanalyzer.com</span>
          </div>
          <div className="contact-item">
            <FaPhone className="contact-icon" />
            <span>+1 (555) 123-4567</span>
          </div>
          <div className="contact-item">
            <FaMapMarkerAlt className="contact-icon" />
            <span>San Francisco, CA</span>
          </div>
        </motion.div>

        {/* Bottom Section */}
        <motion.div
          className="footer-bottom"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="footer-bottom-content">
            <p className="footer-copyright">
              © {currentYear} Dream Analyzer. All rights reserved.
            </p>
            <div className="footer-bottom-links">
              <Link to="/privacy" className="footer-bottom-link">Privacy</Link>
              <Link to="/terms" className="footer-bottom-link">Terms</Link>
              <Link to="/cookies" className="footer-bottom-link">Cookies</Link>
            </div>
          </div>
          <div className="footer-made-with">
            <span>Made with</span>
            <FaHeart className="heart-icon" />
            <span>for dreamers worldwide</span>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;















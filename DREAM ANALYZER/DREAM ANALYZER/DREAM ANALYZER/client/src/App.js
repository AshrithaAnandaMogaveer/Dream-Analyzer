import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';

// Pages - Lazy loaded for better performance
import HomePage from './pages/HomePage';
import MainAppPage from './pages/MainAppPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ChatbotPage from './pages/ChatbotPage';
import ChatbotPageEnhanced from './pages/ChatbotPageEnhanced';
import CommunityPage from './pages/CommunityPage';
import FeedbackPage from './pages/FeedbackPage';
import ProfilePage from './pages/ProfilePage';
import DreamDiaryPage from './pages/DreamDiaryPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';

// Styles
import './App.css';

function AppContent() {
  const location = useLocation();
  const hideFooterOnRoutes = ['/chatbot'];
  const shouldHideFooter = hideFooterOnRoutes.includes(location.pathname);

  return (
    <div className="App">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/app" element={<MainAppPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route 
            path="/chatbot" 
            element={<ChatbotPageEnhanced />} 
          />
          <Route 
            path="/chatbot-classic" 
            element={<ChatbotPage />} 
          />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dream-diary" 
            element={
              <ProtectedRoute>
                <DreamDiaryPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
      {!shouldHideFooter && <Footer />}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

function App() {
  // One-time backend health check on mount
  useEffect(() => {
    let isMounted = true;
    axios.get('/api/health').then(() => {
      // backend healthy
    }).catch(() => {
      // backend down — optional: show a subtle toast or banner
      if (isMounted) {
        console.warn('Backend appears unreachable — some features may be disabled in dev (start backend first).');
      }
    });
    return () => { isMounted = false; };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppContent />
            </Router>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;















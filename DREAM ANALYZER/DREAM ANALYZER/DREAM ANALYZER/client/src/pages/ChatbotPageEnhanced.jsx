import React, { useState, useEffect, useRef, Suspense, lazy, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { FaMicrophone, FaStop, FaPaperPlane, FaRobot, FaUser } from 'react-icons/fa';
import axios from 'axios';
import './ChatbotPageEnhanced.css';

// Lazy load heavy components
const ReactMarkdownLazy = lazy(() =>
  import('react-markdown').then(mod => ({
    default: (props) => {
      // Fallback component if ReactMarkdown fails to load
      if (typeof window === 'undefined') return <div>{props.children}</div>;
      try {
        const { default: ReactMarkdown } = mod;
        return <ReactMarkdown {...props} />;
      } catch (e) {
        console.error('Error loading ReactMarkdown:', e);
        return <div>{props.children}</div>;
      }
    }
  })).catch(() => ({
    default: ({ children }) => <div className="markdown-fallback">{children}</div>
  }))
);

const AnalyticsPanel = lazy(() => import('../components/AnalyticsPanel'));
const DreamJournal = lazy(() => import('../components/DreamJournal'));

// Safe markdown renderer with error boundary
const SafeMarkdown = ({ children, ...props }) => {
  const [plugins, setPlugins] = React.useState([]);
  // eslint-disable-next-line no-unused-vars
  const [error, _setError] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;
    
    const loadPlugins = async () => {
      try {
        // Dynamically import remark-gfm
        const gfmModule = await import('remark-gfm');
        const gfm = gfmModule.default || gfmModule;
        
        if (isMounted) {
          setPlugins([gfm]);
        }
      } catch (err) {
        console.warn('Failed to load markdown plugins:', err);
        if (isMounted) {
          _setError('Markdown features limited');
          setPlugins([]);
        }
      }
    };

    loadPlugins();
    return () => {
      isMounted = false;
    };
  }, []);

  try {
    return (
      <Suspense fallback={<div className="markdown-loading">Loading content...</div>}>
        <ReactMarkdownLazy remarkPlugins={plugins} {...props}>
          {String(children || '')}
        </ReactMarkdownLazy>
      </Suspense>
    );
  } catch (err) {
    console.error('Error rendering markdown:', err);
    return <div className="markdown-error">{String(children || '')}</div>;
  }
};

// Configure axios base URL
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ChatbotPageEnhanced = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [_error, setError] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastDreamText, setLastDreamText] = useState('');
  const lastGenAtRef = useRef(0);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    // Welcome message
    setMessages([{
      id: Date.now(),
      type: 'ai',
      content: user 
        ? '🌙 Hello! Share your dream with me, and I\'ll provide a detailed analysis with insights and suggestions.' 
        : '🌙 Welcome! Please log in to unlock personalized dream analysis and save your dream history.',
      timestamp: new Date()
    }]);
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not available');
      return;
    }
    
    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      toast.error('Could not start voice input');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const messageText = (inputValue || '').trim();
    if (!messageText) return;

    // Immediately add user's message locally
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setLastDreamText(messageText);
    setInputValue('');
    setIsAnalyzing(true);

    // Check authentication after showing user's message
    if (!user) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        content: '🌙 Please log in to access dream analysis features.',
        timestamp: new Date().toISOString()
      }]);
      setIsAnalyzing(false);
      return;
    }

    try {
      // emit typing/presence if socket exists and is connected
      if (socket && socket.connected) {
        try {
          socket.emit('typing', { userId: user?._id, textPreview: messageText.slice(0,100) });
        } catch (error) {
          console.warn('Failed to emit typing event:', error);
        }
      }

      // Call chatbot analyze endpoint with 2-minute timeout for LM Studio
      const { data } = await axios.post('/api/chatbot/analyze', {
        text: messageText,
        userId: user._id
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        timeout: 120000 // 2 minutes - needed for local LLM processing
      });

      // backend should return an object with summary, analysis, optional imageUrl
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: data?.summary || 'Analysis completed.',
        timestamp: new Date().toISOString(),
        analysis: data
      };

      setMessages(prev => {
        const updated = [...prev, aiMessage];
        localStorage.setItem('chatMessages', JSON.stringify(updated));
        return updated;
      });

      setCurrentAnalysis(data);
      setRefreshKey(k => k + 1);

      // Auto-save to Dream Diary (moved to separate effect that depends on currentAnalysis)
      // This keeps the chat flow responsive

    } catch (err) {
      console.error('❌ Analysis error:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        data: err.response?.data
      });
      
      let errorMsg = 'Could not analyze your dream right now. Try again later.';
      
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMsg = 'Request timed out. Please try again.';
      } else if (err.response?.status === 500) {
        errorMsg = err.response?.data?.message || err.response?.data?.error || 'Server error. Please try again.';
      } else if (err.response?.status === 401) {
        errorMsg = 'Please log in again to analyze dreams.';
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      }
      
      setMessages(prev => [...prev, {
        id: Date.now()+2, 
        type: 'ai',
        content: '⚠️ ' + errorMsg,
        timestamp: new Date().toISOString()
      }]);
      
      toast.error(errorMsg);
    } finally {
      setIsAnalyzing(false);
    }
  }, [inputValue, user, socket]);

  const handleGenerateImage = useCallback(async () => {
    // Throttle button clicks (1s)
    const now = Date.now();
    if (now - (lastGenAtRef.current || 0) < 1000) return;
    lastGenAtRef.current = now;

    const userPrompt = (lastDreamText || currentAnalysis?.summary || '').trim();
    if (!userPrompt) {
      setError('Please describe your dream first');
      toast.error('Please describe your dream first');
      return;
    }

    setError(null);
    setIsGeneratingImage(true);
    const token = localStorage.getItem('token');
    
    // Show loading message immediately
    const loadingId = `loading-${Date.now()}`;
    setMessages(prev => [
      ...prev.filter(m => !m.isLoading),
      {
        id: loadingId,
        type: 'ai',
        content: '🎨 Generating your dream visualization...',
        timestamp: new Date().toISOString(),
        isLoading: true
      }
    ]);

    const MAX_RETRIES = 2;
    let retryCount = 0;
    let lastError = null;

    const attemptGeneration = async () => {
      try {
        const response = await axios.post(
          '/api/generate-image/generate',
          { prompt: userPrompt },
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            timeout: 120000 // 120 second timeout
          }
        );

        if (!response.data || !response.data.imageUrl) {
          throw new Error('No image data received');
        }

        // Construct the full URL
        const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const imageUrl = response.data.imageUrl.startsWith('http') 
          ? response.data.imageUrl 
          : `${baseUrl}${response.data.imageUrl}`;

        // Remove loading message and add the image
        setMessages(prev => [
          ...prev.filter(m => m.id !== loadingId),
          {
            id: `img-${Date.now()}`,
            type: 'ai',
            content: 'Here is your dream visualization:',
            timestamp: new Date().toISOString(),
            imageUrl: imageUrl,
            imageData: {
              service: 'stability-ai',
              cached: false,
              fallback: false
            }
          }
        ]);

        setIsGeneratingImage(false);
        return;
      } catch (error) {
        lastError = error;
        
        // Don't retry if it's a client error (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }

        if (retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = 1000 * Math.pow(2, retryCount); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptGeneration();
        }
        throw error;
      }
    };

    try {
      await attemptGeneration();
    } catch (error) {
      console.error('Image generation failed after retries:', error);
      
      // Remove loading message and show error
      setMessages(prev => [
        ...prev.filter(m => m.id !== loadingId),
        {
          id: `error-${Date.now()}`,
          type: 'ai',
          content: 'Sorry, I was unable to generate an image for your dream. Please try again later.',
          timestamp: new Date().toISOString()
        }
      ]);
      
      toast.error('Failed to generate image. Please try again.', {
        duration: 5000,
        style: {
          background: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          padding: '12px',
          borderRadius: '4px',
          maxWidth: '100%',
          fontSize: '14px'
        }
      });
    } finally {
      setIsGeneratingImage(false);
      // Ensure any remaining loading messages are removed
      setMessages(prev => prev.filter(m => !m.isLoading));
    }
  }, [lastDreamText, currentAnalysis]);


  // Speech recognition functions are defined above

  // Section component is defined inline in the JSX

  return (
    <div className="chatbot-page-enhanced">
      <div className="chatbot-grid">
        {/* Left: Analytics Panel */}
        <Suspense fallback={<div>Loading analytics...</div>}>
          <AnalyticsPanel key={`analytics-${refreshKey}`} />
        </Suspense>

        {/* Center: Chat Interface */}
        <div className="chat-panel">
          <div className="chat-header">
            <h2>🤖 Dream Analysis Chat</h2>
            {currentAnalysis && (
              <div className="chat-header-actions">
                <button 
                  className="generate-image-btn"
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage}
                >
                  {isGeneratingImage ? '🎨 Generating...' : '🎨 Generate Visual'}
                </button>
              </div>
            )}
          </div>

          <div className="messages-container">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                className={`message ${msg.type}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="message-icon">
                  {msg.type === 'user' ? <FaUser /> : <FaRobot />}
                </div>
                <div className="message-content">
                  <p>{msg.content}</p>
                  
                  {(msg.imageUrl || msg.imageDataUrl) && (
                    <div className="message-image">
                      <img 
                        src={msg.imageUrl || msg.imageDataUrl} 
                        alt="Dream visualization" 
                        crossOrigin="anonymous"
                        onError={(e) => {
                          // try dataUrl fallback if available
                          if (msg.imageDataUrl && e.currentTarget.src !== msg.imageDataUrl) {
                            e.currentTarget.src = msg.imageDataUrl;
                            return;
                          }
                          // else final fallback SVG
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM4ODgiPkltYWdlIHVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                        }}
                        style={{ 
                          maxWidth: '100%', 
                          borderRadius: '12px', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                        }} 
                      />
                      {msg.imageData && (
                        <div style={{ 
                          marginTop: '8px', 
                          fontSize: '12px', 
                          color: '#6b7280',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          alignItems: 'center'
                        }}>
                          {msg.imageData.cached && <span>💾 Cached</span>}
                          {msg.imageData.fallback && <span>🔄 Fallback</span>}
                          <span>Service: {msg.imageData.service}</span>
                          {msg.imageData.message && <span>• {msg.imageData.message}</span>}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {msg.analysis && (
                    <div className="analysis-details">
                      {msg.analysis.themes && msg.analysis.themes.length > 0 && (
                        <div className="detail-section">
                          <strong>Themes:</strong>
                          <div className="themes-list">
                            {msg.analysis.themes.map((theme, i) => (
                              <span key={i} className="theme-tag">{theme}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {msg.analysis.emotions && (
                        <div className="detail-section">
                          <strong>Emotions Detected:</strong>
                          <div className="emotions-grid">
                            {Object.entries(msg.analysis.emotions)
                              .filter(([_, val]) => val > 0.1)
                              .map(([emotion, value]) => (
                                <div key={emotion} className="emotion-item">
                                  <span>{emotion}</span>
                                  <span className="emotion-value">{Math.round(value * 100)}%</span>
                                </div>
                              ))}
                          </div>
                          {/* Emotions Explanation panel directly under charts */}
                          <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className="emotions-explanation"
                            style={{
                              marginTop: 10,
                              maxHeight: 180,
                              overflowY: 'auto',
                              padding: '10px 12px',
                              borderRadius: 12,
                              background: 'linear-gradient(180deg, rgba(250,250,255,0.8), rgba(245,245,255,0.6))',
                              border: '1px solid rgba(0,0,0,0.06)'
                            }}
                          >
                            <strong style={{ display: 'block', marginBottom: 6 }}>Emotions Explanation</strong>
                            <div style={{ color: '#6b7280', lineHeight: 1.6 }}>
                              <p style={{ marginBottom: 8 }}>{msg.analysis.interpretation}</p>
                              {/* Deterministic heuristics inspired by dream-interpretation */}
                              {(() => {
                                const themes = msg.analysis.themes || [];
                                const stress = msg.analysis.stressScore || 0;
                                const happy = msg.analysis.happinessScore || 0;
                                const emo = msg.analysis.emotions || {};
                                const dominant = Object.entries(emo).sort((a,b) => b[1]-a[1])[0]?.[0] || 'calmness';
                                const parts = [];
                                if (themes.length) parts.push(`Themes center on ${themes.slice(0,3).join(', ')}.`);
                                parts.push(`Dominant emotion appears to be ${dominant}.`);
                                parts.push(`Stress score is ${stress}/100 and happiness score is ${happy}/100, suggesting ${happy > stress ? 'generally positive processing' : 'some tension or unresolved processing'}.`);
                                if (themes.includes('water')) parts.push('Water often maps to emotions; consider journaling feelings that surfaced.');
                                if (themes.includes('work')) parts.push('Work themes hint at workload or boundaries; brief decompression before sleep may help.');
                                if ((emo.fear||0) > 0.3) parts.push('Elevated fear suggests grounding techniques (box-breathing, 4-7-8) before bedtime.');
                                return <p>{parts.join(' ')}</p>;
                              })()}
                            </div>
                          </motion.div>
                        </div>
                      )}
                      
                      {msg.analysis && (msg.analysis.sections || msg.analysis.interpretationDetails) && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="interpretation-panel"
                          style={{
                            marginTop: 14,
                            maxHeight: 400,
                            overflowY: 'auto',
                            padding: '14px 16px',
                            borderRadius: 14,
                            background: 'linear-gradient(180deg, rgba(250,250,255,0.85), rgba(240,245,255,0.7))',
                            border: '1px solid rgba(0,0,0,0.06)'
                          }}
                        >
                          <strong style={{ display: 'block', marginBottom: 12, fontSize: 18, color: '#2d3748', fontWeight: 600 }}>🌙 Dream Interpretation</strong>
                          <div style={{ color: '#4a5568', lineHeight: 1.7, fontSize: 15 }}>
                            {(() => {
                              const s = msg.analysis.sections || null;
                              const d = msg.analysis.interpretationDetails || {};
                              const Section = ({ title, children, icon = null, className = '' }) => (
                                <div style={{ 
                                  marginBottom: 20,
                                  padding: '18px',
                                  backgroundColor: 'white',
                                  borderRadius: '10px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                  borderLeft: '4px solid #4f46e5',
                                  wordWrap: 'break-word',
                                  overflowWrap: 'break-word',
                                  ...(className === 'actionable' ? {
                                    backgroundColor: '#f0f9ff',
                                    borderLeftColor: '#0ea5e9'
                                  } : {})
                                }}>
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    marginBottom: '12px',
                                    color: '#2d3748',
                                    fontWeight: 600,
                                    fontSize: '15px'
                                  }}>
                                    {icon && <span style={{ marginRight: '8px' }}>{icon}</span>}
                                    {title}
                                  </div>
                                  <div style={{ 
                                    color: '#4a5568', 
                                    fontSize: '14px', 
                                    lineHeight: '1.8',
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word',
                                    whiteSpace: 'pre-wrap'
                                  }}>
                                    {children}
                                  </div>
                                </div>
                              );

                              // Prefer new sections shape in exact order
                              if (s) {
                                return (
                                  <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                                    {/* 1. Your Dream */}
                                    <Section title="Your Dream" icon="🌙">
                                      <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', fontStyle: 'italic', borderLeft: '3px solid #e2e8f0' }}>
                                        <SafeMarkdown>{s.yourDream}</SafeMarkdown>
                                      </div>
                                    </Section>
                                    {/* 2. Introduction */}
                                    {s.introduction && s.introduction.length > 20 && (
                                      <Section title="Introduction" icon="🔍"><SafeMarkdown>{s.introduction}</SafeMarkdown></Section>
                                    )}
                                    {/* 3. Overview */}
                                    {s.overview && s.overview.length > 20 && (
                                      <Section title="Overview" icon="📜"><SafeMarkdown>{s.overview}</SafeMarkdown></Section>
                                    )}
                                    {/* 4. Key Symbols & Elements */}
                                    {Array.isArray(s.keySymbolsAndElements) && s.keySymbolsAndElements.length > 0 && (
                                      <Section title="Key Symbols & Elements" icon="🔑">
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginTop: '8px' }}>
                                          {s.keySymbolsAndElements.slice(0,8).map((it, idx) => (
                                            <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #818cf8', fontSize: '13.5px', lineHeight: '1.5' }}>
                                              <div style={{ fontWeight: 600, color: '#4f46e5', marginBottom: '4px' }}>{it.symbol}</div>
                                              <div style={{ color: '#4b5563' }}>{it.meaning || ''}</div>
                                            </div>
                                          ))}
                                        </div>
                                      </Section>
                                    )}
                                    {/* 5. Psychological Interpretation */}
                                    {s.psychologicalInterpretation && s.psychologicalInterpretation.length > 30 && (
                                      <Section title="Psychological Interpretation" icon="🧠"><SafeMarkdown>{s.psychologicalInterpretation}</SafeMarkdown></Section>
                                    )}
                                    {/* 6. Cultural Context */}
                                    {s.culturalContext && s.culturalContext.length > 20 && (
                                      <Section title="Cultural Context" icon="🌍"><SafeMarkdown>{s.culturalContext}</SafeMarkdown></Section>
                                    )}
                                    {/* 7. Connections to Waking Life */}
                                    {s.connectionsToWakingLife && s.connectionsToWakingLife.length > 20 && (
                                      <Section title="Connections to Waking Life" icon="🔗"><SafeMarkdown>{s.connectionsToWakingLife}</SafeMarkdown></Section>
                                    )}
                                    {/* 8. Summary & Advice */}
                                    {s.summaryAndAdvice && s.summaryAndAdvice.length > 20 && (
                                      <Section title="Summary & Advice" icon="💡" className="summary">
                                        <div style={{ backgroundColor: '#eff6ff', padding: '14px 16px', borderRadius: '8px', borderLeft: '3px solid #60a5fa', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                          <SafeMarkdown>{s.summaryAndAdvice}</SafeMarkdown>
                                        </div>
                                      </Section>
                                    )}
                                    <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                                      Dream analysis is for entertainment purposes only. Consider consulting a professional for serious concerns.
                                    </div>
                                  </div>
                                );
                              }
                              // Back-compat rendering
                              return (
                                <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                                  {/* Fallback to old interpretationDetails keys */}
                                  {d.yourDream && (<Section title="Your Dream" icon="🌙"><SafeMarkdown>{d.yourDream}</SafeMarkdown></Section>)}
                                  {d.introduction && (<Section title="Introduction" icon="🔍"><SafeMarkdown>{d.introduction}</SafeMarkdown></Section>)}
                                  {d.overview && (<Section title="Overview" icon="📜"><SafeMarkdown>{d.overview}</SafeMarkdown></Section>)}
                                  {Array.isArray(d.keySymbolsAndElements) && d.keySymbolsAndElements.length > 0 && (
                                    <Section title="Key Symbols & Elements" icon="🔑">
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginTop: '8px' }}>
                                        {d.keySymbolsAndElements.slice(0,8).map((it, idx) => (
                                          <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #818cf8', fontSize: '13.5px', lineHeight: '1.5' }}>
                                            <div style={{ fontWeight: 600, color: '#4f46e5', marginBottom: '4px' }}>{it.symbol}</div>
                                            <div style={{ color: '#4b5563' }}>{it.meaning || ''}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </Section>
                                  )}
                                  {d.psychologicalInterpretations && (<Section title="Psychological Interpretation" icon="🧠"><SafeMarkdown>{d.psychologicalInterpretations}</SafeMarkdown></Section>)}
                                  {d.culturalContext && (<Section title="Cultural Context" icon="🌍"><SafeMarkdown>{d.culturalContext}</SafeMarkdown></Section>)}
                                  {d.connectionsToWakingLife && (<Section title="Connections to Waking Life" icon="🔗"><SafeMarkdown>{d.connectionsToWakingLife}</SafeMarkdown></Section>)}
                                  {d.summaryAndInsights && (
                                    <Section title="Summary & Advice" icon="💡" className="summary">
                                      <div style={{ backgroundColor: '#eff6ff', padding: '14px 16px', borderRadius: '8px', borderLeft: '3px solid #60a5fa' }}>
                                        <SafeMarkdown>{d.summaryAndInsights}</SafeMarkdown>
                                      </div>
                                    </Section>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </motion.div>
                      )}

                      {(() => {
                        const happy = (msg.analysis.emotions?.happiness ?? msg.analysis.emotions?.happinessPct ?? msg.analysis.happinessScore ?? 0);
                        const stress = (msg.analysis.emotions?.stress ?? msg.analysis.emotions?.stressPct ?? msg.analysis.stressScore ?? 0);
                        return (
                          <div className="scores-section">
                            <div className="score-box happiness">
                              <span className="score-label">😊 Happiness</span>
                              <span className="score-value">{happy}</span>
                            </div>
                            <div className="score-box stress">
                              <span className="score-label">😰 Stress</span>
                              <span className="score-value">{stress}</span>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {(msg.analysis.remedies && msg.analysis.remedies.length > 0) || (msg.analysis.suggestions && msg.analysis.suggestions.length > 0) ? (
                        <div className="detail-section" style={{ 
                          marginTop: '20px',
                          padding: '18px',
                          backgroundColor: '#f0fdf4',
                          borderRadius: '10px',
                          borderLeft: '4px solid #22c55e',
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word'
                        }}>
                          <strong style={{ 
                            display: 'block',
                            marginBottom: '12px',
                            color: '#2d3748',
                            fontSize: '15px',
                            fontWeight: 600
                          }}>✨ Suggestions:</strong>
                          <ul className="suggestions-list" style={{
                            margin: 0,
                            paddingLeft: '20px',
                            color: '#4a5568',
                            fontSize: '14px',
                            lineHeight: '1.8'
                          }}>
                            {(msg.analysis.remedies || msg.analysis.suggestions || []).map((sug, i) => (
                              <li key={i} style={{ 
                                marginBottom: '8px',
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word'
                              }}>{sug}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {/* Structured interpretation panel rendered above using interpretationDetails */}
                    </div>
                  )}
                  
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </motion.div>
            ))}
            
            {isAnalyzing && (
              <div className="typing-indicator">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-form" onSubmit={handleSubmit}>
            <button
              type="button"
              className={`voice-btn ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isRecording ? <FaStop /> : <FaMicrophone />}
            </button>
            
            <input
              type="text"
              placeholder="Describe your dream..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isAnalyzing}
              aria-label="Dream description input"
            />
            
            <button 
              type="submit" 
              className="send-btn"
              disabled={!inputValue.trim() || isAnalyzing}
              aria-label="Send message"
            >
              <FaPaperPlane />
            </button>
          </form>
        </div>

        {/* Right: Dream Journal */}
        <Suspense fallback={<div>Loading journal...</div>}>
          <DreamJournal key={`journal-${refreshKey}`} />
        </Suspense>
      </div>
    </div>
  );
};

export default ChatbotPageEnhanced;

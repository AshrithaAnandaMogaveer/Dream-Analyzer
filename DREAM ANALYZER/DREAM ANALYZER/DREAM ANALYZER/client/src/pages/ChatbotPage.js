import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaMicrophone, 
  FaStop, 
  FaPaperPlane, 
  FaRobot, 
  FaUser, 
  FaMoon,
  FaChartLine,
  FaHeart,
  FaSave,
  FaTrash,
  FaDownload,
  FaShare,
  FaLightbulb,
  FaBrain,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import axios from 'axios';
import './ChatbotPage.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const ChatbotPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasProvisional, setHasProvisional] = useState(false);
  const [dreamData, setDreamData] = useState(null);
  const [levelsHistory, setLevelsHistory] = useState([]); // {happiness, stress, t}
  const [imageBase64, setImageBase64] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showImageInAnalytics, setShowImageInAnalytics] = useState(false);
  const [currentDreamText, setCurrentDreamText] = useState('');
  const [fullAnalysisData, setFullAnalysisData] = useState(null);
  const [showDiary, setShowDiary] = useState(false);
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [autoGenerateImage, setAutoGenerateImage] = useState(false); // Changed to false - manual only
  const [generatedImages, setGeneratedImages] = useState([]);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initialize speech recognition
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

    // Load diary entries from localStorage
    const savedEntries = localStorage.getItem('dreamDiary');
    if (savedEntries) {
      setDiaryEntries(JSON.parse(savedEntries));
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Gate: if not logged in, show polite prompt in chat
    if (!user) {
      const userMsg = {
        id: Date.now(),
        type: 'user',
        content: inputValue,
        timestamp: new Date()
      };
      const aiMsg = {
        id: Date.now() + 1,
        type: 'ai',
        content: '🌙 Hello! I\'d love to help you analyze your dreams, but I need you to create an account or log in first. This helps me provide personalized insights based on your unique dream patterns and history. Please sign up or log in to unlock the full dream analysis experience!',
        timestamp: new Date(),
        requiresAuth: true
      };
      setMessages(prev => [...prev, userMsg, aiMsg]);
      setInputValue('');
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsAnalyzing(true);

    setHasProvisional(false);

    try {
      // Store the current dream text for image generation
      setCurrentDreamText(inputValue);

      // Fire both requests concurrently to reduce perceived latency
      const extractPromise = axios.post('/api/analytics/extract', { text: inputValue }, { timeout: 10000 });
      const analyzePromise = axios.post('/api/dreams/chat-analyze', {
        content: inputValue,
        userId: user._id
      }, { timeout: 20000 });

      // Update charts as soon as extraction returns
      extractPromise
        .then((extractRes) => {
          const { happiness = 5, stress = 5, rationale = '' } = extractRes.data || {};
          setLevelsHistory(prev => [...prev, {
            happiness,
            stress,
            t: new Date().toLocaleTimeString(),
            dreamSnippet: inputValue.substring(0, 50) + '...'
          }]);
        })
        .catch((err) => {
          console.warn('Extract analytics failed (non-blocking):', err?.message || err);
        });

      // Await analysis result
      const analysisRes = await analyzePromise;
      const analysis = analysisRes.data;
      
      // Store full analysis for image generation and analytics display
      const fullAnalysis = {
        interpretation: analysis.interpretation,
        suggestions: analysis.suggestions || [],
        emotionalInsights: analysis.emotionalInsights,
        mentalState: analysis.mentalState || '',
        symbolism: analysis.symbolism || [],
        mood: analysis.mood || "neutral",
        intensity: analysis.intensity || 7,
        patterns: analysis.patterns || [],
        confidence: analysis.confidence || 75,
        detailedAnalysis: analysis.detailedAnalysis || null,
        dreamText: inputValue,
        timestamp: new Date()
      };

      setFullAnalysisData(fullAnalysis);

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        content: analysis.interpretation || 'Analysis complete.',
        timestamp: new Date(),
        analysis: fullAnalysis
      }]);
      setHasProvisional(false);
      setDreamData(fullAnalysis);

      // Don't auto-generate - user must click button
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Could not analyze your dream right now. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateAIResponse = (input) => {
    const responses = [
      "Thank you for sharing your dream. Let me analyze this for you...",
      "That's a fascinating dream! I can see several interesting elements...",
      "Your dream reveals some important insights about your current state...",
      "This dream pattern suggests some interesting subconscious themes...",
      "I notice some recurring symbols in your dream that are worth exploring..."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const saveToDiary = () => {
    if (dreamData) {
      const newEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        content: messages[messages.length - 2]?.content || '',
        analysis: dreamData,
        mood: dreamData.mood,
        intensity: dreamData.intensity
      };

      const updatedEntries = [...diaryEntries, newEntry];
      setDiaryEntries(updatedEntries);
      localStorage.setItem('dreamDiary', JSON.stringify(updatedEntries));
    }
  };

  const deleteDiaryEntry = (id) => {
    const updatedEntries = diaryEntries.filter(entry => entry.id !== id);
    setDiaryEntries(updatedEntries);
    localStorage.setItem('dreamDiary', JSON.stringify(updatedEntries));
  };

  const exportDiary = () => {
    const dataStr = JSON.stringify(diaryEntries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dream-diary.json';
    link.click();
  };

  const generateImageForDream = async (dreamText, analysis) => {
    try {
      setIsGeneratingImage(true);
      
      // Generate image based on the dream text and analysis
      const imagePrompt = analysis 
        ? `${dreamText}. Mood: ${analysis.mood}. Symbols: ${analysis.symbolism?.join(', ') || 'abstract'}. Emotional tone: ${analysis.emotionalInsights}`
        : dreamText;

      const res = await axios.post('/api/dreams/image', { 
        text: imagePrompt,
        analysis: analysis 
      });
      
      const newImage = {
        id: Date.now(),
        imageBase64: res.data?.imageBase64 || null,
        dreamText: dreamText,
        analysis: analysis,
        timestamp: new Date()
      };
      
      setGeneratedImages(prev => [...prev, newImage]);
      setImageBase64(res.data?.imageBase64 || null);
      setShowImageInAnalytics(true);
    } catch (e) {
      console.error('Image generation error:', e);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!user) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        content: '🎨 Image generation is available for logged-in users. Please create an account or log in to visualize your dreams!',
        timestamp: new Date(),
        requiresAuth: true
      }]);
      return;
    }

    if (!currentDreamText || currentDreamText.trim().length < 5) {
      alert('Please describe your dream in the chat first!');
      return;
    }

    await generateImageForDream(currentDreamText, fullAnalysisData);
  };

  const chartData = {
    labels: levelsHistory.length > 0 ? levelsHistory.map(p => p.t) : [],
    datasets: [
      {
        label: 'Happiness',
        data: levelsHistory.length > 0 ? levelsHistory.map(p => p.happiness) : [],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.2)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7
      },
      {
        label: 'Stress',
        data: levelsHistory.length > 0 ? levelsHistory.map(p => p.stress) : [],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.2)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': ' + context.parsed.y + '/10';
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        min: 0,
        ticks: {
          stepSize: 1,
          font: {
            size: 11
          }
        },
        title: {
          display: true,
          text: 'Level (1-10)',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        ticks: {
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 0
        },
        title: {
          display: true,
          text: 'Time',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          display: false
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  return (
    <div className="chatbot-page">
      <div className="chatbot-container">
        {/* Header */}
        <div className="chatbot-header">
          <div className="header-left">
            <FaRobot className="header-icon" />
            <div>
              <h1>Dream Analyzer AI</h1>
              <p>Share your dreams and get personalized insights</p>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowDiary(!showDiary)}
            >
              {showDiary ? <FaEyeSlash /> : <FaEye />}
              {showDiary ? 'Hide Diary' : 'Show Diary'}
            </button>
          </div>
        </div>

        <div className="chatbot-content">
          {/* Main Chat Area */}
          <div className={`chat-area ${showDiary ? 'with-diary' : ''}`}>
            {/* Tabs */}
            <div className="chat-tabs">
              <button
                className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                <FaRobot />
                Chat
              </button>
              <button
                className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                <FaChartLine />
                Analytics
              </button>
            </div>

            {/* Chat Messages */}
            {activeTab === 'chat' && (
              <div className="messages-container">
                <div className="messages">
                  {messages.length === 0 && (
                    <div className="welcome-message">
                      <FaMoon className="welcome-icon" />
                      <h3>Welcome to Dream Analyzer!</h3>
                      <p>Share your dreams with me and I'll help you understand their meaning.</p>
                      <div className="welcome-tips">
                        <div className="tip">
                          <FaLightbulb />
                          <span>Be as detailed as possible when describing your dream</span>
                        </div>
                        <div className="tip">
                          <FaHeart />
                          <span>Include your emotions and feelings during the dream</span>
                        </div>
                        <div className="tip">
                          <FaBrain />
                          <span>Mention any recurring themes or symbols</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      className={`message ${message.type}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="message-avatar">
                        {message.type === 'user' ? <FaUser /> : <FaRobot />}
                      </div>
                      <div className="message-content">
                        <div className="message-text">{message.content}</div>
                        <div className="message-time">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                        {message.requiresAuth && (
                          <div className="auth-prompt-buttons">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => window.location.href = '/login'}
                            >
                              Log In
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => window.location.href = '/signup'}
                            >
                              Sign Up
                            </button>
                          </div>
                        )}
                        {message.analysis && (
                          <div className="message-analysis">
                            <h4>✨ Dream Analysis:</h4>
                            <p>{message.analysis.interpretation}</p>
                            {message.analysis.emotionalInsights && (
                              <div className="emotional-insights">
                                <h5>💭 Emotional Insights:</h5>
                                <p>{message.analysis.emotionalInsights}</p>
                              </div>
                            )}
                            <div className="analysis-suggestions">
                              <h5>💡 Suggestions:</h5>
                              <ul>
                                {message.analysis.suggestions.map((suggestion, index) => (
                                  <li key={index}>{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                            {message.analysis.patterns && message.analysis.patterns.length > 0 && (
                              <div className="analysis-patterns">
                                <h5>🔍 Patterns Detected:</h5>
                                <div className="pattern-tags">
                                  {message.analysis.patterns.map((pattern, index) => (
                                    <span key={index} className="pattern-tag">{pattern}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="analysis-meta">
                              <span className="mood">Mood: {message.analysis.mood}</span>
                              <span className="intensity">Intensity: {message.analysis.intensity}/10</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {isAnalyzing && (
                    <motion.div
                      className="message ai analyzing"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="message-avatar">
                        <FaRobot />
                      </div>
                      <div className="message-content">
                        <div className="analyzing-indicator">
                          <div className="spinner"></div>
                          <span>Analyzing your dream...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="input-area">
                  <div className="input-container">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={user ? "Describe your dream..." : "Preview mode - Describe your dream (login required for analysis)..."}
                      className="message-input"
                      disabled={isAnalyzing}
                    />
                    <div className="input-actions">
                      <button
                        type="button"
                        className={`voice-btn ${isRecording ? 'recording' : ''}`}
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isAnalyzing}
                        title={user ? "Voice input" : "Login required for voice input"}
                      >
                        {isRecording ? <FaStop /> : <FaMicrophone />}
                      </button>
                      <button
                        type="submit"
                        className="send-btn"
                        disabled={!inputValue.trim() || isAnalyzing}
                      >
                        <FaPaperPlane />
                      </button>
                    </div>
                  </div>
                  {user && messages.length > 0 && (
                    <div className="input-extra-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={handleGenerateImage}
                        disabled={isGeneratingImage || messages.length === 0}
                      >
                        {isGeneratingImage ? '🎨 Generating...' : '🎨 Generate Dream Image'}
                      </button>
                      <label className="auto-generate-toggle">
                        <input
                          type="checkbox"
                          checked={autoGenerateImage}
                          onChange={(e) => setAutoGenerateImage(e.target.checked)}
                        />
                        <span>Auto-generate images</span>
                      </label>
                    </div>
                  )}
                </form>

                {/* Generated Images Display Below Chat with Detailed Interpretation */}
                {user && generatedImages.length > 0 && (
                  <div className="generated-images-section">
                    <h4>🎨 Dream Visualization & Comprehensive Interpretation</h4>
                    {generatedImages.slice().reverse().map((img, index) => (
                      <motion.div
                        key={img.id}
                        className="dream-visualization-block"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                      >
                        <div className="visualization-grid">
                          {/* Left: Image */}
                          <div className="visualization-image-section">
                            {img.imageBase64 ? (
                              <div className="image-wrapper-large">
                                <img 
                                  src={`data:image/png;base64,${img.imageBase64}`} 
                                  alt="Dream Visualization" 
                                  className="generated-dream-image-large"
                                />
                                {isGeneratingImage && index === 0 && (
                                  <div className="image-loading-overlay">
                                    <div className="spinner"></div>
                                    <span>Generating visualization...</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="image-placeholder-large">
                                <div className="spinner"></div>
                                <p>Generating your dream visualization...</p>
                              </div>
                            )}
                            <div className="image-meta-footer">
                              <span className="meta-badge mood-badge">{img.analysis?.mood || 'neutral'}</span>
                              <span className="meta-badge intensity-badge">
                                Intensity: {img.analysis?.intensity || 7}/10
                              </span>
                              <span className="image-timestamp">
                                {new Date(img.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>

                          {/* Right: Detailed Interpretation */}
                          <div className="detailed-interpretation-section">
                            <h5 className="interpretation-title">📚 Complete Dream Interpretation</h5>
                            
                            {img.analysis?.detailedAnalysis ? (
                              <>
                                {/* Introduction */}
                                <div className="interpretation-block">
                                  <h6>🌟 Introduction</h6>
                                  <p>{img.analysis.detailedAnalysis.introduction}</p>
                                </div>

                                {/* Overview */}
                                <div className="interpretation-block">
                                  <h6>📋 Dream Overview</h6>
                                  <p>{img.analysis.detailedAnalysis.overview}</p>
                                </div>

                                {/* Key Symbols */}
                                {img.analysis.detailedAnalysis.keySymbols && img.analysis.detailedAnalysis.keySymbols.length > 0 && (
                                  <div className="interpretation-block">
                                    <h6>🔮 Key Symbols & Elements</h6>
                                    <div className="symbols-explanation">
                                      {img.analysis.detailedAnalysis.keySymbols.map((sym, idx) => (
                                        <div key={idx} className="symbol-item">
                                          <strong>{sym.symbol}:</strong> {sym.meaning}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Cultural Context */}
                                <div className="interpretation-block">
                                  <h6>🌍 Cultural Context</h6>
                                  <p>{img.analysis.detailedAnalysis.culturalContext}</p>
                                </div>

                                {/* Psychological Interpretation */}
                                <div className="interpretation-block">
                                  <h6>🧠 Psychological Interpretation</h6>
                                  <p>{img.analysis.detailedAnalysis.psychologicalInterpretation}</p>
                                </div>

                                {/* Connection to Waking Life */}
                                <div className="interpretation-block">
                                  <h6>🔗 Connection to Waking Life</h6>
                                  <p>{img.analysis.detailedAnalysis.connectionToWakingLife}</p>
                                </div>

                                {/* Summary & Advice */}
                                <div className="interpretation-block summary-block">
                                  <h6>💡 Summary & Advice</h6>
                                  <p>{img.analysis.detailedAnalysis.summaryAndAdvice}</p>
                                </div>
                              </>
                            ) : (
                              <div className="interpretation-fallback">
                                <p><strong>📖 Your Dream:</strong> {img.dreamText}</p>
                                <p><strong>🧠 Interpretation:</strong> {img.analysis?.interpretation}</p>
                                <p><strong>💭 Emotional Insights:</strong> {img.analysis?.emotionalInsights}</p>
                                {img.analysis?.suggestions && (
                                  <div>
                                    <strong>💡 Suggestions:</strong>
                                    <ul>
                                      {img.analysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="analytics-container">
                {!user ? (
                  <div className="analytics-auth-required">
                    <FaChartLine className="analytics-icon" />
                    <h3>Analytics Available for Logged-in Users</h3>
                    <p>Create an account or log in to track your happiness and stress levels over time.</p>
                    <div className="auth-buttons">
                      <button className="btn btn-primary" onClick={() => window.location.href = '/login'}>
                        Log In
                      </button>
                      <button className="btn btn-secondary" onClick={() => window.location.href = '/signup'}>
                        Sign Up
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3>📊 Your Dream Analytics</h3>
                    <div className="analytics-grid">
                      <div className="analytics-card" style={{ gridColumn: '1 / -1' }}>
                        <h4>📈 Happiness vs Stress Levels (Real-time)</h4>
                        {levelsHistory.length > 0 ? (
                          <div style={{ height: '300px', position: 'relative' }}>
                            <Line 
                              data={chartData} 
                              options={chartOptions}
                            />
                          </div>
                        ) : (
                          <div className="no-data">
                            <p>Start chatting to see your analytics!</p>
                            <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '8px' }}>
                              Share your dreams in the chat to track your emotional patterns
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Image Generation Section with Full Analysis */}
                      {imageBase64 && showImageInAnalytics && fullAnalysisData && (
                        <div className="analytics-card" style={{ gridColumn: '1 / -1' }}>
                          <h4>🎨 Dream Visualization & Complete Analysis</h4>
                          <div className="dream-visualization-section">
                            <div className="visualization-image">
                              <img 
                                src={`data:image/png;base64,${imageBase64}`} 
                                alt="Dream Visualization" 
                                className="dream-image"
                              />
                              <p className="image-caption">AI-generated visual representation based on your dream</p>
                            </div>
                            
                            <div className="visualization-analysis">
                              <div className="analysis-section">
                                <h5>📖 Your Dream</h5>
                                <p className="dream-text-display">{fullAnalysisData.dreamText}</p>
                              </div>

                              <div className="analysis-section">
                                <h5>🧠 Interpretation</h5>
                                <p>{fullAnalysisData.interpretation}</p>
                              </div>

                              {fullAnalysisData.emotionalInsights && (
                                <div className="analysis-section">
                                  <h5>💭 Emotional Insights</h5>
                                  <p>{fullAnalysisData.emotionalInsights}</p>
                                </div>
                              )}

                              {fullAnalysisData.mentalState && (
                                <div className="analysis-section">
                                  <h5>🧘 Mental State Analysis</h5>
                                  <p>{fullAnalysisData.mentalState}</p>
                                </div>
                              )}

                              {fullAnalysisData.symbolism && fullAnalysisData.symbolism.length > 0 && (
                                <div className="analysis-section">
                                  <h5>🔮 Symbolism Detected</h5>
                                  <div className="symbolism-tags">
                                    {fullAnalysisData.symbolism.map((symbol, idx) => (
                                      <span key={idx} className="symbol-tag">{symbol}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {fullAnalysisData.patterns && fullAnalysisData.patterns.length > 0 && (
                                <div className="analysis-section">
                                  <h5>🔍 Patterns Identified</h5>
                                  <div className="pattern-tags">
                                    {fullAnalysisData.patterns.map((pattern, idx) => (
                                      <span key={idx} className="pattern-tag">{pattern}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {fullAnalysisData.suggestions && fullAnalysisData.suggestions.length > 0 && (
                                <div className="analysis-section">
                                  <h5>💡 Personalized Suggestions</h5>
                                  <ul className="suggestions-list">
                                    {fullAnalysisData.suggestions.map((suggestion, idx) => (
                                      <li key={idx}>{suggestion}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="analysis-meta-info">
                                <span className="meta-item">Mood: <strong>{fullAnalysisData.mood}</strong></span>
                                <span className="meta-item">Intensity: <strong>{fullAnalysisData.intensity}/10</strong></span>
                                <span className="meta-item">Confidence: <strong>{fullAnalysisData.confidence}%</strong></span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Summary Stats */}
                      {levelsHistory.length > 0 && (
                        <div className="analytics-card">
                          <h4>😊 Average Happiness</h4>
                          <div className="stat-value">
                            {(levelsHistory.reduce((sum, l) => sum + l.happiness, 0) / levelsHistory.length).toFixed(1)}/10
                          </div>
                        </div>
                      )}
                      
                      {levelsHistory.length > 0 && (
                        <div className="analytics-card">
                          <h4>😰 Average Stress</h4>
                          <div className="stat-value">
                            {(levelsHistory.reduce((sum, l) => sum + l.stress, 0) / levelsHistory.length).toFixed(1)}/10
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Diary Sidebar */}
          <AnimatePresence>
            {showDiary && (
              <motion.div
                className="diary-sidebar"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 350, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="diary-header">
                  <h3>Dream Diary</h3>
                  <div className="diary-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={exportDiary}
                    >
                      <FaDownload />
                    </button>
                  </div>
                </div>
                <div className="diary-entries">
                  {diaryEntries.length === 0 ? (
                    <div className="empty-diary">
                      <FaMoon />
                      <p>No dreams saved yet</p>
                      <p>Share a dream to get started!</p>
                    </div>
                  ) : (
                    diaryEntries.map((entry) => (
                      <motion.div
                        key={entry.id}
                        className="diary-entry"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <div className="entry-header">
                          <span className="entry-date">
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                          <button
                            className="delete-btn"
                            onClick={() => deleteDiaryEntry(entry.id)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                        <div className="entry-content">
                          <p>{entry.content.substring(0, 100)}...</p>
                        </div>
                        <div className="entry-meta">
                          <span className={`mood-badge ${entry.mood}`}>
                            {entry.mood}
                          </span>
                          <span className="intensity-badge">
                            {entry.intensity}/10
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
                {dreamData && (
                  <div className="diary-save">
                    <button
                      className="btn btn-primary"
                      onClick={saveToDiary}
                    >
                      <FaSave />
                      Save to Diary
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;

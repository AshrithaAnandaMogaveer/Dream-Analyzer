import React, { useState, useEffect, useRef } from 'react';
import { Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';
import './AnalyticsPanel.css';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const AnalyticsPanel = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const pieRef = useRef(null);
  const lineRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  // Ensure charts are only rendered on the client after mount
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
      fetchLatestAnalysis();
    }
    
    // Cleanup charts on unmount (destroy refs first, then fallback)
    return () => {
      try {
        if (pieRef.current && typeof pieRef.current.destroy === 'function') {
          pieRef.current.destroy();
        }
      } catch (e) {
        // ignore cleanup errors
      }
      try {
        if (lineRef.current && typeof lineRef.current.destroy === 'function') {
          lineRef.current.destroy();
        }
      } catch (e) {
        // ignore cleanup errors
      }

      // Fallback: destroy any Chart instances attached to canvases still in the DOM
      try {
        if (typeof document !== 'undefined') {
          const canvases = document.querySelectorAll('canvas');
          canvases.forEach((c) => {
            try {
              const ch = ChartJS.getChart(c);
              if (ch && typeof ch.destroy === 'function') ch.destroy();
            } catch (err) {
              // swallow
            }
          });
        }
      } catch (e) {
        // swallow
      }
    };
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/analytics/user/${user._id}/enhanced`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAnalytics(data);
    } catch (error) {
      console.error('Fetch analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestAnalysis = async () => {
    try {
      const { data } = await axios.get(`/api/chatbot/${user._id}/history?limit=1&page=1`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const latest = data?.analyses?.[0];
      if (latest) setLatestAnalysis(latest);
    } catch (error) {
      console.error('Fetch latest analysis error:', error);
    }
  };

  if (loading) {
    return (
      <div className="analytics-panel">
        <div className="panel-header">
          <h3>📊 Analytics</h3>
        </div>
        <LoadingSpinner message="Loading analytics..." size="medium" />
      </div>
    );
  }

  if (!analytics || analytics.totalDreams === 0) {
    return (
      <div className="analytics-panel">
        <div className="panel-header">
          <h3>📊 Analytics</h3>
        </div>
        <div className="empty-state">
          <p>No dream data yet</p>
          <small>Analyze your first dream to see insights!</small>
        </div>
      </div>
    );
  }

  // Emotion Mix Chart Data
  const emotionMixData = {
    labels: Object.keys(analytics.emotionMix || {}),
    datasets: [
      {
        label: 'Emotion Distribution',
        data: Object.values(analytics.emotionMix || {}),
        backgroundColor: [
          '#FFD700', // Joy
          '#DC143C', // Fear
          '#FF8C00', // Anxiety
          '#98FB98', // Calmness
          '#4169E1', // Sadness
          '#FF69B4'  // Excitement
        ],
        borderWidth: 1
      }
    ]
  };

  // Stress/Happiness Trend Data
  const trendData = {
    labels: analytics.stressTrend?.map((_, i) => `Day ${i + 1}`) || [],
    datasets: [
      {
        label: 'Stress Score',
        data: analytics.stressTrend?.map(t => t.value) || [],
        borderColor: '#DC143C',
        backgroundColor: 'rgba(220, 20, 60, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Happiness Score',
        data: analytics.happinessTrend?.map(t => t.value) || [],
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  return (
    <div className="analytics-panel">
      <div className="panel-header">
        <h3>📊 Analytics</h3>
        <span className="dream-count">{analytics.totalDreams} dreams</span>
      </div>

      {/* Emotion Mix */}
      <div className="chart-section">
        <h4>Emotion Mix</h4>
        <div className="chart-container pie-chart">
          {mounted && (
            <Pie 
              ref={pieRef}
              redraw={true}
              key={`pie-${analytics.totalDreams}`}
              data={emotionMixData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { font: { size: 10 } }
                  }
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Mood Over Time */}
      <div className="chart-section">
        <h4>Mood Over Time</h4>
        <div className="chart-container line-chart">
          {mounted && (
            <Line 
              ref={lineRef}
              redraw={true}
              key={`line-${analytics.totalDreams}`}
              data={trendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { font: { size: 10 } }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100
                  }
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Interpretation and Emotion Meters */}
      {latestAnalysis && (
        <div className="interpretation-section">
          <h4>Latest Interpretation</h4>
          <p className="interpretation-text">
            {latestAnalysis.interpretation || latestAnalysis.summary}
          </p>

          {/* Mood Summary */}
          {(() => {
            const happy = (latestAnalysis.emotions?.happiness ?? latestAnalysis.emotions?.happinessPct ?? latestAnalysis.happinessScore ?? 0);
            const stress = (latestAnalysis.emotions?.stress ?? latestAnalysis.emotions?.stressPct ?? latestAnalysis.stressScore ?? 0);
            return (
          <div className="mood-summary">
            <div className="mood-row">
              <span className="mood-label">😊 Happiness</span>
              <span className="mood-value">{happy}</span>
            </div>
            <div className="mood-bar">
              <div className="mood-fill happiness" style={{ width: `${Math.min(100, Math.max(0, happy))}%` }} />
            </div>
            <div className="mood-row">
              <span className="mood-label">😰 Stress</span>
              <span className="mood-value">{stress}</span>
            </div>
            <div className="mood-bar">
              <div className="mood-fill stress" style={{ width: `${Math.min(100, Math.max(0, stress))}%` }} />
            </div>
          </div>
            );
          })()}

          {latestAnalysis.emotions && (
            <div className="emotion-meters">
              {Object.entries(latestAnalysis.emotions).map(([emotion, value]) => (
                <div key={emotion} className="emotion-meter">
                  <div className="emotion-label">
                    <span className={`emotion-dot emotion-${emotion}`}></span>
                    <span className="emotion-name">{emotion}</span>
                    <span className="emotion-value">{Math.round(value * 100)}%</span>
                  </div>
                  <div className="emotion-bar">
                    <div className="emotion-fill" style={{ width: `${Math.min(100, Math.max(0, Math.round(value * 100)))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {latestAnalysis.suggestions && latestAnalysis.suggestions.length > 0 && (
            <div className="suggestions-section">
              <h4>Suggested Remedies</h4>
              <ul>
                {latestAnalysis.suggestions.slice(0, 3).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Dream Visualization section removed as requested */}
        </div>
      )}

      {/* Averages */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">😊</span>
          <div className="stat-value">{analytics.averageHappiness || 0}</div>
          <div className="stat-label">Avg Happiness</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">😰</span>
          <div className="stat-value">{analytics.averageStress || 0}</div>
          <div className="stat-label">Avg Stress</div>
        </div>
      </div>

      {/* Frequent Themes */}
      {analytics.frequentThemes && analytics.frequentThemes.length > 0 && (
        <div className="themes-section">
          <h4>Frequent Dream Themes</h4>
          <div className="themes-list">
            {analytics.frequentThemes.map(theme => (
              <div key={theme.theme} className="theme-tag">
                <span className="theme-name">{theme.theme}</span>
                <span className="theme-count">{theme.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Structured Dream Interpretation */}
      {latestAnalysis && (latestAnalysis.sections || latestAnalysis.interpretationDetails) && (
        <div className="structured-interpretation" style={{ marginTop: 24, backgroundColor: '#f8f9fa', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#2c3e50', borderBottom: '2px solid #e0e6ed', paddingBottom: 10, marginBottom: 20 }}>Dream Interpretation</h3>
          {(() => {
            const s = latestAnalysis?.sections || {};
            const order = [
              { icon: '🌙', title: 'Your Dream', key: 'yourDream' },
              { icon: '🔍', title: 'Introduction', key: 'introduction' },
              { icon: '📜', title: 'Overview', key: 'overview' },
              { icon: '🔑', title: 'Key Symbols & Elements', key: 'keySymbolsAndElements' },
              { icon: '🧠', title: 'Psychological Interpretation', key: 'psychologicalInterpretation' },
              { icon: '🌍', title: 'Cultural Context', key: 'culturalContext' },
              { icon: '🔗', title: 'Connections to Waking Life', key: 'connectionsToWakingLife' },
              { icon: '💡', title: 'Summary & Advice', key: 'summaryAndAdvice' }
            ];
            if (Object.keys(s).length > 0) {
              return (
                <div className="interpretation-container">
                  {order.map(o => s[o.key] && (
                    <div className="dream-section-card" key={o.key} style={{ marginBottom: 16, padding: 16, backgroundColor: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h4 style={{ color: '#3498db', margin: 0, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>{o.icon} {o.title}</h4>
                      {Array.isArray(s[o.key]) ? (
                        <div style={{ lineHeight: 1.6, color: '#34495e' }}>
                          {s[o.key].map((item, idx) => (
                            <div key={idx} style={{ marginBottom: 6 }}>{typeof item === 'string' ? item : `${item.symbol}: ${item.meaning}`}</div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, lineHeight: 1.6, color: '#34495e' }}>{s[o.key]}</p>
                      )}
                    </div>
                  ))}
                  {Array.isArray(latestAnalysis.remedies) && latestAnalysis.remedies.length > 0 && (
                    <div className="dream-section-card" style={{ marginTop: 8, padding: 16, backgroundColor: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h4 style={{ color: '#3498db', margin: 0, marginBottom: 10 }}>🩺 Suggested Remedies</h4>
                      <ul style={{ margin: 0, paddingLeft: 18, color: '#34495e' }}>
                        {latestAnalysis.remedies.slice(0, 5).map((r, i) => (<li key={i}>{r}</li>))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            }
            // Fallback to legacy interpretationDetails if sections missing
            const d = latestAnalysis.interpretationDetails || {};
            const legacy = [
              d.introduction && { icon: '🔍', title: 'Introduction', content: d.introduction },
              d.overview && { icon: '📜', title: 'Overview', content: d.overview },
              Array.isArray(d.keySymbolsAndElements) && d.keySymbolsAndElements.length > 0 && { icon: '🔑', title: 'Key Symbols & Elements', content: d.keySymbolsAndElements },
              d.psychologicalInterpretations && { icon: '🧠', title: 'Psychological Interpretations', content: d.psychologicalInterpretations },
              d.connectionsToWakingLife && { icon: '🔗', title: 'Connections to Waking Life', content: d.connectionsToWakingLife },
              d.summaryAndInsights && { icon: '💡', title: 'Summary & Insights', content: d.summaryAndInsights }
            ].filter(Boolean);
            return (
              <div className="interpretation-container">
                {legacy.map((o, idx) => (
                  <div className="dream-section-card" key={idx} style={{ marginBottom: 16, padding: 16, backgroundColor: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h4 style={{ color: '#3498db', margin: 0, marginBottom: 10 }}>{o.icon} {o.title}</h4>
                    {Array.isArray(o.content) ? (
                      <div style={{ lineHeight: 1.6, color: '#34495e' }}>
                        {o.content.map((item, i) => (<div key={i} style={{ marginBottom: 6 }}>{typeof item === 'string' ? item : `${item.symbol}: ${item.meaning}`}</div>))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, lineHeight: 1.6, color: '#34495e' }}>{o.content}</p>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Dream Image */}
      {latestAnalysis && (latestAnalysis.imageUrl || latestAnalysis.imageDataUrl) && (
        <div className="dream-image" style={{ marginTop: 16 }}>
          <h4>Dream Visual</h4>
          <img
            src={latestAnalysis.imageUrl || latestAnalysis.imageDataUrl}
            alt="Dream visualization"
            crossOrigin="anonymous"
            onError={(e) => {
              if (latestAnalysis.imageDataUrl && e.currentTarget.src !== latestAnalysis.imageDataUrl) {
                e.currentTarget.src = latestAnalysis.imageDataUrl;
                return;
              }
              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM4ODgiPkltYWdlIHVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
            }}
            style={{ maxWidth: '100%', borderRadius: 12 }}
          />
        </div>
      )}
    </div>
  );
};

export default AnalyticsPanel;

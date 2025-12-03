import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { motion } from 'framer-motion';
import './DreamChart.css';

const DreamChart = ({ data, type = 'pie' }) => {
  if (!data) return null;

  const COLORS = {
    sleepQuality: {
      A: '#10b981',
      B: '#22c55e', 
      C: '#f59e0b',
      D: '#f97316',
      F: '#ef4444'
    },
    dreamIntensity: {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444'
    },
    emotions: {
      joy: '#fbbf24',
      fear: '#ef4444',
      anxiety: '#f59e0b',
      calmness: '#8b5cf6',
      sadness: '#3b82f6',
      excitement: '#ec4899'
    }
  };

  const prepareSleepQualityData = () => {
    if (!data.sleepQualityDistribution) return [];
    
    return Object.entries(data.sleepQualityDistribution).map(([grade, count]) => ({
      name: `Grade ${grade}`,
      value: count,
      color: COLORS.sleepQuality[grade]
    }));
  };

  const prepareDreamIntensityData = () => {
    if (!data.dreamIntensityDistribution) return [];
    
    return Object.entries(data.dreamIntensityDistribution).map(([intensity, count]) => ({
      name: intensity.charAt(0).toUpperCase() + intensity.slice(1),
      value: count,
      color: COLORS.dreamIntensity[intensity]
    }));
  };

  const prepareEmotionData = () => {
    if (!data.avgEmotions) return [];
    
    return Object.entries(data.avgEmotions).map(([emotion, value]) => ({
      emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      value: Math.round(value * 100),
      color: COLORS.emotions[emotion]
    }));
  };

  const renderPieChart = () => {
    const chartData = prepareSleepQualityData();
    
    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [`${value} dreams`, 'Count']}
            labelStyle={{ color: '#374151' }}
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderBarChart = () => {
    const chartData = prepareDreamIntensityData();
    
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip 
            formatter={(value) => [`${value} dreams`, 'Count']}
            labelStyle={{ color: '#374151' }}
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderRadarChart = () => {
    const chartData = prepareEmotionData();
    
    return (
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis 
            dataKey="emotion" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
          />
          <Radar
            name="Emotion Intensity"
            dataKey="value"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip 
            formatter={(value) => [`${value}%`, 'Intensity']}
            labelStyle={{ color: '#374151' }}
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  const renderProgressBars = () => {
    if (!data.avgMentalWellness) return null;
    
    return (
      <div className="progress-bars">
        <div className="progress-item">
          <div className="progress-label">
            <span>Mental Wellness</span>
            <span className="progress-value">{Math.round(data.avgMentalWellness)}%</span>
          </div>
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${data.avgMentalWellness}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{
                background: data.avgMentalWellness >= 70 ? '#10b981' : 
                           data.avgMentalWellness >= 50 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return renderBarChart();
      case 'radar':
        return renderRadarChart();
      case 'pie':
      default:
        return renderPieChart();
    }
  };

  return (
    <motion.div
      className="dream-chart"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="chart-header">
        <h4>
          {type === 'pie' && 'Sleep Quality Distribution'}
          {type === 'bar' && 'Dream Intensity'}
          {type === 'radar' && 'Emotion Analysis'}
        </h4>
      </div>
      
      <div className="chart-container">
        {renderChart()}
      </div>
      
      {renderProgressBars()}
      
      {data.avgMentalWellness && (
        <div className="chart-summary">
          <div className="summary-item">
            <span className="summary-label">Average Mental Wellness</span>
            <span className="summary-value" style={{
              color: data.avgMentalWellness >= 70 ? '#10b981' : 
                     data.avgMentalWellness >= 50 ? '#f59e0b' : '#ef4444'
            }}>
              {Math.round(data.avgMentalWellness)}%
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DreamChart;

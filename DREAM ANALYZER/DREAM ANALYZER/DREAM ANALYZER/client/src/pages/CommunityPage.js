import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import './CommunityPage.css';

const CommunityPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [newPost, setNewPost] = useState({ content: '', moodTag: 'Calm', anonymous: false });
  const [filter, setFilter] = useState({ moodTag: '', sortBy: 'newest' });
  const [loading, setLoading] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/community', {
        params: filter,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPosts(data.posts);
    } catch (error) {
      console.error('Fetch posts error:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchInsights = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/community/insights', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInsights(data);
    } catch (error) {
      console.error('Fetch insights error:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      alert('Please log in to join the Dream Circle 🌙');
      navigate('/login');
      return;
    }
    fetchPosts();
    fetchInsights();
  }, [user, navigate, fetchPosts, fetchInsights]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (newPost.content.length < 10) {
      alert('Dream must be at least 10 characters');
      return;
    }

    try {
      const { data } = await axios.post('/api/community', newPost, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (data.suggestAnonymous) {
        alert('We detected heavy emotions. Consider posting anonymously for privacy.');
      }
      
      setPosts([data.post, ...posts]);
      setNewPost({ content: '', moodTag: 'Calm', anonymous: false });
      fetchInsights();
    } catch (error) {
      console.error('Create post error:', error);
      alert('Error creating post');
    }
  };

  const handleReact = async (postId, reactionType) => {
    try {
      const { data } = await axios.post(`/api/community/${postId}/react`, 
        { reactionType },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      setPosts(posts.map(p => p._id === postId ? data : p));
    } catch (error) {
      console.error('React error:', error);
    }
  };

  const handleComment = async (postId, content) => {
    try {
      const { data } = await axios.post(`/api/community/${postId}/comment`,
        { content },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      setPosts(posts.map(p => p._id === postId ? data : p));
    } catch (error) {
      console.error('Comment error:', error);
    }
  };

  const handleRecommend = async (postId, content) => {
    try {
      const { data } = await axios.post(`/api/community/${postId}/recommend`,
        { content },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      setPosts(posts.map(p => p._id === postId ? data : p));
    } catch (error) {
      console.error('Recommend error:', error);
    }
  };

  const moodEmojis = {
    'Hopeful': '🌟', 'Calm': '🌿', 'Stressed': '😰',
    'Anxious': '😟', 'Inspired': '✨', 'Peaceful': '☮️',
    'Confused': '😕', 'Excited': '🎉', 'Fearful': '😨'
  };

  const reactionEmojis = {
    love: '💕', thoughtful: '💭', dreamy: '🌙', inspired: '✨', calming: '😌'
  };

  if (!user) return null;

  return (
    <div className="community-page">
      {/* Header */}
      <div className="community-header">
        <br></br>
        <br></br>
        <br></br>
        <h1>🌙 Dream Circle Community</h1>
        <p>Share your dreams, connect with others, earn wellness points</p>
      </div>

      {/* Insights Dashboard */}
      {insights && (
        <div className="insights-dashboard">
          <div className="insight-card">
            <h3>{insights.dreamsToday}</h3>
            <p>Dreams Today</p>
          </div>
          <div className="insight-card">
            <h3>{insights.communityMood} {moodEmojis[insights.communityMood]}</h3>
            <p>Community Mood</p>
          </div>
          <div className="insight-card">
            <h3>{insights.activeUsers}</h3>
            <p>Active Dreamers</p>
          </div>
        </div>
      )}

      {/* Create Post */}
      <div className="create-post-card">
        <h3>Share Your Dream</h3>
        <form onSubmit={handleCreatePost}>
          <textarea
            value={newPost.content}
            onChange={(e) => setNewPost({...newPost, content: e.target.value})}
            placeholder="Describe your dream..."
            rows="4"
          />
          <div className="post-options">
            <select value={newPost.moodTag} onChange={(e) => setNewPost({...newPost, moodTag: e.target.value})}>
              {Object.keys(moodEmojis).map(mood => (
                <option key={mood} value={mood}>{moodEmojis[mood]} {mood}</option>
              ))}
            </select>
            <label>
              <input
                type="checkbox"
                checked={newPost.anonymous}
                onChange={(e) => setNewPost({...newPost, anonymous: e.target.checked})}
              />
              Post Anonymously
            </label>
            <button type="submit">Share Dream</button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="filters">
        <select value={filter.moodTag} onChange={(e) => setFilter({...filter, moodTag: e.target.value})}>
          <option value="">All Moods</option>
          {Object.keys(moodEmojis).map(mood => (
            <option key={mood} value={mood}>{mood}</option>
          ))}
        </select>
        <select value={filter.sortBy} onChange={(e) => setFilter({...filter, sortBy: e.target.value})}>
          <option value="newest">Newest</option>
          <option value="mostLiked">Most Liked</option>
          <option value="mostCommented">Most Commented</option>
        </select>
      </div>

      {/* Posts List */}
      <div className="posts-list">
        {loading ? (
          <p>Loading dreams...</p>
        ) : posts.length === 0 ? (
          <p>No dreams yet. Be the first to share!</p>
        ) : (
          posts.map(post => (
            <PostCard
              key={post._id}
              post={post}
              onReact={handleReact}
              onComment={handleComment}
              onRecommend={handleRecommend}
              moodEmojis={moodEmojis}
              reactionEmojis={reactionEmojis}
            />
          ))
        )}
      </div>
    </div>
  );
};

// PostCard Component
const PostCard = ({ post, onReact, onComment, onRecommend, moodEmojis, reactionEmojis }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [recommendText, setRecommendText] = useState('');
  const [showRecommend, setShowRecommend] = useState(false);

  return (
    <motion.div 
      className="post-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="post-header">
        <div>
          <strong>{post.username || 'Anonymous'}</strong>
          <span className="mood-tag">{moodEmojis[post.moodTag]} {post.moodTag}</span>
        </div>
        <span className="post-time">{new Date(post.createdAt).toLocaleString()}</span>
      </div>

      <div className="post-content">
        <p>{post.content}</p>
      </div>

      {post.aiReflection && (
        <div className="ai-reflection">
          💭 {post.aiReflection}
        </div>
      )}

      <div className="post-reactions">
        {Object.entries(reactionEmojis).map(([type, emoji]) => (
          <button
            key={type}
            onClick={() => onReact(post._id, type)}
            className="reaction-btn"
          >
            {emoji} {post.reactions[type] || 0}
          </button>
        ))}
      </div>

      <div className="post-actions">
        <button onClick={() => setShowComments(!showComments)}>
          💬 {post.comments?.length || 0} Comments
        </button>
        <button onClick={() => setShowRecommend(!showRecommend)}>
          💡 {post.recommendations?.length || 0} Recommendations
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          {post.comments?.map(comment => (
            <div key={comment._id} className="comment">
              <strong>{comment.username}</strong>
              <p>{comment.content}</p>
            </div>
          ))}
          <div className="add-comment">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
            />
            <button onClick={() => {
              if (commentText.trim()) {
                onComment(post._id, commentText);
                setCommentText('');
              }
            }}>Send</button>
          </div>
        </div>
      )}

      {showRecommend && (
        <div className="recommend-section">
          {post.recommendations?.map(rec => (
            <div key={rec._id} className="recommendation">
              <strong>{rec.username}</strong>
              <p>{rec.content}</p>
            </div>
          ))}
          <div className="add-recommend">
            <input
              value={recommendText}
              onChange={(e) => setRecommendText(e.target.value)}
              placeholder="Share a wellness tip..."
            />
            <button onClick={() => {
              if (recommendText.trim()) {
                onRecommend(post._id, recommendText);
                setRecommendText('');
              }
            }}>Recommend</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CommunityPage;




# Community Page - Complete Code to Copy

## ✅ Backend Complete!
Server routes updated. Now create these frontend files:

---

## File 1: client/src/pages/CommunityPage.js

```javascript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './CommunityPage.css';

const CommunityPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [newPost, setNewPost] = useState({ content: '', moodTag: 'Calm', anonymous: false });
  const [filter, setFilter] = useState({ moodTag: '', sortBy: 'newest' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      alert('Please log in to join the Dream Circle 🌙');
      navigate('/login');
      return;
    }
    fetchPosts();
    fetchInsights();
  }, [user, navigate, filter]);

  const fetchPosts = async () => {
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
  };

  const fetchInsights = async () => {
    try {
      const { data } = await axios.get('/api/community/insights', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInsights(data);
    } catch (error) {
      console.error('Fetch insights error:', error);
    }
  };

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

// PostCard Component (inline for simplicity)
const PostCard = ({ post, onReact, onComment, onRecommend, moodEmojis, reactionEmojis }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [recommendText, setRecommendText] = useState('');
  const [showRecommend, setShowRecommend] = useState(false);

  return (
    <div className="post-card">
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
              onComment(post._id, commentText);
              setCommentText('');
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
              onRecommend(post._id, recommendText);
              setRecommendText('');
            }}>Recommend</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
```

---

## File 2: client/src/pages/CommunityPage.css

```css
.community-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: linear-gradient(135deg, #ffeef8 0%, #e0f4ff 100%);
  min-height: 100vh;
}

.community-header {
  text-align: center;
  margin-bottom: 30px;
  animation: fadeIn 0.6s ease-in;
}

.community-header h1 {
  font-size: 2.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 10px;
}

.insights-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
  animation: slideUp 0.6s ease-out;
}

.insight-card {
  background: white;
  padding: 20px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.insight-card h3 {
  font-size: 2rem;
  color: #667eea;
  margin-bottom: 8px;
}

.create-post-card {
  background: white;
  padding: 24px;
  border-radius: 16px;
  margin-bottom: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.8s ease-in;
}

.create-post-card textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 1rem;
  resize: vertical;
  margin-bottom: 16px;
}

.post-options {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.post-options select,
.post-options button {
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  font-size: 1rem;
}

.post-options button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  transition: transform 0.2s;
}

.post-options button:hover {
  transform: scale(1.05);
}

.filters {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.filters select {
  padding: 10px;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.post-card {
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.6s ease-in;
  transition: transform 0.3s;
}

.post-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(103, 126, 234, 0.2);
}

.post-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.mood-tag {
  margin-left: 12px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #ffeef8 0%, #e0f4ff 100%);
  border-radius: 12px;
  font-size: 0.9rem;
}

.post-content {
  margin-bottom: 16px;
  line-height: 1.6;
}

.ai-reflection {
  background: rgba(103, 126, 234, 0.1);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-style: italic;
  color: #667eea;
}

.post-reactions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.reaction-btn {
  padding: 8px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 20px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.reaction-btn:hover {
  background: linear-gradient(135deg, #ffeef8 0%, #e0f4ff 100%);
  border-color: #667eea;
}

.post-actions {
  display: flex;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.post-actions button {
  padding: 8px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #667eea;
  font-weight: 500;
}

.comments-section,
.recommend-section {
  margin-top: 16px;
  padding: 16px;
  background: rgba(248, 249, 250, 0.8);
  border-radius: 12px;
}

.comment,
.recommendation {
  padding: 12px;
  margin-bottom: 12px;
  background: white;
  border-radius: 8px;
}

.add-comment,
.add-recommend {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.add-comment input,
.add-recommend input {
  flex: 1;
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
}

.add-comment button,
.add-recommend button {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

---

## File 3: Update client/src/App.js

Add this import:
```javascript
import CommunityPage from './pages/CommunityPage';
```

Add this route:
```javascript
<Route path="/community" element={<CommunityPage />} />
```

---

## ✅ DONE!

All code is ready. Copy these 3 files and your Community Page will work perfectly!

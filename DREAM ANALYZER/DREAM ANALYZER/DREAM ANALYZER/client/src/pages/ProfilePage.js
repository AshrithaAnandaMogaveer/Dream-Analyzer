import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import { 
  FaUser, 
  FaEnvelope, 
  FaCalendarAlt, 
  FaVenusMars, 
  FaBriefcase,
  FaCog,
  FaEdit,
  FaSave,
  FaTimes,
  FaChartLine,
  FaMoon,
  FaHeart,
  FaBrain,
  FaTrash,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user, updateProfile, logout } = useAuth();
  const { on, off } = useSocket();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    age: user?.age || '',
    gender: user?.gender || '',
    fieldOfWork: user?.fieldOfWork || ''
  });
  const [activity, setActivity] = useState([]);
  const [showAll, setShowAll] = useState(false);

  const handleEdit = () => {
    setEditData({
      name: user?.name || '',
      age: user?.age || '',
      gender: user?.gender || '',
      fieldOfWork: user?.fieldOfWork || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    await updateProfile(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      name: user?.name || '',
      age: user?.age || '',
      gender: user?.gender || '',
      fieldOfWork: user?.fieldOfWork || ''
    });
    setIsEditing(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const stats = {
    dreamsAnalyzed: 24,
    communityLevel: 'Explorer',
    joinDate: '2024-01-01',
    stressLevel: 6,
    happinessLevel: 8
  };

  // Helper: map activity type to icon/text
  const typeIcon = useMemo(() => ({
    analysis: <FaBrain />,
    image: <FaMoon />,
    input: <FaBrain />,
    comment_post: <FaHeart />,
    comment_like: <FaHeart />,
    feedback: <FaChartLine />,
    dream_saved: <FaMoon />,
    login: <FaUser />,
    signup: <FaUser />
  }), []);

  const formatTime = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch (_) {
      return '';
    }
  };

  // Fetch recent activity once
  useEffect(() => {
    let mounted = true;
    async function fetchActivity() {
      if (!user) return;
      try {
        const { data } = await axios.get('/api/recent-activity', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (mounted && data?.success) setActivity(data.items || []);
      } catch (err) {
        // non-fatal
        // console.error('Recent activity fetch error', err);
      }
    }
    fetchActivity();
    return () => { mounted = false; };
  }, [user]);

  // Live updates via socket
  useEffect(() => {
    if (!user) return;
    const handler = (payload) => {
      if (payload?.item) {
        setActivity((prev) => [payload.item, ...prev].slice(0, 50));
      }
    };
    on('activity', handler);
    return () => {
      off('activity', handler);
    };
  }, [user, on, off]);

  const visibleActivity = showAll ? activity : activity.slice(0, 4);

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <div className="header-content">
            <h1>My Profile</h1>
            <p>Manage your account and view your progress</p>
          </div>
          <div className="header-actions">
            {!isEditing ? (
              <button className="btn btn-secondary" onClick={handleEdit}>
                <FaEdit />
                Edit Profile
              </button>
            ) : (
              <div className="edit-actions">
                <button className="btn btn-primary" onClick={handleSave}>
                  <FaSave />
                  Save
                </button>
                <button className="btn btn-secondary" onClick={handleCancel}>
                  <FaTimes />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="profile-content">
          {/* Profile Info */}
          <div className="profile-info">
            <div className="profile-card">
              <div className="profile-avatar">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user.name} />
                ) : (
                  <FaUser />
                )}
              </div>
              <div className="profile-details">
                {isEditing ? (
                  <div className="edit-form">
                    <div className="form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        name="name"
                        value={editData.name}
                        onChange={handleChange}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Age</label>
                      <input
                        type="number"
                        name="age"
                        value={editData.age}
                        onChange={handleChange}
                        className="form-input"
                        min="13"
                        max="120"
                      />
                    </div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select
                        name="gender"
                        value={editData.gender}
                        onChange={handleChange}
                        className="form-input"
                      >
                        <option value="">Prefer not to say</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-binary</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Field of Work/Study</label>
                      <input
                        type="text"
                        name="fieldOfWork"
                        value={editData.fieldOfWork}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="e.g., Software Engineer, Student"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h2>{user?.name || 'User'}</h2>
                    <div className="profile-meta">
                      <div className="meta-item">
                        <FaEnvelope />
                        <span>{user?.email}</span>
                      </div>
                      {user?.age && (
                        <div className="meta-item">
                          <FaCalendarAlt />
                          <span>{user.age} years old</span>
                        </div>
                      )}
                      {user?.gender && user.gender !== 'prefer-not-to-say' && (
                        <div className="meta-item">
                          <FaVenusMars />
                          <span>{user.gender}</span>
                        </div>
                      )}
                      {user?.fieldOfWork && (
                        <div className="meta-item">
                          <FaBriefcase />
                          <span>{user.fieldOfWork}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="profile-stats">
            <h3>Your Progress</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <FaBrain />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stats.dreamsAnalyzed}</div>
                  <div className="stat-label">Dreams Analyzed</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaHeart />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stats.communityLevel}</div>
                  <div className="stat-label">Community Level</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaMoon />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stats.stressLevel}/10</div>
                  <div className="stat-label">Stress Level</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaChartLine />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stats.happinessLevel}/10</div>
                  <div className="stat-label">Happiness Level</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="recent-activity">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              {activity.length === 0 && (
                <div className="activity-item">
                  <div className="activity-content">
                    <div className="activity-title">No recent activity yet.</div>
                  </div>
                </div>
              )}
              {visibleActivity.map((item) => (
                <div className="activity-item" key={item._id}>
                  <div className="activity-icon">
                    {typeIcon[item.type] || <FaUser />}
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">
                      {item.description || (
                        item.type === 'analysis' ? 'You analyzed a dream' :
                        item.type === 'image' ? 'You generated an image' :
                        item.type === 'input' ? 'You submitted dream text' :
                        item.type === 'comment_like' ? 'You liked a comment' :
                        item.type === 'comment_post' ? 'You posted a comment' :
                        item.type === 'feedback' ? 'You submitted feedback' :
                        item.type === 'dream_saved' ? 'You saved a dream to your diary' :
                        item.type
                      )}
                    </div>
                    <div className="activity-time">{formatTime(item.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
            {activity.length > 4 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAll(!showAll)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {showAll ? 'Show less' : 'Show more'} {showAll ? <FaChevronUp /> : <FaChevronDown />}
                </button>
              </div>
            )}
          </div>

          {/* Account Actions */}
          <div className="account-actions">
            <h3>Account Settings</h3>
            <div className="actions-grid">
              <button className="action-card">
                <FaCog />
                <span>Account Settings</span>
              </button>
              <button className="action-card">
                <FaChartLine />
                <span>Privacy Settings</span>
              </button>
              <button className="action-card">
                <FaMoon />
                <span>Notification Preferences</span>
              </button>
              <button className="action-card danger" onClick={logout}>
                <FaTrash />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;















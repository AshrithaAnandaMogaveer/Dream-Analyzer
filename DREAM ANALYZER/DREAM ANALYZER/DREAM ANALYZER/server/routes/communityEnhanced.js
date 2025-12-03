const express = require('express');
const router = express.Router();
const CommunityPost = require('../models/CommunityPost');
const User = require('../models/User');
const auth = require('../middleware/auth');
const communityController = require('../controllers/communityController');

// Helper: Update user wellness points and badges
async function updateWellnessPoints(userId, points) {
  const user = await User.findById(userId);
  if (!user) return;
  
  user.wellnessPoints = (user.wellnessPoints || 0) + points;
  
  // Badge progression
  const badges = [
    { name: 'Calm Starter', icon: '🌱', min: 0, max: 10 },
    { name: 'Kind Contributor', icon: '🌸', min: 11, max: 30 },
    { name: 'Healing Helper', icon: '🌞', min: 31, max: 60 },
    { name: 'Dream Guardian', icon: '🌈', min: 61, max: Infinity }
  ];
  
  const currentBadge = badges.find(b => user.wellnessPoints >= b.min && user.wellnessPoints <= b.max);
  if (currentBadge && !user.badges.find(b => b.name === currentBadge.name)) {
    user.badges.push({
      name: currentBadge.name,
      icon: currentBadge.icon,
      earnedAt: new Date(),
      description: `Earned at ${user.wellnessPoints} wellness points`
    });
  }
  
  await user.save();
  return user;
}

// Helper: Detect heavy emotional words
function detectHeavyEmotionalWords(text) {
  const heavyWords = ['suicide', 'kill', 'death', 'hopeless', 'worthless', 'hate myself', 'end it all', 'can\'t go on'];
  return heavyWords.some(word => text.toLowerCase().includes(word));
}

// @route   GET /api/community
// @desc    Get all community posts
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { moodTag, sortBy = 'createdAt', page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (moodTag) query.moodTag = moodTag;
    
    const sortOptions = {};
    if (sortBy === 'newest') sortOptions.createdAt = -1;
    else if (sortBy === 'mostLiked') sortOptions['reactions.love'] = -1;
    else if (sortBy === 'mostCommented') sortOptions.comments = -1;
    else sortOptions.createdAt = -1;
    
    const posts = await CommunityPost.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'name wellnessPoints badges')
      .populate('comments.user', 'name')
      .populate('recommendations.user', 'name');
    
    const total = await CommunityPost.countDocuments(query);
    
    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Error fetching posts' });
  }
});

// @route   POST /api/community
// @desc    Create a new post
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { content, moodTag, anonymous } = req.body;
    
    if (!content || content.trim().length < 10) {
      return res.status(400).json({ message: 'Dream content must be at least 10 characters' });
    }
    
    // Detect heavy emotional words
    const suggestAnonymous = detectHeavyEmotionalWords(content);
    
    const user = await User.findById(req.userId);
    
    const post = new CommunityPost({
      user: req.userId,
      username: anonymous ? 'Anonymous' : user.name,
      content,
      moodTag: moodTag || 'Calm',
      anonymous: anonymous || false,
      wellnessPoints: 2,
      aiReflection: `This dream may reflect your ${moodTag?.toLowerCase() || 'calm'} state 💭`
    });
    
    await post.save();
    
    // Award wellness points
    await updateWellnessPoints(req.userId, 2);
    
    const populatedPost = await CommunityPost.findById(post._id)
      .populate('user', 'name wellnessPoints badges');
    
    res.status(201).json({
      post: populatedPost,
      suggestAnonymous
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Error creating post' });
  }
});

// @route   POST /api/community/:id/comment
// @desc    Add comment to post
// @access  Private
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { content, parentCommentId } = req.body;
    
    if (!content || content.trim().length < 1) {
      return res.status(400).json({ message: 'Comment cannot be empty' });
    }
    
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const user = await User.findById(req.userId);
    
    if (parentCommentId) {
      // Reply to comment
      const parentComment = post.comments.id(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
      
      parentComment.replies.push({
        user: req.userId,
        username: user.name,
        content,
        createdAt: new Date()
      });
    } else {
      // New comment
      post.comments.push({
        user: req.userId,
        username: user.name,
        content,
        replies: []
      });
    }
    
    await post.save();
    
    // Award wellness points
    await updateWellnessPoints(req.userId, 1);
    
    const updatedPost = await CommunityPost.findById(post._id)
      .populate('user', 'name wellnessPoints badges')
      .populate('comments.user', 'name');
    
    res.json(updatedPost);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Error adding comment' });
  }
});

// @route   POST /api/community/:id/react
// @desc    Add reaction to post
// @access  Private
router.post('/:id/react', auth, async (req, res) => {
  try {
    const { reactionType } = req.body; // love, thoughtful, dreamy, inspired, calming
    
    const validReactions = ['love', 'thoughtful', 'dreamy', 'inspired', 'calming'];
    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ message: 'Invalid reaction type' });
    }
    
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if user already reacted
    const existingReaction = post.reactedBy.find(r => r.user.toString() === req.userId.toString());
    
    if (existingReaction) {
      // Remove old reaction
      post.reactions[existingReaction.reactionType] = Math.max(0, post.reactions[existingReaction.reactionType] - 1);
      post.reactedBy = post.reactedBy.filter(r => r.user.toString() !== req.userId.toString());
    }
    
    // Add new reaction
    post.reactions[reactionType] = (post.reactions[reactionType] || 0) + 1;
    post.reactedBy.push({ user: req.userId, reactionType });
    
    await post.save();
    
    // Award wellness points for helpful reactions
    if (['thoughtful', 'inspired', 'calming'].includes(reactionType)) {
      await updateWellnessPoints(post.user, 5);
    }
    
    res.json(post);
  } catch (error) {
    console.error('React error:', error);
    res.status(500).json({ message: 'Error adding reaction' });
  }
});

// @route   POST /api/community/:id/recommend
// @desc    Add wellness recommendation
// @access  Private
router.post('/:id/recommend', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim().length < 5) {
      return res.status(400).json({ message: 'Recommendation must be at least 5 characters' });
    }
    
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const user = await User.findById(req.userId);
    
    post.recommendations.push({
      user: req.userId,
      username: user.name,
      content,
      createdAt: new Date()
    });
    
    await post.save();
    
    // Award wellness points
    await updateWellnessPoints(req.userId, 3);
    
    const updatedPost = await CommunityPost.findById(post._id)
      .populate('user', 'name wellnessPoints badges')
      .populate('recommendations.user', 'name');
    
    res.json(updatedPost);
  } catch (error) {
    console.error('Add recommendation error:', error);
    res.status(500).json({ message: 'Error adding recommendation' });
  }
});

// @route   GET /api/community/insights
// @desc    Get community insights
// @access  Private
router.get('/insights', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Total dreams today
    const dreamsToday = await CommunityPost.countDocuments({
      createdAt: { $gte: today }
    });
    
    // Top mood tags
    const moodTags = await CommunityPost.aggregate([
      { $group: { _id: '$moodTag', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Most liked posts
    const mostLiked = await CommunityPost.find()
      .sort({ 'reactions.love': -1 })
      .limit(3)
      .populate('user', 'name');
    
    // Active users count
    const activeUsers = await User.countDocuments({
      wellnessPoints: { $gt: 0 }
    });
    
    // Community mood (most common mood today)
    const communityMood = moodTags[0] ? moodTags[0]._id : 'Calm';
    
    res.json({
      dreamsToday,
      topMoodTags: moodTags,
      mostLikedPosts: mostLiked,
      activeUsers,
      communityMood
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ message: 'Error fetching insights' });
  }
});

// Additional routes for dream visuals
// PUT /api/community/:id/like - Like/unlike a post
router.put('/:id/like', auth, communityController.likePost);

// GET /api/community/user/:userId - Get user's community posts
router.get('/user/:userId', auth, communityController.getUserPosts);

module.exports = router;

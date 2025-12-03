const express = require('express');
const { body, validationResult } = require('express-validator');
const CommunityPost = require('../models/CommunityPost');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// @route   POST /api/community/posts
// @desc    Create a community post
// @access  Private
router.post('/posts', auth, [
  body('type').isIn(['dream-story', 'wellness-recommendation', 'mood-reflection', 'expert-qa', 'general']).withMessage('Invalid post type'),
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('content').trim().isLength({ min: 20, max: 10000 }).withMessage('Content must be 20-10000 characters'),
  body('category').isIn(['dreams', 'mental-health', 'wellness', 'meditation', 'yoga', 'therapy', 'sleep', 'stress', 'happiness', 'other']).withMessage('Invalid category'),
  body('tags').optional().isArray(),
  body('isAnonymous').optional().isBoolean(),
  body('mood').optional().isIn(['happy', 'sad', 'anxious', 'peaceful', 'excited', 'confused', 'grateful', 'hopeful', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      type,
      title,
      content,
      category,
      tags = [],
      isAnonymous = false,
      mood,
      attachments = []
    } = req.body;

    const post = new CommunityPost({
      author: req.userId,
      type,
      title,
      content,
      category,
      tags,
      isAnonymous,
      mood,
      attachments
    });

    await post.save();
    await post.populate('author', 'name profileImage communityLevel');

    res.status(201).json({
      message: 'Post created successfully',
      post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Error creating post' });
  }
});

// @route   GET /api/community/posts
// @desc    Get community posts
// @access  Public
router.get('/posts', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { 'moderation.status': 'approved' };
    
    if (type) query.type = type;
    if (category) query.category = category;
    if (tags) query.tags = { $in: tags.split(',') };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const posts = await CommunityPost.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('author', 'name profileImage communityLevel')
      .populate('expertResponse.expert', 'name profileImage communityLevel');

    const total = await CommunityPost.countDocuments(query);

    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Error fetching posts' });
  }
});

// @route   GET /api/community/posts/:id
// @desc    Get specific post
// @access  Public
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id)
      .populate('author', 'name profileImage communityLevel')
      .populate('expertResponse.expert', 'name profileImage communityLevel')
      .populate('engagement.comments.user', 'name profileImage communityLevel');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Increment view count
    post.engagement.views += 1;
    await post.save();

    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Error fetching post' });
  }
});

// @route   POST /api/community/posts/:id/like
// @desc    Like/unlike a post
// @access  Private
router.post('/posts/:id/like', auth, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existingLike = post.engagement.likes.find(
      like => like.user.toString() === req.userId.toString()
    );

    if (existingLike) {
      // Unlike
      post.engagement.likes = post.engagement.likes.filter(
        like => like.user.toString() !== req.userId.toString()
      );
    } else {
      // Like
      post.engagement.likes.push({ user: req.userId });
    }

    await post.save();

    res.json({
      message: existingLike ? 'Post unliked' : 'Post liked',
      likesCount: post.engagement.likes.length
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Error liking post' });
  }
});

// @route   POST /api/community/posts/:id/comment
// @desc    Add comment to post
// @access  Private
router.post('/posts/:id/comment', auth, [
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be 1-1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = {
      user: req.userId,
      content: req.body.content
    };

    post.engagement.comments.push(comment);
    await post.save();

    await post.populate('engagement.comments.user', 'name profileImage communityLevel');

    const newComment = post.engagement.comments[post.engagement.comments.length - 1];

    res.json({
      message: 'Comment added successfully',
      comment: newComment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Error adding comment' });
  }
});

// @route   GET /api/community/trending
// @desc    Get trending posts
// @access  Public
router.get('/trending', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // Get posts with high engagement in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const trendingPosts = await CommunityPost.find({
      'moderation.status': 'approved',
      createdAt: { $gte: sevenDaysAgo }
    })
    .sort({
      'engagement.likes': -1,
      'engagement.comments': -1,
      'engagement.views': -1
    })
    .limit(parseInt(limit))
    .populate('author', 'name profileImage communityLevel');

    res.json(trendingPosts);
  } catch (error) {
    console.error('Get trending posts error:', error);
    res.status(500).json({ message: 'Error fetching trending posts' });
  }
});

// @route   GET /api/community/categories
// @desc    Get available categories and their post counts
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await CommunityPost.aggregate([
      { $match: { 'moderation.status': 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// @route   GET /api/community/tags
// @desc    Get popular tags
// @access  Public
router.get('/tags', async (req, res) => {
  try {
    const tags = await CommunityPost.aggregate([
      { $match: { 'moderation.status': 'approved' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ message: 'Error fetching tags' });
  }
});

// @route   POST /api/community/posts/:id/expert-response
// @desc    Add expert response to post
// @access  Private (Expert only)
router.post('/posts/:id/expert-response', auth, [
  body('content').trim().isLength({ min: 10, max: 2000 }).withMessage('Response must be 10-2000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.userId);
    if (!user || !['expert', 'mentor'].includes(user.communityLevel)) {
      return res.status(403).json({ message: 'Only experts can respond' });
    }

    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.expertResponse = {
      expert: req.userId,
      content: req.body.content,
      respondedAt: new Date()
    };

    await post.save();
    await post.populate('expertResponse.expert', 'name profileImage communityLevel');

    res.json({
      message: 'Expert response added successfully',
      expertResponse: post.expertResponse
    });
  } catch (error) {
    console.error('Add expert response error:', error);
    res.status(500).json({ message: 'Error adding expert response' });
  }
});

module.exports = router;















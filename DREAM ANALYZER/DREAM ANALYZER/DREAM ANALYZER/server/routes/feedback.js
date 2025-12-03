const express = require('express');
const { body, validationResult } = require('express-validator');
const Feedback = require('../models/Feedback');
const auth = require('../middleware/auth');
const router = express.Router();

// @route   POST /api/feedback
// @desc    Submit feedback
// @access  Private
router.post('/', auth, [
  body('type').isIn(['bug-report', 'feature-request', 'general-feedback', 'complaint', 'compliment']).withMessage('Invalid feedback type'),
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('message').trim().isLength({ min: 10, max: 2000 }).withMessage('Message must be 10-2000 characters'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('category').isIn(['ui-ux', 'functionality', 'performance', 'content', 'community', 'privacy', 'other']).withMessage('Invalid category'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('isPublic').optional().isBoolean(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      type,
      title,
      message,
      rating,
      category,
      priority = 'medium',
      isPublic = true,
      tags = [],
      attachments = []
    } = req.body;

    const feedback = new Feedback({
      user: req.userId,
      type,
      title,
      message,
      rating,
      category,
      priority,
      isPublic,
      tags,
      attachments
    });

    await feedback.save();
    await feedback.populate('user', 'name profileImage communityLevel');

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ message: 'Error submitting feedback' });
  }
});

// @route   GET /api/feedback
// @desc    Get public feedback
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      rating,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { isPublic: true };
    
    if (type) query.type = type;
    if (category) query.category = category;
    if (rating) query.rating = parseInt(rating);

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const feedback = await Feedback.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'name profileImage communityLevel')
      .populate('adminResponse.admin', 'name profileImage');

    const total = await Feedback.countDocuments(query);

    res.json({
      feedback,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ message: 'Error fetching feedback' });
  }
});

// @route   GET /api/feedback/stats
// @desc    Get feedback statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          ratingDistribution: {
            $push: '$rating'
          },
          categoryDistribution: {
            $push: '$category'
          },
          typeDistribution: {
            $push: '$type'
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.json({
        totalFeedback: 0,
        averageRating: 0,
        ratingDistribution: {},
        categoryDistribution: {},
        typeDistribution: {}
      });
    }

    const data = stats[0];
    
    // Calculate rating distribution
    const ratingDist = {};
    data.ratingDistribution.forEach(rating => {
      ratingDist[rating] = (ratingDist[rating] || 0) + 1;
    });

    // Calculate category distribution
    const categoryDist = {};
    data.categoryDistribution.forEach(category => {
      categoryDist[category] = (categoryDist[category] || 0) + 1;
    });

    // Calculate type distribution
    const typeDist = {};
    data.typeDistribution.forEach(type => {
      typeDist[type] = (typeDist[type] || 0) + 1;
    });

    res.json({
      totalFeedback: data.totalFeedback,
      averageRating: Math.round(data.averageRating * 10) / 10,
      ratingDistribution: ratingDist,
      categoryDistribution: categoryDist,
      typeDistribution: typeDist
    });
  } catch (error) {
    console.error('Get feedback stats error:', error);
    res.status(500).json({ message: 'Error fetching feedback statistics' });
  }
});

// @route   POST /api/feedback/:id/upvote
// @desc    Upvote feedback
// @access  Private
router.post('/:id/upvote', auth, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    const existingUpvote = feedback.upvotes.find(
      upvote => upvote.user.toString() === req.userId.toString()
    );

    if (existingUpvote) {
      // Remove upvote
      feedback.upvotes = feedback.upvotes.filter(
        upvote => upvote.user.toString() !== req.userId.toString()
      );
    } else {
      // Add upvote
      feedback.upvotes.push({ user: req.userId });
    }

    await feedback.save();

    res.json({
      message: existingUpvote ? 'Upvote removed' : 'Feedback upvoted',
      upvotesCount: feedback.upvotes.length
    });
  } catch (error) {
    console.error('Upvote feedback error:', error);
    res.status(500).json({ message: 'Error upvoting feedback' });
  }
});

// @route   GET /api/feedback/user/:userId
// @desc    Get user's feedback
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
  try {
    if (req.userId.toString() !== req.params.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { page = 1, limit = 10 } = req.query;

    const feedback = await Feedback.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('adminResponse.admin', 'name profileImage');

    const total = await Feedback.countDocuments({ user: req.params.userId });

    res.json({
      feedback,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get user feedback error:', error);
    res.status(500).json({ message: 'Error fetching user feedback' });
  }
});

// @route   PUT /api/feedback/:id
// @desc    Update feedback (user's own feedback)
// @access  Private
router.put('/:id', auth, [
  body('title').optional().trim().isLength({ min: 5, max: 200 }),
  body('message').optional().trim().isLength({ min: 10, max: 2000 }),
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('isPublic').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const feedback = await Feedback.findOne({ _id: req.params.id, user: req.userId });
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        feedback[key] = updates[key];
      }
    });

    await feedback.save();

    res.json({
      message: 'Feedback updated successfully',
      feedback
    });
  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({ message: 'Error updating feedback' });
  }
});

// @route   DELETE /api/feedback/:id
// @desc    Delete feedback (user's own feedback)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const feedback = await Feedback.findOneAndDelete({ _id: req.params.id, user: req.userId });
    
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({ message: 'Error deleting feedback' });
  }
});

module.exports = router;















const CommunityPost = require('../models/CommunityPost');
const DreamAnalysis = require('../models/DreamAnalysis');
const User = require('../models/User');

// GET /api/community - Fetch all community posts
exports.getAllPosts = async (req, res) => {
  try {
    const { filter = 'recent', limit = 20, page = 1 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let sortOptions = {};
    
    switch (filter) {
      case 'mostLiked':
        sortOptions = { likes: -1, createdAt: -1 };
        break;
      case 'myPosts':
        // Will be handled separately with user filter
        break;
      case 'recent':
      default:
        sortOptions = { createdAt: -1 };
    }
    
    const posts = await CommunityPost.find()
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip)
      .populate('user', 'username')
      .select('-__v');
    
    const total = await CommunityPost.countDocuments();
    
    res.json({
      posts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Fetch posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts', details: error.message });
  }
};

// POST /api/community - Create new post from dream analysis
exports.createPost = async (req, res) => {
  try {
    const { userId, username, analysisId, dreamSummary, imageUrl, interpretation, anonymous } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // If analysisId provided, get data from analysis
    let postData = {
      user: userId,
      username: anonymous ? 'Anonymous' : username,
      content: dreamSummary || 'Shared a dream experience',
      anonymous: anonymous || false
    };
    
    if (analysisId) {
      const analysis = await DreamAnalysis.findById(analysisId);
      if (analysis) {
        postData.dreamSummary = analysis.summary;
        postData.imageUrl = imageUrl || analysis.imageUrl;
        postData.interpretation = interpretation || analysis.interpretation;
        postData.dreamThemes = analysis.themes;
        postData.dreamAnalysisId = analysisId;
        postData.content = analysis.summary;
        
        // Update analysis to mark as shared
        analysis.sharedToCommunity = true;
        await analysis.save();
      }
    } else {
      // Manual post
      postData.dreamSummary = dreamSummary;
      postData.imageUrl = imageUrl;
      postData.interpretation = interpretation;
    }
    
    const post = new CommunityPost(postData);
    await post.save();
    
    // Award wellness points to user
    if (userId && !anonymous) {
      await User.findByIdAndUpdate(userId, {
        $inc: { wellnessPoints: 2 }
      });
    }
    
    res.status(201).json(post);
    
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post', details: error.message });
  }
};

// PUT /api/community/:id/like - Like a post
exports.likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const post = await CommunityPost.findById(id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check if already liked
    const alreadyLiked = post.likedBy.includes(userId);
    
    if (alreadyLiked) {
      // Unlike
      post.likes = Math.max(0, post.likes - 1);
      post.likedBy = post.likedBy.filter(id => id.toString() !== userId.toString());
    } else {
      // Like
      post.likes += 1;
      post.likedBy.push(userId);
    }
    
    await post.save();
    
    res.json({ likes: post.likes, liked: !alreadyLiked });
    
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Failed to like post', details: error.message });
  }
};

// PUT /api/community/:id/comment - Add comment to post
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username, text } = req.body;
    
    if (!userId || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const post = await CommunityPost.findById(id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    post.comments.push({
      user: userId,
      username: username || 'Anonymous',
      content: text,
      createdAt: new Date()
    });
    
    await post.save();
    
    // Award wellness point
    await User.findByIdAndUpdate(userId, {
      $inc: { wellnessPoints: 1 }
    });
    
    res.json(post);
    
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment', details: error.message });
  }
};

// PUT /api/community/:id/recommend - Add wellness recommendation
exports.addRecommendation = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username, content } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const post = await CommunityPost.findById(id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    post.recommendations.push({
      user: userId,
      username: username || 'Anonymous',
      content,
      createdAt: new Date()
    });
    
    await post.save();
    
    // Award wellness points
    await User.findByIdAndUpdate(userId, {
      $inc: { wellnessPoints: 3 }
    });
    
    res.json(post);
    
  } catch (error) {
    console.error('Add recommendation error:', error);
    res.status(500).json({ error: 'Failed to add recommendation', details: error.message });
  }
};

// GET /api/community/user/:userId - Get user's posts
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const posts = await CommunityPost.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-__v');
    
    const total = await CommunityPost.countDocuments({ user: userId });
    
    res.json({
      posts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Fetch user posts error:', error);
    res.status(500).json({ error: 'Failed to fetch user posts', details: error.message });
  }
};

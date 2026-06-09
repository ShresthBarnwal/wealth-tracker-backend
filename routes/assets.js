const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Asset = require('../models/Asset');
const { protect } = require('../middleware/auth');

// @route   GET /api/assets
// @desc    Get all assets for logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const assets = await Asset.find({ user: req.user._id }).sort({ createdAt: -1 });
    
    // Calculate total value
    const totalValue = assets.reduce((sum, asset) => sum + (asset.value * asset.quantity), 0);
    
    res.json({
      assets,
      totalValue,
      count: assets.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/assets/:id
// @desc    Get single asset
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Make sure user owns asset
    if (asset.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    
    res.json(asset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/assets
// @desc    Create new asset
// @access  Private
router.post('/', [
  protect,
  body('name').trim().notEmpty().withMessage('Asset name is required'),
  body('type').isIn(['stocks', 'bonds', 'crypto', 'real-estate', 'cash', 'mutual-funds', 'commodities', 'other']).withMessage('Invalid asset type'),
  body('value').isNumeric().withMessage('Value must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const asset = await Asset.create({
      user: req.user._id,
      ...req.body
    });

    res.status(201).json(asset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/assets/:id
// @desc    Update asset
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Make sure user owns asset
    if (asset.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    
    asset = await Asset.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json(asset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/assets/:id
// @desc    Delete asset
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Make sure user owns asset
    if (asset.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    
    await asset.deleteOne();
    
    res.json({ message: 'Asset removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/assets/stats/summary
// @desc    Get asset statistics by type
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const assets = await Asset.find({ user: req.user._id });
    
    const summary = assets.reduce((acc, asset) => {
      const type = asset.type;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          totalValue: 0
        };
      }
      acc[type].count += 1;
      acc[type].totalValue += asset.value * asset.quantity;
      return acc;
    }, {});
    
    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

// Made with Bob

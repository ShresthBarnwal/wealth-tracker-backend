const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// @route   GET /api/transactions
// @desc    Get all transactions for logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { startDate, endDate, type, limit = 50 } = req.query;
    
    let query = { user: req.user._id };
    
    // Filter by date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Filter by type
    if (type) {
      query.type = type;
    }
    
    const transactions = await Transaction.find(query)
      .populate('asset', 'name type symbol')
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    res.json({
      transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get single transaction
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate('asset');
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Make sure user owns transaction
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    
    res.json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/transactions
// @desc    Create new transaction
// @access  Private
router.post('/', [
  protect,
  body('type').isIn(['buy', 'sell', 'dividend', 'interest', 'deposit', 'withdrawal', 'transfer', 'fee']).withMessage('Invalid transaction type'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('date').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const transaction = await Transaction.create({
      user: req.user._id,
      ...req.body
    });

    const populatedTransaction = await Transaction.findById(transaction._id).populate('asset');

    res.status(201).json(populatedTransaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/transactions/:id
// @desc    Update transaction
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Make sure user owns transaction
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    
    transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('asset');
    
    res.json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete transaction
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Make sure user owns transaction
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    
    await transaction.deleteOne();
    
    res.json({ message: 'Transaction removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/transactions/stats/summary
// @desc    Get transaction statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = { user: req.user._id };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const transactions = await Transaction.find(query);
    
    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      totalInvestment: 0,
      byType: {}
    };
    
    transactions.forEach(transaction => {
      // Sum by category
      if (transaction.category === 'income') {
        summary.totalIncome += transaction.amount;
      } else if (transaction.category === 'expense') {
        summary.totalExpense += transaction.amount;
      } else if (transaction.category === 'investment') {
        summary.totalInvestment += transaction.amount;
      }
      
      // Sum by type
      if (!summary.byType[transaction.type]) {
        summary.byType[transaction.type] = 0;
      }
      summary.byType[transaction.type] += transaction.amount;
    });
    
    summary.netCashFlow = summary.totalIncome - summary.totalExpense;
    
    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

// Made with Bob

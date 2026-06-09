const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// @route   GET /api/dashboard
// @desc    Get dashboard overview data
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get all assets
    const assets = await Asset.find({ user: req.user._id });
    
    // Calculate total portfolio value
    const totalPortfolioValue = assets.reduce((sum, asset) => {
      return sum + (asset.value * asset.quantity);
    }, 0);
    
    // Calculate total invested amount
    const totalInvested = assets.reduce((sum, asset) => {
      if (asset.purchasePrice && asset.quantity) {
        return sum + (asset.purchasePrice * asset.quantity);
      }
      return sum;
    }, 0);
    
    // Calculate total profit/loss
    const totalProfitLoss = totalPortfolioValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 
      ? ((totalProfitLoss / totalInvested) * 100).toFixed(2)
      : 0;
    
    // Get asset allocation by type
    const assetAllocation = assets.reduce((acc, asset) => {
      const type = asset.type;
      const value = asset.value * asset.quantity;
      
      if (!acc[type]) {
        acc[type] = {
          value: 0,
          count: 0,
          percentage: 0
        };
      }
      
      acc[type].value += value;
      acc[type].count += 1;
      
      return acc;
    }, {});
    
    // Calculate percentages
    Object.keys(assetAllocation).forEach(type => {
      assetAllocation[type].percentage = totalPortfolioValue > 0
        ? ((assetAllocation[type].value / totalPortfolioValue) * 100).toFixed(2)
        : 0;
    });
    
    // Get recent transactions (last 10)
    const recentTransactions = await Transaction.find({ user: req.user._id })
      .populate('asset', 'name type symbol')
      .sort({ date: -1 })
      .limit(10);
    
    // Get top performing assets
    const topPerformers = assets
      .filter(asset => asset.purchasePrice && asset.purchasePrice > 0)
      .map(asset => ({
        _id: asset._id,
        name: asset.name,
        type: asset.type,
        symbol: asset.symbol,
        currentValue: asset.value * asset.quantity,
        invested: asset.purchasePrice * asset.quantity,
        profitLoss: (asset.value - asset.purchasePrice) * asset.quantity,
        profitLossPercentage: ((asset.value - asset.purchasePrice) / asset.purchasePrice * 100).toFixed(2)
      }))
      .sort((a, b) => b.profitLossPercentage - a.profitLossPercentage)
      .slice(0, 5);
    
    // Get monthly transaction summary for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyTransactions = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    res.json({
      portfolio: {
        totalValue: totalPortfolioValue.toFixed(2),
        totalInvested: totalInvested.toFixed(2),
        totalProfitLoss: totalProfitLoss.toFixed(2),
        profitLossPercentage: profitLossPercentage,
        assetCount: assets.length
      },
      assetAllocation,
      topPerformers,
      recentTransactions,
      monthlyTransactions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/dashboard/portfolio-history
// @desc    Get portfolio value history
// @access  Private
router.get('/portfolio-history', protect, async (req, res) => {
  try {
    const { period = '1M' } = req.query;
    
    let startDate = new Date();
    
    switch(period) {
      case '1W':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '1M':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1Y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'ALL':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }
    
    // Get transactions in the period
    const transactions = await Transaction.find({
      user: req.user._id,
      date: { $gte: startDate }
    }).sort({ date: 1 });
    
    // Get current assets
    const assets = await Asset.find({ user: req.user._id });
    const currentValue = assets.reduce((sum, asset) => sum + (asset.value * asset.quantity), 0);
    
    res.json({
      period,
      currentValue: currentValue.toFixed(2),
      transactions: transactions.length,
      startDate
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

// Made with Bob

const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide an asset name'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Please provide an asset type'],
    enum: ['stocks', 'bonds', 'crypto', 'real-estate', 'cash', 'mutual-funds', 'commodities', 'other']
  },
  value: {
    type: Number,
    required: [true, 'Please provide asset value'],
    min: 0
  },
  quantity: {
    type: Number,
    default: 1,
    min: 0
  },
  purchasePrice: {
    type: Number,
    min: 0
  },
  purchaseDate: {
    type: Date
  },
  symbol: {
    type: String,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
assetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for calculating profit/loss
assetSchema.virtual('profitLoss').get(function() {
  if (this.purchasePrice && this.quantity) {
    return (this.value - this.purchasePrice) * this.quantity;
  }
  return 0;
});

// Virtual for calculating profit/loss percentage
assetSchema.virtual('profitLossPercentage').get(function() {
  if (this.purchasePrice && this.purchasePrice > 0) {
    return ((this.value - this.purchasePrice) / this.purchasePrice) * 100;
  }
  return 0;
});

module.exports = mongoose.model('Asset', assetSchema);

// Made with Bob

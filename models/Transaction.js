const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  },
  type: {
    type: String,
    required: [true, 'Please provide transaction type'],
    enum: ['buy', 'sell', 'dividend', 'interest', 'deposit', 'withdrawal', 'transfer', 'fee']
  },
  amount: {
    type: Number,
    required: [true, 'Please provide transaction amount'],
    min: 0
  },
  quantity: {
    type: Number,
    min: 0
  },
  price: {
    type: Number,
    min: 0
  },
  date: {
    type: Date,
    required: [true, 'Please provide transaction date'],
    default: Date.now
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['income', 'expense', 'investment', 'savings'],
    default: 'investment'
  },
  currency: {
    type: String,
    default: 'USD'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);

// Made with Bob

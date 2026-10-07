import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Please add a valid amount'],
  },
  category: {
    type: String,
    required: [true, 'Please specify a category'],
    enum: ['Food', 'Utilities', 'Entertainment', 'Rent', 'Salary', 'Other'],
  },
  type: {
    type: String,
    required: [true, 'Please specify transaction type (income or expense)'],
    enum: ['income', 'expense'],
  },
  date: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);

import express from 'express';
import fs from 'fs';
import Expense from '../models/Expense.js';
import { isMongooseConnected, DB_FILE_PATH } from '../config/db.js';

const router = express.Router();

// Helper to read local JSON database
const readLocalDB = () => {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      return [];
    }
    const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading local file db:', err);
    return [];
  }
};

// Helper to write local JSON database
const writeLocalDB = (data) => {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing local file db:', err);
  }
};

// @route   GET /api/expenses
// @desc    Get all transactions
router.get('/', async (req, res) => {
  try {
    if (isMongooseConnected) {
      const expenses = await Expense.find().sort({ date: -1 });
      return res.status(200).json({
        success: true,
        count: expenses.length,
        dbType: 'MongoDB Atlas',
        data: expenses
      });
    } else {
      const expenses = readLocalDB();
      // Sort by date descending
      const sorted = expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
      return res.status(200).json({
        success: true,
        count: sorted.length,
        dbType: 'Local JSON File',
        data: sorted
      });
    }
  } catch (error) {
    console.error('GET expenses error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// @route   POST /api/expenses
// @desc    Add a transaction
router.post('/', async (req, res) => {
  try {
    const { title, amount, category, type, date } = req.body;

    if (!title || amount === undefined || !category || !type) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields: title, amount, category, type'
      });
    }

    const transactionData = {
      title: title.trim(),
      amount: Number(amount),
      category,
      type,
      date: date ? new Date(date) : new Date()
    };

    if (isMongooseConnected) {
      const newExpense = await Expense.create(transactionData);
      return res.status(201).json({
        success: true,
        dbType: 'MongoDB Atlas',
        data: newExpense
      });
    } else {
      const expenses = readLocalDB();
      const newExpense = {
        _id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        ...transactionData
      };
      expenses.push(newExpense);
      writeLocalDB(expenses);
      return res.status(201).json({
        success: true,
        dbType: 'Local JSON File',
        data: newExpense
      });
    }
  } catch (error) {
    console.error('POST expense error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete a transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongooseConnected) {
      const expense = await Expense.findById(id);
      if (!expense) {
        return res.status(404).json({
          success: false,
          error: 'No transaction found with this ID'
        });
      }
      await expense.deleteOne();
      return res.status(200).json({
        success: true,
        dbType: 'MongoDB Atlas',
        data: {}
      });
    } else {
      const expenses = readLocalDB();
      const exists = expenses.some(exp => exp._id === id);
      if (!exists) {
        return res.status(404).json({
          success: false,
          error: 'No transaction found with this ID'
        });
      }
      const filtered = expenses.filter(exp => exp._id !== id);
      writeLocalDB(filtered);
      return res.status(200).json({
        success: true,
        dbType: 'Local JSON File',
        data: {}
      });
    }
  } catch (error) {
    console.error('DELETE expense error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

export default router;

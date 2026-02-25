import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(authenticateUser);


// ✅ Create Expense
router.post('/', async (req, res) => {
  try {
    const { project_id, title, amount, category } = req.body;

    if (!project_id || !title || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Project ID, Title and Amount are required'
      });
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert([
        {
          project_id,
          title,
          amount,
          category
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(201).json({
      success: true,
      data
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// ✅ Get Expenses for a Project
router.get('/:project_id', async (req, res) => {
  try {
    const { project_id } = req.params;

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.json({
      success: true,
      data
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// ✅ Delete Expense
router.delete('/:expense_id', async (req, res) => {
  try {
    const { expense_id } = req.params;

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expense_id);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


export default router;
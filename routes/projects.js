import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(authenticateUser);


// ✅ Create Project
router.post('/', async (req, res) => {
  try {
    const { title, description, deadline, budget } = req.body;

    if (!title || !budget) {
      return res.status(400).json({
        success: false,
        message: 'Title and Budget are required'
      });
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          title,
          description,
          deadline,
          budget,
          user_id: req.user.id
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


// ✅ Get All Projects of Logged-in User
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', req.user.id)
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


// ✅ Get Single Project
router.get('/:project_id', async (req, res) => {
  try {
    const { project_id } = req.params;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({
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


// 🔥 Project Summary (High Impact Feature)
router.get('/:project_id/summary', async (req, res) => {
  try {
    const { project_id } = req.params;

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('budget')
      .eq('id', project_id)
      .eq('user_id', req.user.id)
      .single();

    if (projectError) {
      return res.status(404).json({
        success: false,
        message: projectError.message
      });
    }

    // Get expenses
    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('project_id', project_id);

    if (expenseError) {
      return res.status(400).json({
        success: false,
        message: expenseError.message
      });
    }

    // Get tasks
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('status')
      .eq('project_id', project_id);

    if (taskError) {
      return res.status(400).json({
        success: false,
        message: taskError.message
      });
    }

    const totalSpent = expenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (t) => t.status === 'completed'
    ).length;

    const completionPercentage =
      totalTasks === 0
        ? 0
        : Math.round((completedTasks / totalTasks) * 100);

    return res.json({
      success: true,
      data: {
        totalBudget: Number(project.budget),
        totalSpent,
        remaining: Number(project.budget) - totalSpent,
        totalTasks,
        completedTasks,
        completionPercentage
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


export default router;
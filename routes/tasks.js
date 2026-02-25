import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(authenticateUser);


// ✅ Create Task
router.post('/', async (req, res) => {
  try {
    const { project_id, title, priority, due_date } = req.body;

    if (!project_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and Title are required'
      });
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          project_id,
          title,
          priority,
          due_date
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


// ✅ Get Tasks for a Project
router.get('/:project_id', async (req, res) => {
  try {
    const { project_id } = req.params;

    const { data, error } = await supabase
      .from('tasks')
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


// 🔥 Update Task Status (Important for Summary)
router.put('/:task_id/status', async (req, res) => {
  try {
    const { task_id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', task_id)
      .select()
      .single();

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


// ✅ Delete Task
router.delete('/:task_id', async (req, res) => {
  try {
    const { task_id } = req.params;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task_id);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


export default router;
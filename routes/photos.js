import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(authenticateUser);


// ✅ Add Photo (URL based for now)
router.post('/', async (req, res) => {
  try {
    const { project_id, image_url, description } = req.body;

    if (!project_id || !image_url) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and Image URL are required'
      });
    }

    const { data, error } = await supabase
      .from('photos')
      .insert([
        {
          project_id,
          image_url,
          description
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


// ✅ Get Photos for a Project
router.get('/:project_id', async (req, res) => {
  try {
    const { project_id } = req.params;

    const { data, error } = await supabase
      .from('photos')
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


// ✅ Delete Photo
router.delete('/:photo_id', async (req, res) => {
  try {
    const { photo_id } = req.params;

    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', photo_id);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.json({
      success: true,
      message: 'Photo deleted successfully'
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


export default router;